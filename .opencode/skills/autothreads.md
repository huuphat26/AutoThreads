# AutoThreads Skill

This skill provides domain-specific guidance for working with the AutoThreads social media automation platform.

## Project Summary

AutoThreads is a Next.js 16 web application that automates AI-generated social media posting across three Meta platforms: Threads, Facebook, and Instagram. The content niche is "daily juice recipe" for Vietnamese women.

## Architecture Overview

### Three Platform Services (Singletons)

- **ThreadsService** (`lib/services/threads.service.ts`) - Graph API v1.0
- **FacebookService** (`lib/services/facebook.service.ts`) - Graph API v25.0  
- **InstagramService** (`lib/services/instagram.service.ts`) - Graph API v25.0

Import singletons, never instantiate directly:
```typescript
import { threadsService } from "@/lib/services/threads.service";
import { facebookService } from "@/lib/services/facebook.service";
import { instagramService } from "@/lib/services/instagram.service";
```

### Four Independent Scheduler Systems

| Scheduler | File | Trigger |
|-----------|------|---------|
| Threads-only | `lib/scheduler.ts` | CRON_SCHEDULES env (default 12:00, 18:00) |
| FB Scheduler | `lib/services/fb-scheduler.ts` | Configurable cron |
| IG Scheduler | `lib/services/ig-scheduler.ts` | Configurable cron |
| Auto-Scheduler | `lib/services/auto-scheduler.ts` | Fixed 11:58 & 17:58 |

Auto-scheduler uses two-phase flow:
1. Phase 1: `startWaitingForAI()` creates AutoPostRecord
2. Browser generates content via Puter.js
3. Phase 2: `executePlatformPosts()` posts to FB → Threads → IG (2 min delays)

### AI System

- **Primary**: Puter provider via `lib/ai/provider.ts`
- Browser uses Puter.js CDN (`window.puter.ai.chat()`)
- Server uses Puter REST API
- Never call AI directly in routes - use `createProvider()`

### Data Storage

JSON files in `data/` directory:
- `post-history.json` - Threads posts
- `auto-post-history.json` - 3-platform posts
- `fb-post-history.json` - Facebook posts
- `ig-post-history.json` - Instagram posts
- `ai-config.json` - Active AI model config

## Common Tasks

### Adding a New API Route

1. Create folder under `app/api/<category>/`
2. Use NextRequest/NextResponse pattern
3. Return `{ success: true, data: ... }` or `{ success: false, error: ... }`
4. Validate CRON_SECRET for scheduler endpoints

```typescript
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  try {
    const result = await getData();
    return NextResponse.json({ success: true, data: result });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "Error" },
      { status: 500 }
    );
  }
}
```

### Adding a New Platform Service

1. Create `lib/services/platform.service.ts` with class + singleton
2. Add types to `types/index.ts`
3. Create store at `lib/services/platform-store.ts`
4. Create API routes under `app/api/platforms/platform/`

### Adding a New Content Topic

1. Edit `lib/topics.ts` - add TopicConfig object
2. TOPIC_LABELS and ContentTopic update automatically
3. No other file changes needed

## Key Patterns

### Global Guard for Schedulers

```typescript
const _g = global as typeof global & { __schedulerStarted?: boolean };
if (_g.__schedulerStarted) return;
_g.__schedulerStarted = true;
```

### Container Polling

Threads: 30s timeout, Instagram: 60s timeout
```typescript
await service.waitForContainer(containerId); // throws on timeout
```

### Error Handling

- Services: throw custom errors (ThreadsApiError, FBApiError, IGApiError)
- API Routes: catch and return { success: false, error }
- Client: try/catch with user-friendly messages

## Code Conventions

### TypeScript

- **Strict mode enabled** - never use `any`, use `unknown` and narrow
- **Prefer interface over type** for object shapes
- **Use `type`** for unions, intersections, primitives
- **Use path alias `@/`** for all internal imports

### Import Order

1. External packages (`next`, `react`, `axios`)
2. Internal `@/types`
3. Internal `@/lib/...`
4. Internal `@/components/...`
5. Internal `@/hooks/...`
6. Relative imports (`./`)

### File Naming

| Pattern | Convention |
|---------|------------|
| React components | `kebab-case.tsx` |
| Hooks | `use-kebab-case.ts` |
| Services | `platform.service.ts` |
| Stores | `platform-store.ts` |
| API routes | `route.ts` (in folder) |

### Comments

- Use `// ─── Section Name ───` dividers in large files
- Every exported function needs JSDoc comment
- Vietnamese comments acceptable (personal project)

### Async/Await

- Always use `async/await` over `.then()/.catch()` chains
- Use sleep helper: `const sleep = (ms) => new Promise(r => setTimeout(r, ms))`

### Components

- **Server Components by default** - add `"use client"` only when needed
- No direct API calls - use hooks in `hooks/`
- Tailwind CSS only - no CSS-in-JS
- No hardcoded status labels - use `STATUS_CONFIG` from `lib/constants.ts`
- No hardcoded topic labels - use `TOPIC_LABELS`

### Store Pattern (JSON files)

```typescript
const DATA_FILE = path.join(process.cwd(), "data", "file.json");

export function readStore(): StoreType {
  try {
    const raw = fs.readFileSync(DATA_FILE, "utf-8");
    return JSON.parse(raw) as StoreType;
  } catch {
    return defaultValue;
  }
}

export function writeStore(store: StoreType): void {
  fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
  fs.writeFileSync(DATA_FILE, JSON.stringify(store, null, 2), "utf-8");
}
```

Rules:
- Cap history at 200 records: `records.slice(0, 200)`
- Always `unshift` new records (newest first)
- Never write directly from routes - use dedicated store modules

### API Route Pattern

```typescript
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const result = await service.getData();
    return NextResponse.json({ success: true, data: result });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error("[Route] Error:", msg);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
```

### Security

- Validate CRON_SECRET on scheduler endpoints
- Never expose tokens in API responses
- Never log full tokens - use `token.slice(0,4) + "..."`

## Important Files

- `lib/topics.ts` - Content topic definitions
- `lib/prompts/system.ts` - AI system prompts
- `lib/prompts/user.ts` - AI user prompt builders
- `types/index.ts` - All TypeScript interfaces
- `instrumentation.ts` - Scheduler startup hook

## Commands

```bash
bun run dev          # Development server
bun run build       # Production build  
bun run lint        # ESLint
bunx tsc --noEmit   # Type check
```

## Environment Variables

Key required vars:
- `THREADS_ACCESS_TOKEN`, `THREADS_USER_ID`
- `FB_PAGE_ACCESS_TOKEN`, `FB_PAGE_ID`
- `IG_ACCESS_TOKEN`, `IG_USER_ID`
- `CRON_SECRET` - Protects scheduler endpoints
- `SCHEDULER_ENABLED=true` - Enable Threads scheduler
- `AUTO_SCHEDULER_ENABLED=true` - Enable 3-platform scheduler
