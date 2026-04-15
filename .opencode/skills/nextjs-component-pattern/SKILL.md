# Skill: Next.js Component Pattern

Guidelines for creating React components in this Next.js 16 project.

## Component Location

- **Page components**: `app/platforms/*/page.tsx`
- **Shared components**: `components/shared/`
- **UI primitives**: `components/ui/`
- **Platform-specific**: `components/platforms/facebook/`, `components/platforms/instagram/`, `components/platforms/threads/`

## Server vs Client Components

### Server Components (Default)
```typescript
// app/platforms/threads/page.tsx
export default function ThreadsPage() {
  return <div>Server rendered</div>;
}
```

### Client Components
Add `"use client"` when using:
- `useState`, `useEffect`, `useRef`
- Event handlers (`onClick`, `onChange`)
- Browser APIs
- Other React hooks

```typescript
// components/dashboard/compose-form.tsx
"use client";

import { useState } from "react";

export function ComposeForm() {
  const [text, setText] = useState("");
  // ...
}
```

## Component Structure

### Naming
- Files: kebab-case (`compose-form.tsx`, `post-card.tsx`)
- Components: PascalCase (export default or named export)

### Props
Always define prop types:
```typescript
interface PostCardProps {
  post: Post;
  onDelete?: (id: string) => void;
}

export function PostCard({ post, onDelete }: PostCardProps) {
  // ...
}
```

## Project Patterns

### Dashboard Components
Located in `components/dashboard/`:
- `compose-form.tsx` - Post composition form
- `post-card.tsx` - Post display card
- `history-list.tsx` - Post history list
- `schedule-grid.tsx` - Schedule display

### Platform Monitors
Located in `components/platforms/*/`:
- `monitor.tsx` - Platform status monitor
- `posts-list.tsx` - Platform posts list
- `compose-form.tsx` - Platform-specific compose

### UI Primitives
Located in `components/ui/`:
- `icons.tsx` - Icon components
- `spinner.tsx` - Loading spinner
- `stat-card.tsx` - Statistics card

## Styling

Use Tailwind CSS only - no CSS-in-JS or inline styles:
```typescript
<div className="flex items-center gap-4 p-4">
  <span className="text-sm text-gray-500">{label}</span>
</div>
```

## Best Practices

1. **Minimize client components** - Keep most components server-rendered
2. **Colocate related code** - Keep component with its hooks/types
3. **Extract reusable logic** - Use custom hooks in `hooks/`
4. **Use existing primitives** - Check `components/ui/` first
5. **No hardcoded strings** - Use constants from `lib/constants.ts`
