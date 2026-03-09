# AGENTS.md

Guidelines for AI agents working in this codebase.

## Project Overview

- **Name**: autothreads
- **Type**: Next.js 16 web application
- **Purpose**: Social media automation (Threads, Facebook, Instagram)
- **Content**: Daily juice recipe for Vietnamese women
- **Storage**: JSON files in `data/`

## Tech Stack

- Next.js 16.1.6 (App Router)
- TypeScript (strict mode)
- Tailwind CSS 4
- Bun (package manager)
- AI: Puter (primary), OpenAI/Gemini (optional)

## Commands

```bash
bun run dev          # Development server
bun run build        # Production build
bun run start        # Start production server
bun run lint         # ESLint
bunx tsc --noEmit    # Type check
```

## Directory Structure

```
app/
├── api/
│   ├── accounts/
│   ├── ai-config/
│   ├── auth/threads/
│   ├── auto-scheduler/
│   ├── content-pool/
│   ├── generate/
│   ├── history/
│   ├── post/
│   ├── platforms/
│   │   ├── facebook/
│   │   ├── instagram/
│   │   └── threads/
│   ├── scheduler/
│   ├── threads/
│   └── upload-image/
├── platforms/
│   ├── accounts/
│   ├── content-pool/
│   ├── facebook/
│   ├── instagram/
│   └── threads/
├── globals.css
├── layout.tsx
└── page.tsx

components/
├── dashboard/
│   ├── auto-scheduler/
│   ├── content-pool/
│   ├── compose-form.tsx
│   ├── history-list.tsx
│   ├── post-card.tsx
│   ├── schedule-grid.tsx
│   └── ...
├── layout/
│   ├── header.tsx
│   ├── platform-nav.tsx
│   └── platform-shell.tsx
├── platforms/
│   ├── facebook/
│   ├── instagram/
│   └── threads/
├── shared/
│   ├── ai-config-card.tsx
│   ├── platform-monitor.tsx
│   └── ...
└── ui/
    ├── icons.tsx
    ├── spinner.tsx
    └── stat-card.tsx

lib/
├── services/
│   ├── threads.service.ts
│   ├── facebook.service.ts
│   ├── instagram.service.ts
│   ├── auto-scheduler.ts
│   ├── fb-scheduler.ts
│   ├── ig-scheduler.ts
│   └── *-store.ts
├── ai/
│   ├── provider.ts
│   ├── puter/
│   ├── gemini.ts
│   └── openai.ts
├── prompts/
│   ├── system.ts
│   └── user.ts
├── scheduler.ts
├── content-pool.ts
├── topics.ts
└── ...

types/
└── index.ts

hooks/
├── use-dashboard.ts
├── use-facebook-dashboard.ts
├── use-instagram-dashboard.ts
└── use-puter-generate.ts
```

## Code Style

### Imports
Use `@/` alias:
```typescript
import { NextRequest, NextResponse } from "next/server";
import { threadsService } from "@/lib/services/threads.service";
import type { ContentPoolItem } from "@/types";
```

Order: external → types → lib → components → hooks → relative

### TypeScript
- No `any` - use `unknown` and narrow
- Interface for objects, type for unions
- Explicit parameter/return types

### Naming
- Files: kebab-case (`content-pool.ts`, `route.ts`)
- Functions: camelCase
- Types: PascalCase
- Components: PascalCase

### React/Next.js
- Server Components by default
- Add `"use client"` only when using hooks
- Tailwind CSS only
- Components in `components/` folder
- Hooks in `hooks/` folder

### Error Handling
```typescript
// API Routes
return NextResponse.json({ success: true, data: result });
// Error
return NextResponse.json(
  { success: false, error: err instanceof Error ? err.message : "Error" },
  { status: 500 }
);
```

## Architecture

### Services (Singletons)
```typescript
import { threadsService } from "@/lib/services/threads.service";
import { facebookService } from "@/lib/services/facebook.service";
import { instagramService } from "@/lib/services/instagram.service";
```

### Schedulers (4 independent systems)
| Scheduler | File |
|-----------|------|
| Threads-only | `lib/scheduler.ts` |
| FB | `lib/services/fb-scheduler.ts` |
| IG | `lib/services/ig-scheduler.ts` |
| Auto (3-platform) | `lib/services/auto-scheduler.ts` |

### Global Guard Pattern
```typescript
const _g = global as typeof global & { __schedulerStarted?: boolean };
if (_g.__schedulerStarted) return;
_g.__schedulerStarted = true;
```

## Security

- Validate `CRON_SECRET` on scheduler endpoints
- Never expose tokens in API responses
- Never log full tokens

## Testing

No test framework. When adding:
- Use Vitest
- Place alongside source: `lib/foo.ts` → `lib/foo.test.ts`

## Environment Variables

See `.env.example`. Key vars:
- `THREADS_ACCESS_TOKEN`, `THREADS_USER_ID`
- `FB_PAGE_ACCESS_TOKEN`, `FB_PAGE_ID`
- `IG_ACCESS_TOKEN`, `IG_USER_ID`
- `CRON_SECRET`
- `SCHEDULER_ENABLED`
- `AUTO_SCHEDULER_ENABLED`

## Prohibited Patterns

- Never use `any` type
- Never expose tokens in API responses
- Never import UI components in API routes
- Never start schedulers outside `instrumentation.ts`
- Never merge scheduler systems (they are independent)
- No CSS-in-JS, use Tailwind only
