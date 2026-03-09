# Skill: Add Route Handler

Add a new API route handler to the Next.js application.

## Usage

Use this skill to create a new API route in `app/api/`.

## Steps

### 1. Determine Route Location
- Create folder under `app/api/<category>/`
- Name the file `route.ts` for standard routes
- Use `[param]/route.ts` for dynamic routes

### 2. Follow API Route Pattern

```typescript
import { NextRequest, NextResponse } from "next/server";

// GET, POST, PUT, DELETE, PATCH exports
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
```

### 3. Import Services Correctly

```typescript
// Use singletons from lib/services/
import { threadsService } from "@/lib/services/threads.service";
import { facebookService } from "@/lib/services/facebook.service";
import { instagramService } from "@/lib/services/instagram.service";

// Use stores for persistence
import { readStore, writeStore } from "@/lib/services/store-name";

// Use types from @/types
import type { SomeType } from "@/types";
```

### 4. Security Requirements

- **Scheduler endpoints**: Validate CRON_SECRET
```typescript
const secret = req.headers.get("x-cron-secret");
if (secret !== process.env.CRON_SECRET) {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}
```

- **Never expose tokens** in response

### 5. Import Order

1. External packages (`next`, `react`, `axios`)
2. Internal `@/types`
3. Internal `@/lib/...`
4. Relative imports

## Validation

After creating the route:
1. Run `bun run lint` to check
2. Verify response format matches `{ success: true, data: ... }` or `{ success: false, error: ... }`

## Example

Creating `app/api/platforms/newplatform/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { newplatformService } from "@/lib/services/newplatform.service";

export async function GET(req: NextRequest) {
  try {
    const data = await newplatformService.getData();
    return NextResponse.json({ success: true, data });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "Error" },
      { status: 500 }
    );
  }
}
```
