# Skill: Next.js Route Handler

Guidelines for creating API routes in this Next.js 16 project.

## Route Location

All API routes go in `app/api/`:
```
app/api/
├── accounts/route.ts
├── ai-config/route.ts
├── auto-scheduler/route.ts
├── content-pool/route.ts
├── generate/route.ts
├── history/route.ts
├── post/route.ts
├── platforms/
│   ├── facebook/
│   ├── instagram/
│   └── threads/
├── scheduler/route.ts
├── threads/
└── upload-image/route.ts
```

## Route Handler Pattern

### Basic Structure
```typescript
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    // Implementation
    return NextResponse.json({ success: true, data: result });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "Error" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  // Same pattern
}
```

### Supported Methods
- `GET`, `POST`, `PUT`, `PATCH`, `DELETE`, `HEAD`, `OPTIONS`

### Dynamic Routes
```typescript
// app/api/post/[postId]/route.ts
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ postId: string }> }
) {
  const { postId } = await params;
  // ...
}
```

## Response Format

Always return consistent JSON:
```typescript
// Success
{ success: true, data: <result> }

// Error
{ success: false, error: "Error message" }
```

## Security

### CRON_SECRET Validation
For scheduler/cron endpoints:
```typescript
export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-cron-secret");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  // ... handler
}
```

### Never Expose Tokens
```typescript
// ❌ Wrong - exposes token
return NextResponse.json({ token: accessToken });

// ✅ Correct - never return tokens
return NextResponse.json({ success: true, data: { id, name } });
```

## Import Patterns

### Service Singletons
```typescript
import { threadsService } from "@/lib/services/threads.service";
import { facebookService } from "@/lib/services/facebook.service";
import { instagramService } from "@/lib/services/instagram.service";
```

### Stores
```typescript
import { readPool, importPoolItems } from "@/lib/content-pool";
import { getAllAccountsSafe, updateAccount } from "@/lib/account-store";
```

### Types
```typescript
import type { PostHistory, ContentPoolItem } from "@/types";
```

### Import Order
1. External (`next`, `react`, `axios`)
2. Types (`@/types`)
3. Lib services (`@/lib/...`)
4. Relative (`./`)

## Error Handling

```typescript
// Services throw custom errors
catch (err) {
  // Log with prefix
  console.error("[Accounts] Error:", err.message);
  
  return NextResponse.json(
    { success: false, error: err instanceof Error ? err.message : "Unknown" },
    { status: 500 }
  );
}
```

## Validation

After creating route:
```bash
bun run lint
```

## Examples

### GET Route
```typescript
export async function GET() {
  const accounts = getAllAccountsSafe();
  return NextResponse.json({ success: true, data: accounts });
}
```

### POST Route with Body
```typescript
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, ...data } = body;
    
    const updated = updateAccount(id, data);
    if (!updated) {
      return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
    }
    
    return NextResponse.json({ success: true, data: updated });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "Error" },
      { status: 500 }
    );
  }
}
```
