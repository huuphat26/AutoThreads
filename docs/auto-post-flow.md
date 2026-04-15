# AutoThreads — Luồng Đăng Bài Tự Động 3 Nền Tảng

> File mô tả chính xác cơ chế hoạt động thực tế của hệ thống tự động đăng bài lên **Facebook**, **Threads** và **Instagram** theo lịch cố định mỗi ngày.

---

## Tổng quan kiến trúc

```
[Next.js Server Start]
        │
        ▼
instrumentation.ts  ──→  startAutoScheduler()
                                │
                    ┌───────────┴───────────┐
                    ▼                       ▼
          Cron: 11:50 / 17:50       Cron: 12:00 / 18:00
          (CHUẨN BỊ)                (ĐĂNG BÀI)
```

---

## Điều kiện bật scheduler

File `.env` phải có:

```env
AUTO_SCHEDULER_ENABLED=true
TIMEZONE=Asia/Ho_Chi_Minh
```

Nếu `AUTO_SCHEDULER_ENABLED != true` → scheduler tự tắt, không có cron nào chạy.

---

## 2 Slot đăng bài mỗi ngày

| Slot | Chuẩn bị AI | Giờ đăng |
|------|------------|----------|
| `noon` | 11:50 | 12:00 → 12:03 → 12:06 |
| `evening` | 17:50 | 18:00 → 18:03 → 18:06 |

---

## Luồng chi tiết — Slot `noon` (18:00 tương tự)

### Phase 1 — Chuẩn bị nội dung (11:50)

```
11:50 — Cron kích hoạt startWaitingForAI("noon")
         │
         ▼
    Tạo AutoPostRecord {
      id:             "auto-<timestamp>-<random>"
      slot:           "noon"
      overallStatus:  "waiting_for_ai"
      facebook:       { status: "pending" }
      threads:        { status: "pending" }
      instagram:      { status: "pending" }
    }
         │
         ▼
    Lưu vào data/auto-post-history.json
         │
         ▼
    Browser (dashboard) phát hiện record "waiting_for_ai"
         │
         ├─→ Gọi /api/puter-prompt { platform: "facebook" }
         │       └─→ AI (Puter.js) soạn nội dung Facebook (550-850 ký tự)
         │
         ├─→ Gọi /api/puter-prompt { platform: "threads", topic: <same_topicId> }
         │       └─→ AI soạn nội dung Threads (≤480 ký tự)
         │
         ├─→ Gọi /api/puter-prompt { platform: "instagram", fbContent: <...> }
         │       └─→ AI soạn IG caption từ bài FB
         │
         ▼
    PUT /api/auto-scheduler
    { recordId, fbContent, threadsContent, igCaption, topicLabel }
         │
         ▼
    storeContentForRecord() — cập nhật record:
      overallStatus: "content_ready"
      content:       <fbContent>
      threadsContent:<threadsContent>
      igCaption:     <igCaption>
         │
         ▼
    Lưu lại data/auto-post-history.json — chờ đến 12:00
```

> **Fallback:** Nếu browser submit nội dung **sau** 12:00 → `storeContentForRecord()` tự detect và chạy `executePlatformPosts()` ngay lập tức, không chờ cron.

---

### Phase 2 — Đăng bài (12:00 → 12:03 → 12:06)

```
12:00 — Cron kích hoạt executeReadyPosts("noon")
         │
         ▼
    Tìm tất cả record có overallStatus = "content_ready"
         │
         ▼
    executePlatformPosts(recordId)
         │
    overallStatus → "running"
         │
         │
         ├──────────────────────────────────────────────────────┐
         │                                                      │
         ▼  12:00 — [1/3] Facebook                             │
    postWithRetry(fn, "Facebook", deadline=12:03)              │
         │                                                      │
         ├─ Thành công                                         │
         │   facebookService.publishText(fbContent)            │
         │   record.facebook = { status:"posted", postId, ... }│
         │   Lưu vào data/fb-post-history.json                 │
         │                                                      │
         └─ Thất bại → retry mỗi 30 giây trong 3 phút         │
                        Hết 3 phút → status:"failed"          │
         │                                                      │
         ▼  Chờ đủ 3 phút kể từ 12:00                         │
         │                                                      │
         ▼  12:03 — [2/3] Threads                              │
    postWithRetry(fn, "Threads", deadline=12:06)               │
         │                                                      │
         ├─ Thành công                                         │
         │   threadsService.publishTextPost(                   │
         │     threadsContent.slice(0,480)                     │
         │   )                                                  │
         │   record.threads = { status:"posted", postId, ... } │
         │                                                      │
         └─ Thất bại → retry mỗi 30s / hết 3 phút → failed   │
         │                                                      │
         ▼  Chờ đủ 3 phút kể từ 12:03                         │
         │                                                      │
         ▼  12:06 — [3/3] Instagram                            │
    getNextIGImage()  ←── data/ig-auto-images.json             │
         │                                                      │
         ├─ Không có ảnh → instagram.status = "failed"         │
         │                                                      │
         └─ Có ảnh:                                            │
    postWithRetry(fn, "Instagram", deadline=12:09)             │
         │                                                      │
         ├─ Thành công                                         │
         │   instagramService.publish({                        │
         │     caption: igCaption,                             │
         │     mediaType: "IMAGE",                             │
         │     imageUrl: igImage.url                           │
         │   })                                                 │
         │   record.instagram = { status:"posted", ... }       │
         │   Lưu vào data/ig-post-history.json                 │
         │                                                      │
         └─ Thất bại → retry mỗi 30s / hết 3 phút → failed   │
         │                                                      │
         └──────────────────────────────────────────────────────┘
         │
         ▼
    Tính overallStatus cuối cùng:
      Tất cả "posted"  → "completed"
      Tất cả "failed"  → "failed"
      Hỗn hợp          → "partial"
         │
         ▼
    Lưu kết quả cuối vào data/auto-post-history.json
```

