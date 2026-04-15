# Skill: Next.js Data Fetching

Guidelines for fetching data in this Next.js 16 project.

## Data Fetching Patterns

### 1. Server Components (Recommended)
Fetch data directly in Server Components:

```typescript
// app/platforms/threads/page.tsx
import { threadsService } from "@/lib/services/threads.service";

export default async function ThreadsPage() {
  const user = await threadsService.getUser();
  const recentPosts = await threadsService.getRecentPosts(10);
  
  return (
    <div>
      <h1>{user.name}</h1>
      {/* render posts */}
    </div>
  );
}
```

### 2. Client Components with Hooks
Use custom hooks for client-side fetching:

```typescript
// hooks/use-dashboard.ts
"use client";

import { useState, useEffect } from "react";

export function useDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    fetch("/api/accounts")
      .then(res => res.json())
      .then(result => {
        setData(result.data);
        setLoading(false);
      });
  }, []);
  
  return { data, loading };
}
```

### 3. API Routes (Backend Logic)
For complex operations, use API routes:

```typescript
// app/api/generate/route.ts
export async function POST(req: NextRequest) {
  const body = await req.json();
  const result = await generateContent(body);
  return NextResponse.json({ success: true, data: result });
}
```

## Project Data Sources

### Platform Services
```typescript
// Threads
const user = await threadsService.getUser();
const posts = await threadsService.getRecentPosts(10);
const insights = await threadsService.getPostInsights(postId);

// Facebook
const page = await facebookService.resolvePageId();
const posts = await facebookService.getPosts();
const insights = await facebookService.getPageInsights();

// Instagram
const profile = await instagramService.getProfile();
const media = await instagramService.getMedia();
const quota = await instagramService.getPublishingLimit();
```

### Content Pool
```typescript
import { readPool, getPoolItemForSlot, importPoolItems } from "@/lib/content-pool";

const pool = readPool();
const item = getPoolItemForSlot(date, slot, accountId);
```

### JSON File Stores
```typescript
// Reading
const history = readHistory();

// Writing  
writeHistory([newRecord, ...history].slice(0, 200));
```

## Caching Strategies

### No Caching (Default)
For real-time data:
```typescript
// Each request fetches fresh data
export const dynamic = 'force-dynamic';
```

### Static Data
For rarely changing data:
```typescript
// Revalidate every hour
export const revalidate = 3600;
```

## Loading & Error States

### Server Components
```typescript
import { Suspense } from "react";
import { PostsList } from "./posts-list";

export default function Page() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <PostsList />
    </Suspense>
  );
}
```

### Client Components
```typescript
const { data, loading, error } = useDashboard();

if (loading) return <Spinner />;
if (error) return <Error message={error} />;
```

## Best Practices

1. **Fetch on server when possible** - Reduces client bundle
2. **Use hooks for client data** - Custom hooks in `hooks/` folder
3. **Handle loading/error states** - Always show feedback
4. **Cap JSON history at 200** - `records.slice(0, 200)`
5. **Never expose tokens** - Fetch on server, return safe data

## Project Hooks

Located in `hooks/`:
- `use-dashboard.ts` - Threads dashboard data
- `use-facebook-dashboard.ts` - Facebook dashboard data
- `use-instagram-dashboard.ts` - Instagram dashboard data
- `use-puter-generate.ts` - AI content generation
- `use-content-pool.ts` - Content pool management
- `use-accounts.ts` - Account management
