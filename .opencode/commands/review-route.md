# Command: Review Route

Analyze a Next.js API route before making changes.

## Usage

```bash
/review-route path=app/api/accounts/route.ts
```

Or describe the route:
```
Review the API route at app/api/accounts/route.ts
```

## What to Inspect

### Route Definition
- What methods are supported (GET, POST, etc.)?
- What is the URL pattern?
- Are there dynamic parameters?

### Request/Response
- What data is expected in request?
- What is the response format?
- What status codes are returned?

### Security
- Is CRON_SECRET validated?
- Are tokens handled securely?
- Any potential security issues?

### Dependencies
- What services are imported?
- What stores are used?
- What types are referenced?

### Error Handling
- How are errors caught?
- What error messages are returned?
- Are errors logged?

## Output Format

```
Route: app/api/accounts/route.ts
URL: /api/accounts
Methods: GET, PATCH

Security:
- No CRON_SECRET needed (not a scheduler endpoint)
- Tokens not exposed in response

Imports:
- @/lib/account-store
- @/lib/content-pool

Response Format:
- GET: { success: true, data: [...] }
- PATCH: { success: true, data: updated } or { success: false, error: "..." }

Error Handling:
- Try-catch blocks
- Returns 400 for missing id
- Returns 404 for not found

Potential Issues: None
```

## Common Patterns

### GET Route
```typescript
export async function GET() {
  const data = getData();
  return NextResponse.json({ success: true, data });
}
```

### POST with Body
```typescript
export async function POST(req: NextRequest) {
  const body = await req.json();
  // validation...
  return NextResponse.json({ success: true, data: result });
}
```

### Protected Route
```typescript
export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-cron-secret");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  // handler...
}
```
