# Domain Rules

## Content Niche

All content is about **"daily juice recipe"** targeting Vietnamese women. The tone is conversational, like texting a friend.

## Prohibited Content Patterns

- No bold text markers (`**`, `__`)
- No date/time stamps in post body
- No words: "detox", "giảm cân" (weight loss), "trị mụn" (acne treatment)
- No medical terminology
- No section headers like "Nguyên liệu:", "Cách làm:" - blend naturally

## Required Content Elements

Every AI-generated post must include (embedded naturally):
1. Name of the juice/drink
2. Taste description
3. Ingredients list (written in sentences, not bullet headers)
4. Preparation steps
5. Flavor adjustment tip
6. Drinking tip
7. Light CTA (call-to-action invite)

## Length Guidelines

| Platform | Target Characters |
|----------|-------------------|
| Threads | 500-800 |
| Facebook | 550-850 |
| Instagram caption | Shorter, visual-focused |

## Topic System

Topics are defined in `lib/topics.ts`:
```typescript
interface TopicConfig {
  id: string;
  label: string;
  description: string;
}
```

To add/edit a topic, only modify `lib/topics.ts`. Constants and types derive automatically.

## API Quotas

| Platform | Limit |
|----------|-------|
| Threads | 250 posts/24h |
| Instagram | 25 posts/24h |
| Facebook | Rate-limited |

## Container Timeouts

| Platform | Timeout |
|----------|---------|
| Threads | 30s |
| Instagram | 60s |

## Token Management

- **Threads**: Long-lived token via `THREADS_ACCESS_TOKEN`
- **Facebook**: Page access token via `FB_PAGE_ACCESS_TOKEN`
- **Instagram**: Long-lived token via `IG_ACCESS_TOKEN`

Tokens should be refreshed periodically using scripts in project root:
- `get-token.sh`
- `get-fb-token.sh`
- `get-ig-token.sh`
- `refresh-all-tokens.sh`

## Post Status Values

```typescript
type PostStatus = "pending" | "posted" | "failed" | "draft";
type AutoPostStatus = "waiting_for_ai" | "ready" | "posting" | "completed" | "failed";
```

## Auto-Post Slots

```typescript
type AutoPostSlot = "noon" | "evening";
```

- `noon`: prepare at 11:58, post at 12:00
- `evening`: prepare at 17:58, post at 18:00

## Platform Order (Auto-Scheduler)

Facebook → (2 min delay) → Threads → (2 min delay) → Instagram

Delay defined as `PLATFORM_DELAY_MS = 2 * 60 * 1000`
