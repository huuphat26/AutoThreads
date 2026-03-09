# Command: Lint

Run ESLint on the codebase to check for code quality issues.

## Usage

```bash
bun run lint
```

## For Single File

```bash
npx eslint <file-path>
```

## Common Issues

- Fix ESLint errors before committing
- Run `bun run lint` after every code change
- Check `.eslintrc` configuration in project root

## Next Steps

After linting, also run:
- `bun run build` to verify no build errors
- `bunx tsc --noEmit` for type checking
