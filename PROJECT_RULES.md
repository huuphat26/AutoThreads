# AutoThreads — Project Rules & Architecture Guide

> **Purpose:** This document defines the authoritative rules, conventions, and architecture decisions for the AutoThreads project. All contributors and AI coding assistants must follow these rules.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Technology Stack](#2-technology-stack)
3. [Directory Structure](#3-directory-structure)
4. [Architecture Principles](#4-architecture-principles)
5. [API Routes](#5-api-routes)
6. [Data Models & Types](#6-data-models--types)
7. [AI System](#7-ai-system)
8. [Scheduler System](#8-scheduler-system)
9. [Platform Services](#9-platform-services)
10. [State & Data Persistence](#10-state--data-persistence)
11. [Environment Variables](#11-environment-variables)
12. [Coding Conventions](#12-coding-conventions)
13. [Component Guidelines](#13-component-guidelines)
14. [Error Handling](#14-error-handling)
15. [Security Guidelines](#15-security-guidelines)
16. [Content & Prompt Guidelines](#16-content--prompt-guidelines)
17. [Development Workflow](#17-development-workflow)

---

## 1. Project Overview

**AutoThreads** is a personal-use Next.js web application that automates AI-generated social media posting across three Meta platforms:

| Platform      | API Base                            | Purpose                                |
| ------------- | ----------------------------------- | -------------------------------------- |
| **Threads**   | `https://graph.threads.net/v1.0`    | Primary platform, scheduled auto-posts |
| **Facebook**  | `https://graph.facebook.com/v25.0`  | Page posts with photo/video support    |
| **Instagram** | `https://graph.instagram.com/v25.0` | Image-based posts via container flow   |

### Core Features

- **Auto Scheduler (3-platform):** At 11:58, AI generates content → at 12:00 posts to FB → waits 2 min → Threads → waits 2 min → IG. Repeats at 17:58/18:00.
- **Threads-only Scheduler:** Standalone Threads post scheduler, configurable via `CRON_SCHEDULES` env var.
- **Manual Posting:** Compose and post manually from the dashboard to any platform.
- **AI Content Generation:** Uses Puter.js (free, no API key needed in browser) to generate juice-recipe social content in Vietnamese.
- **Post History & Insights:** Track all posts with status, engagement metrics, and API insights.
- **Topic System:** Dynamically configurable content topics — add/edit in `lib/topics.ts`.

### Content Niche

The content series is **"daily juice recipe"** targeting Vietnamese women. All AI-generated content follows this niche. Do **not** change the content niche without updating all system prompts, topics, and examples.

---

## 2. Technology Stack

| Category     | Technology                            | Version                   |
| ------------ | ------------------------------------- | ------------------------- |
| Framework    | Next.js (App Router)                  | 16.1.6                    |
| Runtime      | Bun (primary) / Node.js               | latest                    |
| Language     | TypeScript                            | ^5                        |
| Styling      | Tailwind CSS v4                       | ^4                        |
| HTTP Client  | Axios                                 | ^1.13.5                   |
| Scheduler    | node-cron                             | ^4.2.1                    |
| AI (server)  | Puter REST API (anonymous/token)      | —                         |
| AI (browser) | Puter.js CDN (`window.puter.ai.chat`) | v2                        |
| AI SDK (alt) | OpenAI SDK, Google GenAI SDK          | available but not primary |
| React        | React 19                              | 19.2.3                    |
| Fonts        | Geist Sans, Geist Mono                | next/font                 |

### Key Decisions

- **No database.** Data is stored in `data/*.json` files (file-system, for local/VPS) or in-memory (for Vercel serverless). See [Section 10](#10-state--data-persistence).
- **No authentication system.** Single-user personal tool. Protect API routes via `CRON_SECRET` header.
- **Puter is the sole AI provider.** OpenAI and Gemini SDKs are present but Puter routes through them for free. Do not add direct OpenAI/Gemini billing without explicit discussion.
- **Bun is the package manager.** Use `bun install`, `bun run dev`. Do not use `npm` or `yarn`.

---

## 3. Directory Structure

```
autothreads/
├── app/                        # Next.js App Router pages & API routes
│   ├── layout.tsx              # Root layout — loads Puter.js CDN script
│   ├── page.tsx                # Main dashboard (Threads-focused)
│   ├── globals.css             # Global styles + Tailwind
│   ├── api/                    # All server-side API routes
│   │   ├── ai-config/          # GET/POST active AI model config
│   │   ├── auth/threads/       # OAuth callback for Threads
│   │   ├── auto-scheduler/     # Trigger/status for 3-platform auto-scheduler
│   │   ├── generate/           # AI content generation (non-streaming)
│   │   │   └── stream/         # AI content generation (streaming SSE)
│   │   ├── history/            # Post history CRUD
│   │   ├── platforms/
│   │   │   ├── facebook/       # FB posts, photos, insights, schedule, comments
│   │   │   ├── instagram/      # IG media, publish, insights, quota, schedule
│   │   │   └── threads/        # Threads manual schedule
│   │   ├── post/               # Threads post: create, [postId] delete/update
│   │   ├── puter-prompt/       # Puter prompt helper route
│   │   ├── scheduler/          # Threads scheduler control (pause/resume/status)
│   │   └── threads/            # Threads API: user, recent, post, container
│   └── platforms/              # Platform-specific UI pages
│       ├── layout.tsx          # Shared platform shell layout
│       ├── page.tsx            # Platform overview
│       ├── facebook/           # Facebook dashboard page
│       ├── instagram/          # Instagram dashboard page
│       └── threads/            # Threads dashboard page
│
├── components/                 # All React components
│   ├── dashboard/              # Dashboard-level widgets (monitor, form, list)
│   ├── layout/                 # Header, nav, shell
│   ├── platforms/              # Platform-specific components
│   │   ├── facebook/
│   │   ├── instagram/
│   │   └── threads/
│   ├── shared/                 # Reusable cross-platform components
│   └── ui/                     # Primitive UI (icons, spinner, stat-card)
│
├── data/                       # JSON persistence files (gitignored if sensitive)
│   ├── ai-config.json          # Active AI provider + model selection
│   ├── auto-post-history.json  # 3-platform auto-scheduler history
│   ├── fb-post-history.json    # Facebook post history
│   ├── ig-post-history.json    # Instagram post history
│   ├── ig-auto-images.json     # Instagram image pool for auto-posts
│   ├── post-history.json       # Threads scheduler post history (legacy)
│   └── threads-manual-history.json  # Threads manual post history
│
├── hooks/                      # React custom hooks (client-side)
│   ├── use-dashboard.ts        # Threads dashboard state
│   ├── use-facebook-dashboard.ts
│   ├── use-instagram-dashboard.ts
│   └── use-puter-generate.ts   # Puter.js AI generation hook
│
├── lib/                        # Core business logic (server + shared)
│   ├── ai/                     # AI abstraction layer
│   │   ├── types.ts            # AIProvider interface
│   │   ├── provider.ts         # Factory — always returns PuterProvider
│   │   ├── config.ts           # Active model config read/write
│   │   ├── gemini.ts           # Gemini SDK wrapper (legacy/alternative)
│   │   ├── openai.ts           # OpenAI SDK wrapper (legacy/alternative)
│   │   ├── parser.ts           # Response parsing utilities
│   │   └── puter/              # Puter provider implementation
│   │       ├── provider.ts     # PuterProvider class (server-side REST)
│   │       └── config.ts       # Puter constants (model, prompt variant)
│   ├── prompts/
│   │   ├── system.ts           # System prompts per AI provider
│   │   └── user.ts             # User prompt builders
│   ├── services/               # Platform API service classes
│   │   ├── threads.service.ts  # ThreadsService singleton
│   │   ├── facebook.service.ts # FacebookService singleton
│   │   ├── instagram.service.ts # InstagramService singleton
│   │   ├── auto-scheduler.ts   # Multi-platform auto-scheduler logic
│   │   ├── scheduler.ts → ../scheduler.ts  # (Threads-only scheduler in lib root)
│   │   ├── fb-scheduler.ts     # Facebook cron scheduler
│   │   ├── ig-scheduler.ts     # Instagram cron scheduler
│   │   ├── threads-manual-scheduler.ts
│   │   ├── fb-store.ts         # Facebook post JSON store
│   │   ├── ig-store.ts         # Instagram post JSON store
│   │   └── threads-manual-store.ts
│   ├── auto-post-store.ts      # AutoPostRecord JSON store (3-platform)
│   ├── constants.ts            # TOPIC_LABELS, STATUS_CONFIG (derived from topics.ts)
│   ├── content-generator.ts    # AI content generation orchestration
│   ├── ig-image-pool.ts        # Instagram image rotation pool
│   ├── scheduler.ts            # Threads-only cron scheduler
│   ├── store.ts                # Threads in-memory store (serverless-safe)
│   ├── threads-api.ts          # Low-level Threads post function
│   └── topics.ts               # ⭐ Content topic definitions — edit here
│
├── types/
│   ├── index.ts                # All TypeScript interfaces and types
│   └── puter.d.ts              # Puter.js browser global type declarations
│
├── public/                     # Static assets
├── instrumentation.ts          # Next.js instrumentation (scheduler startup)
├── next.config.ts              # Next.js config
├── tsconfig.json
├── eslint.config.mjs
└── .env / .env.example         # Environment variables
```

---

## 4. Architecture Principles

### 4.1 Separation of Schedulers

There are **three independent scheduler systems**. Never merge or cross-wire them:

| Scheduler      | File                             | Trigger                                     | Platforms         |
| -------------- | -------------------------------- | ------------------------------------------- | ----------------- |
| Threads-only   | `lib/scheduler.ts`               | `CRON_SCHEDULES` env (default 12:00, 18:00) | Threads only      |
| FB Scheduler   | `lib/services/fb-scheduler.ts`   | Configurable cron                           | Facebook only     |
| IG Scheduler   | `lib/services/ig-scheduler.ts`   | Configurable cron                           | Instagram only    |
| Auto-Scheduler | `lib/services/auto-scheduler.ts` | Fixed 11:58 & 17:58                         | FB → Threads → IG |

### 4.2 Auto-Scheduler Two-Phase Flow

```
[11:58 cron fires]
  └─ Phase 1: startWaitingForAI() → creates AutoPostRecord{status: "waiting_for_ai"}
               ↓
[Browser detects "waiting_for_ai" via polling]
  └─ Puter.js generates content on browser → submits to POST /api/auto-scheduler
               ↓
[Phase 2: executePlatformPosts()]
  └─ Post to Facebook
  └─ Wait 2 minutes (PLATFORM_DELAY_MS)
  └─ Post to Threads
  └─ Wait 2 minutes
  └─ Post to Instagram
```

**Rule:** The browser is responsible for AI generation in the auto-scheduler. The server only orchestrates posting. This avoids needing `PUTER_API_TOKEN` for most deployments.

### 4.3 Service Singletons

Each platform service is exported as a **singleton**:

```typescript
export const threadsService = new ThreadsService();
export const facebookService = new FacebookService();
export const instagramService = new InstagramService();
```

**Rule:** Never instantiate platform services directly. Always import the singleton.

### 4.4 Global Guard for Schedulers

All `startScheduler` functions use a global guard pattern to prevent duplicate cron jobs on hot reload:

```typescript
const _g = global as typeof global & { __schedulerStarted?: boolean };
if (_g.__schedulerStarted) return;
_g.__schedulerStarted = true;
```

**Rule:** Every new scheduler must implement this guard using a unique `__guardName` on `global`.

### 4.5 Next.js Instrumentation

Schedulers are started in `instrumentation.ts` via the `register()` hook:

```typescript
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    // start schedulers here
  }
}
```

**Rule:** Only start schedulers inside `register()` in `instrumentation.ts`. Never start them inside API routes or component files.

---

## 5. API Routes

All API routes live under `app/api/`. Routes are protected via `CRON_SECRET` header where applicable.

### Route Map

| Method       | Path                                            | Description                               |
| ------------ | ----------------------------------------------- | ----------------------------------------- |
| `GET`        | `/api/threads/user`                             | Fetch Threads profile                     |
| `GET`        | `/api/threads/recent`                           | Fetch recent Threads posts                |
| `GET`        | `/api/threads/post/[postId]`                    | Get single Threads post detail + insights |
| `GET/DELETE` | `/api/threads/container/[containerId]`          | Container status / delete                 |
| `POST`       | `/api/post`                                     | Publish a new Threads post                |
| `GET/DELETE` | `/api/post/[postId]`                            | Get or delete a Threads post              |
| `GET/POST`   | `/api/scheduler`                                | Threads scheduler status / control        |
| `GET/POST`   | `/api/history`                                  | Post history read / update                |
| `POST`       | `/api/generate`                                 | Generate AI content (non-streaming)       |
| `POST`       | `/api/generate/stream`                          | Generate AI content (SSE streaming)       |
| `GET/POST`   | `/api/ai-config`                                | Read/write active AI model config         |
| `GET/POST`   | `/api/auto-scheduler`                           | Auto-scheduler status / submit AI content |
| `GET`        | `/api/auth/threads`                             | OAuth callback                            |
| `GET/POST`   | `/api/platforms/facebook`                       | FB page info / create post                |
| `GET`        | `/api/platforms/facebook/posts`                 | List FB posts                             |
| `GET/DELETE` | `/api/platforms/facebook/posts/[postId]`        | FB post detail / delete                   |
| `GET/POST`   | `/api/platforms/facebook/photos`                | Upload photo post                         |
| `GET`        | `/api/platforms/facebook/insights`              | Page-level insights                       |
| `POST`       | `/api/platforms/facebook/schedule`              | Schedule a FB post                        |
| `GET/DELETE` | `/api/platforms/facebook/comments/[commentId]`  | Comment management                        |
| `GET/POST`   | `/api/platforms/instagram`                      | IG profile / publish post                 |
| `GET`        | `/api/platforms/instagram/media`                | List IG media                             |
| `GET`        | `/api/platforms/instagram/media/[mediaId]`      | Single media detail                       |
| `GET`        | `/api/platforms/instagram/insights`             | Account insights                          |
| `GET`        | `/api/platforms/instagram/quota`                | Publishing quota                          |
| `POST`       | `/api/platforms/instagram/publish`              | Publish IG container                      |
| `POST`       | `/api/platforms/instagram/schedule`             | Schedule IG post                          |
| `GET/DELETE` | `/api/platforms/instagram/comments/[commentId]` | IG comment management                     |
| `POST`       | `/api/platforms/threads/schedule`               | Schedule Threads manual post              |

### API Route Rules

1. **Always return `Response` with `Content-Type: application/json`.**
2. **Validate `CRON_SECRET`** on internal cron-triggered endpoints.
3. **Catch all errors** — never let an unhandled exception crash the route. Return `{ error: string }` with appropriate HTTP status.
4. **Do not import UI components** in API routes.
5. **Do not use `cookies()` or `headers()` for auth** — this is a personal tool.

---

## 6. Data Models & Types

All types are defined in `types/index.ts`. **Never define types inline in component or service files** — always add them to `types/index.ts`.

### Key Type Groups

#### Threads Types

- `ThreadsUser` — profile info
- `ThreadsPost` — post data from API
- `ThreadsMediaInsights` — views, likes, replies, reposts, quotes, reach, shares
- `ThreadsContainerStatus` — `EXPIRED | ERROR | FINISHED | IN_PROGRESS | PUBLISHED`
- `ThreadsPublishingLimit` — quota info

#### Facebook Types

- `FBPage`, `FBPost`, `FBComment`
- `FBPostInsights`, `FBPageInsights`
- `FBTokenStatus`, `FBAttachment`

#### Instagram Types

- `IGProfile`, `IGMedia`, `IGComment`
- `IGMediaInsights`, `IGAccountInsights`
- `IGPublishingLimit`, `IGPublishResult`
- `IGContainerStatus`

#### Scheduler Types

- `ScheduledPost` — single Threads-only scheduled post
- `PostHistory` — container for `ScheduledPost[]`
- `PostStatus` — `"pending" | "posted" | "failed" | "draft"`

#### Auto-Scheduler Types

- `AutoPostRecord` — 3-platform post record
- `AutoPostSlot` — `"noon" | "evening"`
- `AutoPostHistory` — container for `AutoPostRecord[]`

#### AI Types

- `AIProvider` — interface all providers must implement
- `PromptVariant` — `"gemini" | "openai"` (controls which prompt builder is used)

### Type Rules

1. **`ContentTopic` is `string`** — topics are dynamic IDs from `lib/topics.ts`. Never hardcode topic IDs.
2. **`PostStatus` is a union literal type.** Do not use plain strings where `PostStatus` is expected.
3. **All insight fields are optional** unless documented as always present.
4. **Do not use `any`.** Use `unknown` and narrow explicitly.

---

## 7. AI System

### 7.1 Provider Architecture

```
createProvider() [lib/ai/provider.ts]
    └─ always returns PuterProvider
           ├─ Browser: window.puter.ai.chat() [via Puter.js CDN]
           └─ Server:  POST https://api.puter.com/drivers/call [REST, anonymous or Bearer]
```

**Rule:** `createProvider()` is the only entry point for AI generation. Do not call Puter, OpenAI, or Gemini SDKs directly in route handlers or components.

### 7.2 AIProvider Interface

Every AI provider must implement:

```typescript
interface AIProvider {
  readonly name: string;
  readonly model: string; // displayed in UI
  readonly promptVariant: PromptVariant;

  complete(userPrompt: string, systemPrompt: string): Promise<string>;
  stream(userPrompt: string, systemPrompt: string): AsyncGenerator<string>;
}
```

### 7.3 Model Config

Active model is persisted in `data/ai-config.json`:

```json
{ "provider": "puter", "model": "gpt-4o-mini" }
```

- Read/write via `lib/ai/config.ts` — `getActiveModel()` / `setActiveModel()`
- UI can update model via `POST /api/ai-config`

### 7.4 Prompt Architecture

| File                    | Purpose                                            |
| ----------------------- | -------------------------------------------------- |
| `lib/prompts/system.ts` | System prompts per provider variant                |
| `lib/prompts/user.ts`   | User prompt builders (inject topic, time, context) |

- `buildSystemPromptGemini()` — for Gemini-style JSON schema response
- `buildSystemPromptOpenAI()` — for OpenAI-style plain text (used by Puter/OpenAI)
- `buildUserPrompt(topic, time?)` — constructs the user message

**Rule:** All prompt changes must be made in `lib/prompts/`. Never hardcode prompt strings in route handlers or components.

### 7.5 Browser AI Generation (Puter.js)

The main dashboard uses `hooks/use-puter-generate.ts` which calls `window.puter.ai.chat()` client-side. This requires:

- `<Script src="https://js.puter.com/v2/" strategy="afterInteractive" />` in `app/layout.tsx`
- `types/puter.d.ts` for TypeScript declarations

**Rule:** Never remove the Puter.js `<Script>` tag from `app/layout.tsx`.

---

## 8. Scheduler System

### 8.1 Threads-Only Scheduler (`lib/scheduler.ts`)

- **Enabled by:** `SCHEDULER_ENABLED=true` in `.env`
- **Schedule:** Reads `CRON_SCHEDULES` env var. Default: `0 12 * * *` and `0 18 * * *`
- **Timezone:** `TIMEZONE` env var, default `Asia/Ho_Chi_Minh`
- **Daily limit:** `DAILY_POST_LIMIT = 2` — stops posting after 2 successful posts/day
- **State:** In-memory (`lib/store.ts`) — resets on cold start
- **Pause/resume:** via `POST /api/scheduler { action: "pause" | "resume" }`

### 8.2 Auto-Scheduler (`lib/services/auto-scheduler.ts`)

- **Enabled by:** `AUTO_SCHEDULER_ENABLED=true` in `.env`
- **Fixed slots:**
  - `"noon"`: prepare cron `58 11 * * *`, post starts at 12:00
  - `"evening"`: prepare cron `58 17 * * *`, post starts at 18:00
- **Platform order:** Facebook → (2 min) → Threads → (2 min) → Instagram
- **Delay:** `PLATFORM_DELAY_MS = 2 * 60 * 1000` (2 minutes)
- **State:** File-based (`data/auto-post-history.json`) — survives restarts

### 8.3 FB/IG Schedulers

- `lib/services/fb-scheduler.ts` — scheduled Facebook posting
- `lib/services/ig-scheduler.ts` — scheduled Instagram posting
- These are independent and do not interact with the auto-scheduler

### 8.4 Scheduler Rules

1. **Do not use `setInterval` or `setTimeout`** for recurring tasks. Always use `node-cron`.
2. **Always specify `timezone` option** in `cron.schedule({ timezone: TIMEZONE })`.
3. **Logs must use prefix format:** `[AutoScheduler]`, `[Scheduler]`, `[FBScheduler]`, `[IGScheduler]` for easy filtering.
4. **Never block the cron callback** — use `async` functions and handle errors internally.

---

## 9. Platform Services

### 9.1 ThreadsService (`lib/services/threads.service.ts`)

Base URL: `https://graph.threads.net/v1.0`

Key methods:

- `getUser()` — profile
- `createTextContainer(text)` — step 1 of publish flow
- `publishContainer(containerId)` — step 2
- `waitForContainer(containerId)` — polls until FINISHED or timeout (30s)
- `getRecentPosts(limit)` — recent posts
- `getPostInsights(postId)` — engagement metrics
- `getPublishingLimit()` — API quota
- `getTokenInfo()` — token validity, scopes, expiry
- `refreshLongLivedToken()` — extends token

### 9.2 FacebookService (`lib/services/facebook.service.ts`)

Base URL: `https://graph.facebook.com/v25.0`

Key methods:

- `resolvePageId()` — gets scoped page ID (different from global page ID)
- `publishPost(text)` — text post
- `publishPhoto(url, caption)` — photo + caption
- `getPostInsights(postId)` — reach, engagement
- `getPageInsights()` — overall page metrics
- `getComments(postId)` — post comments
- `checkToken()` — token status

**Important:** Always use `resolvePageId()` for post/insights calls. The `FB_PAGE_ID` env var is the global (NPE) ID — many endpoints reject it. The scoped ID is fetched via `GET /me` with the page token and cached on the service instance.

### 9.3 InstagramService (`lib/services/instagram.service.ts`)

Base URL: `https://graph.instagram.com/v25.0`  
Token debug: `https://graph.facebook.com/v25.0` (separate Axios instance)

Key methods:

- `getProfile()` — account info
- `createImageContainer(url, caption)` — step 1 (IMAGE type)
- `waitForContainer(containerId, timeout=60s)` — polls container (longer timeout than Threads)
- `publishContainer(containerId)` — step 2
- `getMediaInsights(mediaId)` — per-post metrics
- `getAccountInsights()` — account-level metrics
- `getPublishingLimit()` — 25-post/24h quota
- `getTokenStatus()` — validity, days left

### 9.4 Service Error Handling

Each service has a custom error class:

- `ThreadsApiError(code, subcode, message, raw?)`
- `FBApiError(code, subcode, message, raw?)`
- `IGApiError(code, subcode, message, raw?)`

**Rule:** Always catch and rethrow using the service's `parseMetaError(err)` helper. Raw Meta API errors must be wrapped before propagating.

---

## 10. State & Data Persistence

### Storage Strategy by Data Type

| Data                   | Storage   | File                               | Notes                           |
| ---------------------- | --------- | ---------------------------------- | ------------------------------- |
| Threads auto-posts     | In-memory | —                                  | Resets on serverless cold start |
| Auto-scheduler history | JSON file | `data/auto-post-history.json`      | Persists across restarts        |
| FB post history        | JSON file | `data/fb-post-history.json`        |                                 |
| IG post history        | JSON file | `data/ig-post-history.json`        |                                 |
| IG image pool          | JSON file | `data/ig-auto-images.json`         | Rotates through images          |
| Threads manual posts   | JSON file | `data/threads-manual-history.json` |                                 |
| AI model config        | JSON file | `data/ai-config.json`              |                                 |

### Store Rules

1. **Cap all JSON history files at 200 records.** Use `records.slice(0, 200)` after unshift.
2. **Always `unshift` new records** (newest first).
3. **In-memory Threads scheduler store** (`lib/store.ts`) is intentional for Vercel compatibility. Accept the tradeoff — document it in comments.
4. **Never write directly to JSON files from components or API routes.** Always use the dedicated store module (`auto-post-store.ts`, `fb-store.ts`, `ig-store.ts`, etc.).
5. **Use `fs.mkdirSync({ recursive: true })`** before writing to ensure `data/` directory exists.

---

## 11. Environment Variables

All variables are documented in `.env.example`. **Never commit `.env` to git.**

### Threads / Meta

| Variable               | Required | Description           |
| ---------------------- | -------- | --------------------- |
| `THREADS_APP_ID`       | Yes      | Meta app ID           |
| `THREADS_APP_SECRET`   | Yes      | Meta app secret       |
| `THREADS_ACCESS_TOKEN` | Yes      | Long-lived user token |
| `THREADS_USER_ID`      | Yes      | Threads user ID       |

### Facebook

| Variable               | Required | Description          |
| ---------------------- | -------- | -------------------- |
| `FB_PAGE_ACCESS_TOKEN` | Yes      | Page access token    |
| `FB_PAGE_ID`           | Yes      | Global page ID (NPE) |
| `FB_APP_ID`            | Optional | For token debug      |
| `FB_APP_SECRET`        | Optional | For token debug      |

### Instagram

| Variable          | Required | Description                          |
| ----------------- | -------- | ------------------------------------ |
| `IG_ACCESS_TOKEN` | Yes      | Instagram long-lived token           |
| `IG_USER_ID`      | Yes      | Instagram user ID                    |
| `IG_APP_ID`       | Optional | Derived from FB_APP_ID if absent     |
| `IG_APP_SECRET`   | Optional | Derived from FB_APP_SECRET if absent |

### AI

| Variable          | Required | Description                              |
| ----------------- | -------- | ---------------------------------------- |
| `OPENAI_API_KEY`  | Optional | Direct OpenAI (not used in primary flow) |
| `OPENAI_MODEL`    | Optional | Default: `gpt-4o-mini`                   |
| `PUTER_API_TOKEN` | Optional | Server-side Puter auth (auto-scheduler)  |

### Scheduler

| Variable                 | Default                           | Description                        |
| ------------------------ | --------------------------------- | ---------------------------------- |
| `SCHEDULER_ENABLED`      | `true`                            | Enable Threads-only auto-scheduler |
| `AUTO_SCHEDULER_ENABLED` | `false`                           | Enable 3-platform auto-scheduler   |
| `CRON_SCHEDULES`         | `noon\|0 12...; evening\|0 18...` | Custom Threads schedule            |
| `TIMEZONE`               | `Asia/Ho_Chi_Minh`                | Cron timezone                      |

### App

| Variable              | Required | Description                                   |
| --------------------- | -------- | --------------------------------------------- |
| `NEXT_PUBLIC_APP_URL` | Yes      | App base URL, used for internal API calls     |
| `CRON_SECRET`         | Yes      | Secret for protecting scheduler API endpoints |

### Environment Variable Rules

1. **All `process.env` access in services must throw a clear error** if a required variable is missing. Example: `if (!t) throw new Error("THREADS_ACCESS_TOKEN chưa cấu hình trong .env")`.
2. **Never access `process.env` in client components.** Use only `NEXT_PUBLIC_` prefixed vars on client.
3. **Never log full tokens or secrets** to console. Log only the first/last 4 characters if needed for debugging.

---

## 12. Coding Conventions

### TypeScript

- **Use strict TypeScript.** `tsconfig.json` has `"strict": true` implied by Next.js defaults.
- **No `any`.** Use `unknown`, then narrow with guards.
- **Prefer interface over type alias** for object shapes. Use `type` for unions, intersections, and primitives.
- **Export types from `types/index.ts`.** Never define domain types locally.
- **Use path alias `@/`** for all non-relative imports. E.g., `import { x } from "@/lib/foo"`.

### File Naming

| Pattern          | Convention               |
| ---------------- | ------------------------ |
| React components | `kebab-case.tsx`         |
| Hooks            | `use-kebab-case.ts`      |
| Services         | `platform.service.ts`    |
| Stores           | `platform-store.ts`      |
| Schedulers       | `platform-scheduler.ts`  |
| Types            | `index.ts` (single file) |
| API routes       | `route.ts` inside folder |

### Import Order

1. External packages (`next`, `react`, `axios`, etc.)
2. Internal `@/types`
3. Internal `@/lib/...`
4. Internal `@/components/...`
5. Internal `@/hooks/...`
6. Relative imports (`./`)

### Comments

- Use `// ─── Section Name ───` comment dividers inside large service files
- Every exported function/class must have a JSDoc comment explaining its purpose
- Vietnamese comments are acceptable in this codebase (personal project)
- Mark deprecated code with `/** @deprecated reason */`

### Async / Await

- Always use `async/await` over `.then()/.catch()` chains
- Use dedicated `sleep` helpers (`const sleep = (ms: number) => new Promise<void>(...)`) — never inline `setTimeout` in async flows

---

## 13. Component Guidelines

### Structure

```
components/
├── dashboard/     # Composite widgets used directly in pages
├── layout/        # Structural chrome (header, nav)
├── platforms/     # Platform-specific feature components
│   ├── facebook/
│   ├── instagram/
│   └── threads/
├── shared/        # Cross-platform reusable components
└── ui/            # Primitive/atomic components
```

### Rules

1. **Client components must have `"use client"` directive** at the top if they use hooks, event handlers, or browser APIs.
2. **Server components by default.** Only add `"use client"` when necessary.
3. **No direct API calls in components.** Use hooks (`hooks/`) or fetch via `useEffect` with error handling.
4. **Tailwind classes only.** Do not write CSS-in-JS or inline `style` objects (except for dynamic computed values).
5. **Use `components/ui/` primitives** for icons (`icons.tsx`), spinners (`spinner.tsx`), and stat cards (`stat-card.tsx`) before creating new UI.
6. **Props must be typed.** All component props interfaces must be defined.
7. **No hardcoded strings for status labels.** Use `STATUS_CONFIG` from `lib/constants.ts`.
8. **No hardcoded topic labels.** Use `TOPIC_LABELS` from `lib/constants.ts`.

### Hooks

- Hooks in `hooks/` are data-fetching + state management only — no rendering.
- Each platform has its own dashboard hook: `use-dashboard.ts` (Threads), `use-facebook-dashboard.ts`, `use-instagram-dashboard.ts`.
- `use-puter-generate.ts` wraps all browser-side AI generation.

---

## 14. Error Handling

### Server-Side (Services)

```typescript
// ✅ Correct
try {
  const result = await someApiCall();
  return result;
} catch (err) {
  throw parseMetaError(err); // wraps into custom error class
}

// ❌ Wrong — swallowing the error
try { ... } catch { return null; }
```

### API Routes

```typescript
// ✅ Correct
try {
  const data = await service.doSomething();
  return Response.json({ data });
} catch (err) {
  const msg = err instanceof Error ? err.message : "Unknown error";
  console.error("[Route] Error:", msg);
  return Response.json({ error: msg }, { status: 500 });
}
```

### Client-Side (Hooks & Components)

- Use `try/catch` around `fetch` calls
- Display user-friendly error messages — not raw API error messages
- Log full error to console for debugging

### Container Polling

When polling container status, always enforce a timeout:

```typescript
// ✅ CONTAINER_POLL_TIMEOUT_MS = 30_000 (Threads) / 60_000 (Instagram)
// Throw an error if container doesn't reach FINISHED within timeout
```

---

## 15. Security Guidelines

1. **API routes that trigger posting must validate `CRON_SECRET`:**

   ```typescript
   const secret = req.headers.get("x-cron-secret");
   if (secret !== process.env.CRON_SECRET) {
     return Response.json({ error: "Unauthorized" }, { status: 401 });
   }
   ```

2. **Never expose tokens in API responses.** Never return `access_token` fields to the client.

3. **No user authentication is needed** — this is a single-user personal tool. Do not add OAuth login flows for the app itself.

4. **Environment variables access:**
   - Server-only vars (tokens, secrets): access only in `app/api/**`, `lib/services/**`, `lib/scheduler.ts`, `instrumentation.ts`
   - Client-safe vars: only `NEXT_PUBLIC_*` variables

5. **Do not log sensitive data.** When debugging tokens, log `token.slice(0,4) + "..."`.

---

## 16. Content & Prompt Guidelines

### Content Niche

All content is about the **"daily juice recipe"** series for Vietnamese women. The tone is conversational, like texting a friend. The content is **NOT** health advice.

### Prohibited Content Patterns

- No bold text markers (`**`, `__`)
- No date/time stamps in the post body
- No words: "detox", "giảm cân" (weight loss), "trị mụn" (acne treatment) in explicit advice form
- No medical terminology
- No section headers / labels like "Nguyên liệu:", "Cách làm:" — blend naturally into prose

### Required Content Elements (embedded naturally)

Every AI-generated post must contain:

1. Name of the juice/drink
2. Taste description
3. Ingredients list (written naturally in sentences, not a bullet list header)
4. Preparation steps
5. Flavor adjustment tip
6. Drinking tip
7. Light CTA (call-to-action invite)

### Length Guidelines

| Platform          | Target character count                        |
| ----------------- | --------------------------------------------- |
| Threads           | 500–800 characters                            |
| Facebook          | 550–850 characters (same prompt)              |
| Instagram caption | Shorter, more visual — pull from same content |

### Topics

Topics are defined exclusively in `lib/topics.ts` as `TopicConfig[]`. Each topic has:

- `id: string` — used as key in history records
- `label: string` — displayed in UI
- `description: string` — injected into the user prompt to guide the AI

**Rule:** To add/edit/remove a topic, only modify `lib/topics.ts`. Constants and types derive from it automatically.

### Prompt Rules

- **System prompts** in `lib/prompts/system.ts` define voice, style, prohibitions
- **User prompts** in `lib/prompts/user.ts` inject topic description and current time
- When adding a new platform, create a corresponding system prompt builder in `system.ts`

---

## 17. Development Workflow

### Setup

```bash
# Install dependencies
bun install

# Copy env file
cp .env.example .env
# Fill in all required tokens

# Run development server
bun run dev
```

### Auth Token Scripts

Helper shell scripts for obtaining and refreshing tokens:

| Script                  | Purpose                       |
| ----------------------- | ----------------------------- |
| `get-token.sh`          | Get initial Threads token     |
| `get-fb-token.sh`       | Get Facebook page token       |
| `get-ig-token.sh`       | Get Instagram token           |
| `get-auth-url.sh`       | Generate OAuth URL            |
| `check-fb-token.sh`     | Check FB token validity       |
| `refresh-all-tokens.sh` | Refresh all long-lived tokens |

### Adding a New Platform

1. Create `lib/services/newplatform.service.ts` with service class + singleton export
2. Add types to `types/index.ts`
3. Create API routes under `app/api/platforms/newplatform/`
4. Create store at `lib/services/newplatform-store.ts` and `data/newplatform-post-history.json`
5. Create components under `components/platforms/newplatform/`
6. Create page at `app/platforms/newplatform/page.tsx`
7. Add navigation entry in `components/layout/platform-nav.tsx`
8. Create hook in `hooks/use-newplatform-dashboard.ts`

### Adding a New Content Topic

1. Open `lib/topics.ts`
2. Add a new `TopicConfig` object to the `TOPICS` array
3. `TOPIC_LABELS` and `ContentTopic` type update automatically
4. No other file changes needed

### Adding a New AI Provider (if needed in future)

1. Create `lib/ai/newprovider/provider.ts` implementing `AIProvider`
2. Create `lib/ai/newprovider/config.ts` with constants
3. Update `lib/ai/provider.ts` `createProvider()` factory
4. Add system prompt variant in `lib/prompts/system.ts`
5. Update `data/ai-config.json` schema and `lib/ai/config.ts`

### Linting & Type Checking

```bash
# Lint
bun run lint

# Type check
bunx tsc --noEmit

# Build (also type-checks)
bun run build
```

### Data Files

The `data/` directory contains JSON persistence files. These should be:

- **Included in `.gitignore`** if they contain post history (privacy)
- **Excluded from lint/type-check** (they're JSON, not TypeScript)
- **Backed up regularly** on production VPS — they are the only persistent state

---

## Appendix: Meta API Quotas & Limits

| Platform                   | Limit                | Notes                           |
| -------------------------- | -------------------- | ------------------------------- |
| Threads                    | 250 posts / 24h      | Per publishing limit API        |
| Instagram                  | 25 posts / 24h       | Hard limit enforced by Meta     |
| Facebook                   | No fixed daily limit | Rate-limited by Graph API calls |
| Container wait (Threads)   | 30s timeout          | `CONTAINER_POLL_TIMEOUT_MS`     |
| Container wait (Instagram) | 60s timeout          | Longer due to media processing  |

---

_Last updated: March 2026. Maintained by project owner._
