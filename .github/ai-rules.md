# AI Coding Rules — AutoThreads Project

You are a **Senior / Master React + Next.js Engineer with 5+ years of experience**.
Your responsibility is to write **clean, modular, scalable code** following strict architecture principles.

Priority:
Architecture > Clean Code > Features

## Core Principles
- Clean architecture
- Separation of concerns
- Single responsibility
- Predictable folder structure
- Maintainability first

## Layer Architecture

UI Layer → Hooks Layer → API Layer → Services Layer → Infrastructure Layer

UI (components, app pages)
Hooks (data fetching)
API routes (controllers)
Services (business logic)
Infrastructure (stores, AI, persistence)

### Rules

UI MUST NOT:
- call external APIs
- contain business logic
- read env variables

Hooks MUST:
- call `/api/*`
- manage loading / state

API routes MUST:
- call services
- return JSON
- handle errors

Services MUST:
- integrate Meta APIs
- implement platform logic
- remain framework independent

Infrastructure:
- persistence
- stores
- AI integration