# Command: Test

Run tests for the project.

## Usage

```bash
# All tests
bun test

# Single file (if using Vitest)
bun vitest run <file-path>

# With coverage
bun vitest run --coverage
```

## Project Status

Currently, **no test framework is configured**.

To add tests:
1. Install Vitest: `bun add -D vitest`
2. Configure `vitest.config.ts`
3. Create test files alongside source: `lib/foo.ts` → `lib/foo.test.ts`

## Test Patterns

```typescript
// lib/foo.test.ts
import { describe, it, expect } from "vitest";
import { someFunction } from "./foo";

describe("someFunction", () => {
  it("should return expected result", () => {
    expect(someFunction(input)).toBe(expected);
  });
});
```

## Best Practices

- Test business logic in `lib/`
- Test API routes with request/response mocking
- Keep tests simple and focused
- Aim for meaningful coverage, not 100%
