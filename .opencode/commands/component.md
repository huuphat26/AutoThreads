# Command: Component

Create a new React component in the project.

## Component Locations

| Type | Location |
|------|----------|
| Page components | `app/platforms/*/page.tsx` |
| Dashboard | `components/dashboard/` |
| Platform-specific | `components/platforms/{facebook,instagram,threads}/` |
| Shared | `components/shared/` |
| UI primitives | `components/ui/` |

## Template

```typescript
"use client"; // Only if using hooks

interface ComponentNameProps {
  // Define props
}

export function ComponentName({ prop1, prop2 }: ComponentNameProps) {
  return (
    <div className="...">
      {/* Content */}
    </div>
  );
}
```

## Steps

1. **Choose location** based on component type
2. **Follow naming**: kebab-case file, PascalCase component
3. **Define props interface** with TypeScript
4. **Use Tailwind CSS** for styling
5. **Add `"use client"`** only if using hooks
6. **Export properly**: named export preferred

## Example

Creating `components/dashboard/new-feature.tsx`:

```typescript
"use client";

import { useState } from "react";

interface NewFeatureProps {
  initialValue?: string;
}

export function NewFeature({ initialValue = "" }: NewFeatureProps) {
  const [value, setValue] = useState(initialValue);

  return (
    <div className="p-4 border rounded-lg">
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="w-full p-2 border"
      />
    </div>
  );
}
```

## Validation

After creating:
1. Run `bun run lint` to check
2. Verify component renders correctly
