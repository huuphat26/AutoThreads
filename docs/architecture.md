# Architecture

## System Overview

AutoThreads is a Next.js application that automates social media posting across three Meta platforms using AI-generated content.

## Platform Services

### Service Singletons

Each platform has a dedicated service class exported as singleton:

| Service | File | API Base |
|---------|------|----------|
| ThreadsService | `lib/services/threads.service.ts` | `graph.threads.net/v1.0` |
| FacebookService | `lib/services/facebook.service.ts` | `graph.facebook.com/v25.0` |
| InstagramService | `lib/services/instagram.service.ts` | `graph.instagram.com/v25.0` |

### Service Methods

**ThreadsService**
- `getUser()`, `getRecentPosts()`, `getPostInsights()`
- `createTextContainer(text)` → publish flow step 1
- `publishContainer(containerId)` → step 2
- `waitForContainer(containerId)` - polls until FINISHED (30s timeout)
- `getPublishingLimit()`, `refreshLongLivedToken()`

**FacebookService**
- `resolvePageId()` - gets scoped ID (required for most endpoints)
- `publishPost(text)`, `publishPhoto(url, caption)`
- `getPostInsights()`, `getPageInsights()`
- `getComments()`, `checkToken()`

**InstagramService**
- `getProfile()`, `createImageContainer(url, caption)`
- `waitForContainer(containerId)` - 60s timeout (longer for media processing)
- `publishContainer(containerId)`
- `getMediaInsights()`, `getAccountInsights()`, `getPublishingLimit()`

## Scheduler Systems

### 1. Threads-only Scheduler (`lib/scheduler.ts`)
- Enabled: `SCHEDULER_ENABLED=true`
- Default: 12:00 & 18:00 daily
- Configurable via `CRON_SCHEDULES` env var
- In-memory state (resets on cold start)

### 2. Auto-Scheduler (`lib/services/auto-scheduler.ts`)
- Enabled: `AUTO_SCHEDULER_ENABLED=true`
- Fixed slots: noon (12:00) & evening (18:00)
- **Two-phase flow**:
  1. Phase 1: `startWaitingForAI()` creates `AutoPostRecord{status: "waiting_for_ai"}`
  2. Browser polls and generates content via Puter.js
  3. Phase 2: `executePlatformPosts()` posts FB → (2 min) → Threads → (2 min) → IG

### 3. FB/IG Schedulers
- Independent single-platform schedulers
- `lib/services/fb-scheduler.ts`
- `lib/services/ig-scheduler.ts`

## AI System

### Provider Architecture
```
createProvider() [lib/ai/provider.ts]
  └─ PuterProvider
      ├─ Browser: window.puter.ai.chat() (Puter.js CDN)
      └─ Server: POST https://api.puter.com/drivers/call
```

### AIProvider Interface
```typescript
interface AIProvider {
  readonly name: string;
  readonly model: string;
  readonly promptVariant: PromptVariant;
  complete(userPrompt: string, systemPrompt: string): Promise<string>;
  stream(userPrompt: string, systemPrompt: string): AsyncGenerator<string>;
}
```

### Prompt Files
- `lib/prompts/system.ts` - System prompts per provider
- `lib/prompts/user.ts` - User prompt builders

## Data Flow

### API Request Flow
```
Client → API Route (app/api/*/route.ts)
           ↓
        Service (lib/services/*.service.ts)
           ↓
        Meta Graph API (threads.net, facebook.com, instagram.com)
```

### Scheduler Flow
```
Cron trigger → instrumentation.ts register()
                    ↓
              Scheduler (lib/scheduler.ts)
                    ↓
              Content Generator OR Content Pool
                    ↓
              Platform Service
                    ↓
              Meta API
```

## State Management

### Persistence Strategy
| Data | Storage | File |
|------|---------|------|
| Auto-scheduler history | JSON | `data/auto-post-history.json` |
| FB post history | JSON | `data/fb-post-history.json` |
| IG post history | JSON | `data/ig-post-history.json` |
| Threads history | In-memory | `lib/store.ts` |
| AI config | JSON | `data/ai-config.json` |

### Store Rules
- Cap history at 200 records
- Always `unshift` new records (newest first)
- Use `fs.mkdirSync({ recursive: true })` before writing

## File Structure

```
autothreads/
├── app/
│   ├── api/                    # API routes
│   │   ├── platforms/          # Platform-specific APIs
│   │   ├── scheduler/          # Scheduler control
│   │   ├── generate/           # AI content generation
│   │   └── auto-scheduler/     # 3-platform scheduler
│   └── platforms/              # UI pages
│
├── lib/
│   ├── services/               # Platform API services
│   │   ├── threads.service.ts
│   │   ├── facebook.service.ts
│   │   ├── instagram.service.ts
│   │   ├── auto-scheduler.ts
│   │   └── *-store.ts          # JSON persistence
│   ├── ai/                     # AI abstraction
│   │   ├── provider.ts         # Factory
│   │   ├── puter/              # Puter implementation
│   │   └── prompts/            # Prompt templates
│   ├── scheduler.ts            # Threads-only scheduler
│   ├── content-pool.ts         # Pre-written content
│   └── topics.ts               # Content topics
│
├── types/
│   └── index.ts                # All interfaces
│
└── data/                       # JSON files (persistence)
```