---

## Cơ chế retry từng nền tảng

```
postWithRetry(fn, platform)
│
├─ attempt 1 → thành công → return ✅
│
├─ attempt 1 → thất bại
│   └─ còn < 3 phút → sleep(30s) → attempt 2
│
├─ attempt 2 → thất bại
│   └─ còn < 3 phút → sleep(30s) → attempt 3
│
│ ... tiếp tục mỗi 30 giây ...
│
└─ Hết 3 phút → throw Error → platform.status = "failed"
                               tiếp tục nền tảng kế tiếp ✅
```

**Mỗi nền tảng hoàn toàn độc lập** — Facebook fail không chặn Threads và Instagram.

---

## Trạng thái vòng đời một AutoPostRecord

```
waiting_for_ai   ←── Cron 11:50 tạo record, chờ browser soạn
       │
       ▼
content_ready    ←── Browser PUT nội dung xong, chờ đến 12:00
       │
       ▼
running          ←── Cron 12:00 đang đăng lần lượt 3 nền tảng
       │
       ├──→ completed   (cả 3 nền tảng posted)
       ├──→ partial     (1-2 nền tảng posted, còn lại failed)
       └──→ failed      (cả 3 nền tảng failed)
```

---

## Các file liên quan

| File | Vai trò |
|------|---------|
| `instrumentation.ts` | Khởi động scheduler khi Next.js server start |
| `lib/services/auto-scheduler.ts` | Toàn bộ logic cron, retry, posting |
| `lib/auto-post-store.ts` | Đọc/ghi `data/auto-post-history.json` |
| `lib/services/facebook.service.ts` | Facebook Graph API wrapper |
| `lib/services/threads.service.ts` | Threads API wrapper |
| `lib/services/instagram.service.ts` | Instagram Graph API wrapper (có retry riêng cho Meta error 2) |
| `lib/ig-image-pool.ts` | Quản lý pool ảnh IG từ `data/ig-auto-images.json` |
| `lib/services/fb-store.ts` | Lưu lịch sử bài Facebook |
| `lib/services/ig-store.ts` | Lưu lịch sử bài Instagram |
| `app/api/auto-scheduler/route.ts` | REST API: GET status / PUT nội dung AI / POST trigger |
| `app/api/puter-prompt/route.ts` | Xây system+user prompt cho từng nền tảng |
| `data/auto-post-history.json` | Lưu trữ tất cả lịch sử auto-post record |
| `data/ig-auto-images.json` | Pool URL ảnh dùng cho Instagram |

---

## API endpoints liên quan

### `GET /api/auto-scheduler`
Trả về trạng thái scheduler và cấu hình.

### `GET /api/auto-scheduler?view=history&today=true`
Trả về danh sách record trong ngày hôm nay.

### `PUT /api/auto-scheduler`
Browser gọi sau khi AI soạn xong nội dung:
```json
{
  "recordId": "auto-xxx",
  "fbContent": "...",
  "threadsContent": "...",
  "igCaption": "...",
  "topicLabel": "Thanh lọc & Cơ thể"
}
```

### `POST /api/auto-scheduler`
Trigger thủ công (dùng để test):
```json
{ "action": "trigger", "slot": "noon" }
```

---

## Trigger thủ công từ UI

Dashboard có nút **"Chạy thủ công"** → gọi `POST /api/auto-scheduler { action:"trigger" }` → tạo record `waiting_for_ai` → browser tự động detect và bắt đầu soạn AI ngay.

---

## Sơ đồ thời gian hoàn chỉnh (slot noon)

```
11:50:00  Cron CHUẨN BỊ → tạo record "waiting_for_ai"
11:50–11:58  Browser soạn FB → Threads → IG qua Puter.js AI
~11:58     Browser PUT nội dung → record "content_ready"

12:00:00  Cron ĐĂNG → đăng Facebook (retry window 3 phút)
12:00–12:02  Facebook posted ✅  (hoặc retry đến 12:03)
12:03:00  Đăng Threads (retry window 3 phút)
12:03–12:05  Threads posted ✅   (hoặc retry đến 12:06)
12:06:00  Đăng Instagram (retry window 3 phút)
12:06–12:08  Instagram posted ✅ (hoặc retry đến 12:09)

~12:09    Ghi overallStatus: "completed" / "partial" / "failed"
```

---

## Lưu ý quan trọng

- **Ảnh Instagram bắt buộc** — nếu `data/ig-auto-images.json` rỗng, IG sẽ fail ngay mà không retry.
- **Browser phải mở** trong khoảng 11:50–11:59 để soạn AI. Nếu browser đóng → record kẹt ở `waiting_for_ai` → cron 12:00 bỏ qua (không có gì để đăng).
- **Nội dung Threads** tự động giới hạn 480 ký tự ngay trước khi gọi API.
- **Facebook fail** không ảnh hưởng đến Threads và Instagram — mỗi platform retry độc lập.
- Instagram service có thêm lớp retry riêng cho **Meta error code 2** (transient error) với backoff 5s → 10s → 20s trước khi rơi vào `postWithRetry` của scheduler.
