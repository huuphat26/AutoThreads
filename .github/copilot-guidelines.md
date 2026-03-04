# Copilot Guidelines for AutoThreads

When generating code for this project follow these patterns.

## Import Order

1 external packages
2 types
3 lib
4 hooks
5 components
6 relative imports

## File Naming

components: kebab-case.tsx
hooks: use-*.ts
services: *.service.ts
stores: *-store.ts
schedulers: *-scheduler.ts

## Component Rules

Components should:

- stay under 200 lines
- avoid heavy logic
- delegate to hooks

Example:

const { posts, loading } = useDashboard()

## Error Handling

Never swallow errors.

API routes:

return Response.json({ error: message }, { status: 500 })

## Environment Variables

Allowed only in:

services
api routes
scheduler
instrumentation.ts

Never inside client components.

## Golden Rule

Follow existing patterns in the repository.

If unsure:
Search for a similar implementation and mirror the architecture.