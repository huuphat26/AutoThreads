# Skill: Audit Route

Analyze a Next.js API route or page route before making changes.

## Usage

Use this skill when you need to understand an existing route before modifying it.

## What to Inspect

### Route Hierarchy
- Where is this route located in `app/` directory?
- What layouts does it use?
- What is the URL pattern?

### Server/Client Boundaries
- Is there `"use client"` directive?
- What hooks are used (`useState`, `useEffect`, etc.)?
- Are there server actions or API calls?

### Data Flow
- How does data flow in/out?
- What services are imported from `lib/services/`?
- What is the persistence layer (JSON files)?

### Environment Usage
- What env variables are accessed?
- Are they server-only or client-safe (`NEXT_PUBLIC_`)?

### Implementation Risks
- Are there any obvious issues?
- Is CRON_SECRET validated for scheduler endpoints?
- Any potential security issues (token exposure)?

## Output Format

Provide a summary with:
1. Route location and URL pattern
2. Layout chain
3. Server/client components
4. Key imports and dependencies
5. Data flow
6. Env usage
7. Potential risks or issues

## Example

```
Route: app/api/accounts/route.ts
URL: /api/accounts
Methods: GET, PATCH

Layout: None (API route)
Server/Client: Server-only

Imports:
- @/lib/account-store (getAllAccountsSafe, updateAccount)
- @/lib/content-pool (readPool)

Data Flow:
- GET: reads accounts from store, attaches pendingCount
- PATCH: updates account metadata

Env: None directly (uses store)

Risks: None identified
```
