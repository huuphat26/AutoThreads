# Skill: Next.js Bug Triage

Guidelines for debugging and fixing bugs in this Next.js 16 project.

## Bug Investigation Steps

### 1. Identify the Error Type

**Client Errors (Browser)**
- Check browser console (F12)
- Look for React error boundaries
- Check network tab for failed API calls

**Server Errors (Console)**
- Check terminal output
- Look for stack traces
- Check `data/` JSON files for corruption

**API Errors**
- Check API response format
- Look for `success: false` with error messages

### 2. Common Issues

#### Token Expiration
```
Error: "Invalid OAuth access token"
```
- Check `.env` tokens
- Use refresh scripts: `refresh-all-tokens.sh`

#### JSON File Corruption
```
Error: "Unexpected token"
```
- Check `data/*.json` files for valid JSON
- Look for truncated files

#### Scheduler Not Running
```
Cron not firing
```
- Check `SCHEDULER_ENABLED=true` in `.env`
- Verify `instrumentation.ts` is correct
- Check global guard: `__schedulerStarted`

#### Container Timeout
```
Error: "Container timeout"
```
- Threads: 30s timeout
- Instagram: 60s timeout
- Check Meta API status

### 3. Debug Logging

Add prefix to logs:
```typescript
console.log("[Scheduler] Starting job");
console.log("[Accounts] Fetched:", accounts.length);
console.error("[API] Error:", error.message);
```

Never log:
- Full tokens (use `token.slice(0,4) + "..."`)
- Passwords or secrets

### 4. API Response Debugging

Check response format:
```typescript
// Should always be:
{ success: true, data: ... }
// or
{ success: false, error: "..." }
```

Verify CRON_SECRET:
```typescript
const secret = req.headers.get("x-cron-secret");
if (secret !== process.env.CRON_SECRET) {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}
```

### 5. Service Debugging

Check service singleton usage:
```typescript
// ✅ Correct - use singleton
import { threadsService } from "@/lib/services/threads.service";
const user = await threadsService.getUser();

// ❌ Wrong - instantiate directly
import { ThreadsService } from "...";
const service = new ThreadsService();
```

### 6. Component Debugging

Check `"use client"`:
```typescript
// Server component - no hooks
export default function Page() { ... }

// Client component - has hooks
"use client";
export function Form() {
  const [state, setState] = useState();
  // ...
}
```

## Debug Commands

### Check Server Logs
```bash
bun run dev
# Look for [prefix] logs
```

### Lint Check
```bash
bun run lint
```

### Type Check
```bash
bunx tsc --noEmit
```

### Build Check
```bash
bun run build
```

## Error Patterns

### "Cannot read property of undefined"
- Check if data exists before accessing
- Add null checks
- Use optional chaining: `data?.property`

### "Function is not defined"
- Check import path
- Verify export/import match
- Check circular dependencies

### "Async function called without await"
- Add `await` to async calls
- Check function is marked `async`

### "JSON parse error"
- Check `data/*.json` files
- Verify file is valid JSON
- Check for trailing commas

## Quick Fixes

### Fix: Restart Dev Server
```bash
# Ctrl+C to stop
bun run dev
```

### Fix: Clear .next Cache
```bash
rm -rf .next
bun run dev
```

### Fix: Reset Data Files
```bash
# Backup first
cp data/post-history.json data/post-history.json.bak
# Reset to empty
echo '[]' > data/post-history.json
```

### Fix: Check Env Variables
```bash
# List required vars
cat .env | grep -E "^(THREADS|FB|IG|CRON)"
```
