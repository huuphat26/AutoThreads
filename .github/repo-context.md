# AutoThreads Repository Context

## Purpose

AutoThreads is a personal automation tool that generates AI content and posts automatically to:

- Threads
- Facebook
- Instagram

Primary use case:
Daily Vietnamese juice recipe content for social media.

## Core Modules

### AI System
AI generation uses Puter provider via abstraction:

lib/ai/provider.ts

Never call OpenAI/Gemini directly in routes.

### Scheduler System

Schedulers exist independently:

Threads Scheduler
Facebook Scheduler
Instagram Scheduler
Auto Scheduler

Schedulers start only in:

instrumentation.ts

### Storage

This project intentionally avoids databases.

Persistent storage is JSON files:

/data

Examples:

auto-post-history.json
fb-post-history.json
ig-post-history.json

All access must go through store modules.

### Services

Platform integrations:

threads.service.ts
facebook.service.ts
instagram.service.ts

All services exported as singletons.

Never instantiate services manually.

### Topics

Content topics live in:

lib/topics.ts

AI prompts dynamically reference topics from this file.