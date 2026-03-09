# OpenCode + Next.js: Hướng dẫn cài đặt và cấu hình từ đầu đến hoàn chỉnh

Tài liệu này dành cho dự án **Next.js** và đi theo flow thực tế:

1. Cài OpenCode
2. Kết nối model provider
3. Chạy lần đầu trong repo Next.js
4. Tạo `AGENTS.md`
5. Tạo `opencode.jsonc`
6. Thêm skills và commands
7. Thiết lập workflow dùng hằng ngày
8. Cấu hình mẫu hoàn chỉnh cho Next.js

---

## 1) Chuẩn bị môi trường

### Với Next.js
Khuyến nghị dùng dự án **TypeScript + App Router**. Nếu tạo mới, bạn có thể dùng mặc định của `create-next-app`; mặc định hiện bao gồm **TypeScript, ESLint, Tailwind CSS, App Router, Turbopack** và alias `@/*`.

Ví dụ tạo mới:

```bash
pnpm create next-app@latest my-app --yes
cd my-app
pnpm dev
```

### Nếu bạn đã có repo Next.js sẵn
Chỉ cần bảo đảm repo chạy được bình thường trước khi đưa OpenCode vào.

Ví dụ:

```bash
pnpm install
pnpm dev
```

---

## 2) Cài OpenCode

### Cách nhanh nhất

```bash
curl -fsSL https://opencode.ai/install | bash
```

### Hoặc cài qua package manager

```bash
npm install -g opencode-ai
# hoặc
pnpm add -g opencode-ai
# hoặc
yarn global add opencode-ai
# hoặc
bun install -g opencode-ai
```

### Trên macOS/Linux với Homebrew

```bash
brew install anomalyco/tap/opencode
```

### Kiểm tra cài đặt

```bash
opencode --help
```

---

## 3) Chọn nơi chạy OpenCode

### Cách dùng phổ biến nhất
Vào đúng thư mục repo rồi chạy:

```bash
cd /path/to/your-nextjs-project
opencode
```

### Nếu bạn dùng VS Code / Cursor / Windsurf
Mở **integrated terminal** của IDE rồi chạy `opencode`. OpenCode có thể tự cài extension khi chạy trong terminal tích hợp.

---

## 4) Kết nối provider / model

OpenCode không khóa vào một hãng model. Bạn có thể dùng nhiều provider khác nhau.

### Cách dễ nhất cho người mới
Trong TUI của OpenCode, chạy:

```text
/connect
```

Có 2 lựa chọn khá dễ bắt đầu:
- **OpenCode Zen**: danh sách model đã được team OpenCode test và xác minh hoạt động tốt.
- **OpenCode Go**: gói chi phí thấp của OpenCode cho các model coding phổ biến.

Sau đó chạy:

```text
/models
```

để xem các model khả dụng.

### Hoặc login provider bằng CLI

```bash
opencode auth login
```

Kiểm tra provider đã đăng nhập:

```bash
opencode auth list
```

Xem model khả dụng:

```bash
opencode models --refresh
```

---

## 5) Chạy OpenCode lần đầu trong repo Next.js

Từ root repo:

```bash
opencode
```

Trong giao diện TUI:

1. Dùng `/connect` nếu chưa kết nối provider
2. Dùng `/models` để chọn model
3. Dùng `/init` để tạo `AGENTS.md`

Lệnh `/init` sẽ quét repo và tạo file `AGENTS.md` để OpenCode hiểu project tốt hơn.

---

## 6) Tạo và chỉnh `AGENTS.md` cho Next.js

> Mục tiêu của file này: dạy agent hiểu đúng **kiến trúc**, **quy ước**, **ranh giới sửa code**, **lệnh kiểm tra bắt buộc**.

### Vị trí
Tạo ở root repo:

```text
AGENTS.md
```

### Mẫu khuyên dùng cho Next.js

