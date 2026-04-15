# AutoThreads

Social media automation platform for posting AI-generated "daily juice recipe" content to Threads, Facebook, and Instagram.

## Features

- **Auto Scheduler**: 3-platform posting (FB → Threads → IG) at 12:00 & 18:00
- **Threads-only Scheduler**: Standalone scheduler with configurable times
- **Manual Posting**: Compose and post from dashboard
- **AI Content Generation**: Puter.js for Vietnamese juice recipe content
- **Post History**: Track all posts with engagement metrics

## Quick Start

```bash
# Install dependencies
bun install

# Copy environment file
cp .env.example .env

# Start development server
bun run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Project Structure

```
app/                    # Next.js App Router
├── api/               # API routes
├── platforms/         # UI pages per platform
lib/                   # Business logic
├── services/          # Platform API services
├── ai/                # AI provider layer
├── prompts/           # AI prompts
types/                 # TypeScript interfaces
data/                  # JSON persistence
```

## Commands

| Command | Description |
|---------|-------------|
| `bun run dev` | Development server |
| `bun run build` | Production build |
| `bun run lint` | ESLint |
| `bunx tsc --noEmit` | Type check |

## Documentation

- [AGENTS.md](./AGENTS.md) - AI agent guidelines
- [docs/architecture.md](./docs/architecture.md) - System architecture
- [docs/domain-rules.md](./docs/domain-rules.md) - Business rules

## Tech Stack

- Next.js 16.1.6 (App Router)
- TypeScript (strict)
- Tailwind CSS 4
- Puter AI (primary), OpenAI/Gemini (optional)
