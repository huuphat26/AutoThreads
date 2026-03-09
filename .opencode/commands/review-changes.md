# Command: Review Changes

Review the changes made to files in the current session.

## Usage

```bash
/review-changes
```

Or describe:
```
Summarize the changes I made and explain what each change does.
```

## What to Review

### Changed Files
- List all modified files
- Identify the purpose of each change

### Code Quality
- Does code follow project conventions?
- Are types properly defined?
- Is error handling included?

### Security
- Are tokens properly handled?
- Is CRON_SECRET validated where needed?
- Any security concerns?

### Best Practices
- Proper import order?
- Server/Client component correct?
- Tailwind CSS used correctly?

## Output Format

Provide a summary:

### Files Changed
1. `app/api/accounts/route.ts`
2. `components/dashboard/compose-form.tsx`
3. `lib/content-pool.ts`

### Summary per File

**app/api/accounts/route.ts**
- Added PATCH handler for updating account metadata
- Added validation for required `id` field
- Returns 404 if account not found

**components/dashboard/compose-form.tsx**
- Added loading state during submission
- Uses existing `use-dashboard` hook
- Properly handles error states

**lib/content-pool.ts**
- Fixed bug in `getPoolItemForSlot` function
- Added null check for accountId

### Follow-ups Needed
- Run `bun run lint` to verify
- Test the new PATCH endpoint
- Consider adding unit tests

## Validation Steps

After reviewing changes:
1. Run `bun run lint`
2. Run `bun run build`
3. Verify all tests pass (if any)

## Common Issues to Watch

- Missing error handling
- Unused imports
- TypeScript errors
- Security vulnerabilities
- Performance issues