```md
# Project Overview

This is a Next.js application using TypeScript and App Router.

## Main stack
- Next.js
- React
- TypeScript
- ESLint
- Tailwind CSS

## Project structure
- `app/`: routes, layouts, pages, route handlers
- `components/`: reusable UI components
- `lib/`: utilities, API clients, shared helpers
- `hooks/`: custom React hooks
- `public/`: static assets
- `styles/`: global styling if present
- `tests/`: unit/integration/e2e tests if present

## Working rules
- Prefer Server Components by default.
- Use Client Components only when browser-only APIs, stateful UI, or event handlers are required.
- Keep business logic out of page files when possible.
- Reuse shared UI from `components/` before creating new components.
- Reuse helpers from `lib/` before creating new utilities.
- Do not introduce new dependencies unless necessary.
- Do not refactor unrelated files.
- Keep changes scoped to the request.

## Routing rules
- Follow App Router conventions in `app/`.
- Keep route segments and layout hierarchy clear.
- For APIs, prefer Route Handlers under `app/api/.../route.ts`.

## Environment rules
- Keep `.env*` files at the project root.
- Never hardcode secrets.
- Client-exposed env vars must use `NEXT_PUBLIC_`.

## Code style
- Prefer strict TypeScript-friendly code.
- Prefer small reusable components.
- Avoid `any` unless unavoidable.
- Keep functions focused and predictable.
- Name files consistently with existing repo conventions.

## Validation before finishing
Run these commands when relevant:
- `pnpm lint`
- `pnpm type-check`
- `pnpm test`
- `pnpm build`

If a script does not exist, inspect `package.json` and use the closest equivalent.

## Output expectations
When making changes:
1. explain what will be changed
2. implement minimal safe changes
3. run relevant validation
4. summarize changed files and any follow-up work
```

---

## 7) Tạo `opencode.jsonc` ở root project

> Đây là file cấu hình project-level. Nó có độ ưu tiên cao và có thể commit vào Git.

Tạo file:

```text
opencode.jsonc
```

### Mẫu cấu hình thực tế cho Next.js

```jsonc
{
  "$schema": "https://opencode.ai/config.json",

  // Model mặc định cho tác vụ chính
  "model": "openai/gpt-5.3-codex",

  // Model nhẹ cho tác vụ phụ / nhanh
  "small_model": "anthropic/claude-sonnet-4-5",

  // Chỉ dẫn thêm ở mức project
  "instructions": "Read AGENTS.md first. For Next.js code, prefer App Router conventions, preserve SSR/client boundaries, avoid unnecessary client components, and validate with lint/build before finishing.",

  // Permission toàn cục
  "permission": {
    "bash": {
      "*": "ask",
      "pwd": "allow",
      "ls *": "allow",
      "find *": "allow",
      "cat *": "allow",
      "grep *": "allow",
      "rg *": "allow",
      "git status*": "allow",
      "git diff*": "allow",
      "pnpm lint": "allow",
      "pnpm test": "allow",
      "pnpm build": "ask",
      "npm run lint": "allow",
      "npm run test": "allow",
      "npm run build": "ask"
    }
  },

  // Agent cấu hình theo use case
  "agent": {
    "build": {
      "description": "Full access agent for implementing scoped changes in the Next.js repo.",
      "model": "openai/gpt-5.3-codex",
      "permission": {
        "bash": {
          "*": "ask",
          "pnpm lint": "allow",
          "pnpm test": "allow",
          "pnpm build": "ask",
          "npm run lint": "allow",
          "npm run test": "allow",
          "npm run build": "ask"
        }
      }
    },
    "plan": {
      "description": "Planning and analysis agent. Should not modify source code unless explicitly approved.",
      "model": "anthropic/claude-opus-4-1",
      "permission": {
        "bash": "ask",
        "edit": "ask",
        "write": "ask",
        "patch": "ask"
      }
    }
  },

  // Ví dụ custom command
  "command": {
    "next-audit": {
      "description": "Audit the current Next.js route or feature before making changes",
      "agent": "plan",
      "template": "Inspect the current feature in this Next.js repository. Explain route structure, server/client boundaries, data flow, shared components, env usage, and risks before making any edits."
    }
  }
}
```

### Gợi ý model
Bạn có thể thay `model` và `small_model` theo provider bạn đang dùng thực tế. Trước khi chốt, dùng:

```bash
opencode models --refresh
```

rồi copy đúng tên model mà OpenCode đang nhận diện.

---

## 8) Thêm skills cho các việc lặp đi lặp lại

OpenCode hỗ trợ skills theo file `SKILL.md`.

### Vị trí project-level

```text
.opencode/skills/<skill-name>/SKILL.md
```

### Ví dụ skill cho Next.js: `audit-route`

Tạo thư mục:

```text
.opencode/skills/audit-route/SKILL.md
```

Nội dung:

```md
---
name: audit-route
description: Analyze a Next.js route before editing it. Use for route-level changes, App Router debugging, or when modifying page/layout/loading/error/route files.
---

# Goal
Understand a route completely before making changes.

# Steps
1. Locate the route in `app/`.
2. Identify `layout.tsx`, `page.tsx`, `loading.tsx`, `error.tsx`, and related nested segments.
3. Determine which files are Server Components and which are Client Components.
4. Identify data fetching boundaries and environment variable usage.
5. Check reused UI from `components/` and helpers from `lib/`.
6. Summarize risks before editing.

# Output
- Route tree
- Server/client boundary summary
- Shared dependency map
- Risks and safe edit plan
```

### Ví dụ skill thứ hai: `add-route-handler`

```text
.opencode/skills/add-route-handler/SKILL.md
```

```md
---
name: add-route-handler
description: Add or update a Next.js Route Handler under app/api with minimal safe changes.
---

# Goal
Create or update a Route Handler using App Router conventions.

# Steps
1. Inspect existing `app/api` patterns.
2. Reuse existing response helpers, validation utilities, and auth checks.
3. Keep request parsing and response handling consistent with the repo.
4. Avoid duplicating shared logic that belongs in `lib/`.
5. Run lint and relevant tests after changes.

# Output
- Files added/updated
- Request/response contract summary
- Validation performed
```

---

## 9) Thêm custom commands để dùng nhanh

Bạn có thể tạo command bằng file markdown trong:

```text
.opencode/commands/
```

### Ví dụ command `review-route`

Tạo file:

```text
.opencode/commands/review-route.md
```

```md
---
description: Review the current Next.js route before implementation
agent: plan
model: anthropic/claude-opus-4-1
---

Inspect the current route or feature.
Summarize route structure, data flow, server/client boundaries, env usage, reused components, and implementation risks.
Do not edit files.
```

Sau đó gọi trong TUI:

```text
/review-route
```

---

## 10) Thiết lập workflow dùng hằng ngày cho Next.js

### Flow an toàn tôi khuyên dùng

#### Bước 1: phân tích trước
Trong TUI, chuyển sang agent `plan` và yêu cầu:

```text
Audit the auth dashboard route and explain the route tree, data flow, and server/client boundaries before changing anything.
```

#### Bước 2: chuyển sang build để sửa code

```text
Implement the smallest safe change to add search params support to this page. Reuse existing utilities and avoid introducing client components unless necessary.
```

#### Bước 3: bắt agent tự kiểm tra

```text
Run lint and build if relevant, then summarize the changed files and remaining risks.
```

---

## 11) Cấu hình repo Next.js nên có thêm gì

Ngoài OpenCode, nên có các file sau để agent hiểu repo tốt hơn:

```text
README.md
AGENTS.md
docs/architecture.md
docs/domain-rules.md
.env.example
```

### `.env.example`
Tạo file ví dụ để agent biết biến môi trường nào là bắt buộc:

```env
NEXT_PUBLIC_APP_URL=http://localhost:3000
API_BASE_URL=http://localhost:4000
AUTH_SECRET=
```

### `package.json`
Nên có script rõ ràng để OpenCode dễ tự chạy:

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "type-check": "tsc --noEmit",
    "test": "vitest run"
  }
}
```

Nếu repo bạn dùng script tên khác, hãy cập nhật lại `AGENTS.md` và `opencode.jsonc` cho khớp.

---

## 12) Khuyến nghị riêng cho Next.js

### A. Giữ ranh giới Server / Client rõ ràng
- Ưu tiên Server Components.
- Chỉ dùng `"use client"` khi thật sự cần state UI, browser API, event handlers.
- Không để agent tiện tay biến cả page thành client component chỉ để sửa một chi tiết nhỏ.

### B. Cẩn thận với env
- `NEXT_PUBLIC_` sẽ lộ sang bundle client.
- Biến không có `NEXT_PUBLIC_` chỉ dùng ở server.
- Giữ `.env*` ở root project.

### C. Dùng TypeScript chặt chẽ
- Hạn chế `any`.
- Có thể bật `typedRoutes` nếu project dùng TypeScript và muốn kiểm tra route literal tốt hơn trong Next.js.

Ví dụ `next.config.ts`:

```ts
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  typedRoutes: true,
}

export default nextConfig
```

---

## 13) Cách bắt đầu nhanh nhất cho repo đang có sẵn

Nếu bạn đã có repo Next.js rồi, làm đúng thứ tự này:

### 1. Vào repo

```bash
cd /path/to/repo
```

### 2. Chạy OpenCode

```bash
opencode
```

### 3. Trong TUI

```text
/connect
/models
/init
```

### 4. Chỉnh `AGENTS.md` theo đúng repo thật
Bổ sung:
- cấu trúc thư mục thật của bạn
- script thật trong `package.json`
- quy ước component / hooks / API
- các rule cấm

### 5. Tạo `opencode.jsonc`
Dùng mẫu ở trên, sau đó chỉnh lại:
- `model`
- `small_model`
- `permission`
- `command`

### 6. Tạo ít nhất 2 skill
- `audit-route`
- `add-route-handler`

### 7. Commit vào Git

```bash
git add AGENTS.md opencode.jsonc .opencode/
git commit -m "chore: add OpenCode project configuration"
```

---

## 14) Bộ file mẫu hoàn chỉnh nên có trong repo

```text
my-next-app/
├─ AGENTS.md
├─ opencode.jsonc
├─ .opencode/
│  ├─ skills/
│  │  ├─ audit-route/
│  │  │  └─ SKILL.md
│  │  └─ add-route-handler/
│  │     └─ SKILL.md
│  └─ commands/
│     └─ review-route.md
├─ .env.example
├─ app/
├─ components/
├─ lib/
├─ public/
├─ package.json
└─ tsconfig.json
```

---

## 15) Prompt mẫu nên dùng với OpenCode trong Next.js

### Phân tích route trước khi sửa

```text
Review the current route under app/dashboard/settings. Explain route hierarchy, layouts, shared components, server/client boundaries, env usage, and implementation risks. Do not edit files.
```

### Sửa code an toàn

```text
Implement the smallest safe change to add a settings save button with loading state. Reuse existing UI primitives, avoid unnecessary client component expansion, and run lint after the change.
```

### Review sau khi sửa

```text
Summarize changed files, explain why each change was needed, and list any follow-up refactors you intentionally did not do.
```

---

## 16) Lỗi thường gặp

### OpenCode không thấy config project
- Bảo đảm file nằm ở root repo.
- Mở OpenCode từ đúng thư mục project.
- Kiểm tra repo có `.git/` hoặc đang đứng dưới Git root.

### Agent sửa quá rộng
- Siết lại `AGENTS.md`.
- Chuyển phân tích sang `plan` trước.
- Đặt permission `bash`, `edit`, `write` ở mức `ask` cho các tác vụ nhạy cảm.

### Agent chạy sai script
- Đồng bộ lại script thật trong `package.json` với `AGENTS.md` và `opencode.jsonc`.

### Agent lạm dụng client component
- Ghi rõ trong `AGENTS.md`: prefer Server Components by default.
- Tạo skill `audit-route` để bắt agent kiểm tra boundary trước khi sửa.

---

## 17) Kết luận thực dụng

Nếu muốn OpenCode hiểu repo Next.js tốt, bộ tối thiểu nên có là:

1. `AGENTS.md` rõ ràng
2. `opencode.jsonc` với model + permission + agent config
3. `.opencode/skills/` cho các việc lặp lại
4. `.opencode/commands/` cho các tác vụ gọi nhanh
5. `.env.example` và script chuẩn trong `package.json`

Với dự án thật, đây là thứ tự tôi khuyên:

1. chạy `opencode`
2. `/connect`
3. `/models`
4. `/init`
5. sửa `AGENTS.md`
6. thêm `opencode.jsonc`
7. thêm skills + commands
8. commit toàn bộ

