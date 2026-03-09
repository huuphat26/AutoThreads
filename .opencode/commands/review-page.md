# Command: Review Page

Analyze a Next.js page before making changes.

## Usage

```bash
/review-page path=app/platforms/threads/page.tsx
```

Or describe the page:
```
Review the page at app/platforms/threads/page.tsx
```

## What to Inspect

### Route Structure
- Where is the page located?
- What is the URL pattern?
- What layouts does it use?

### Component Analysis
- Server or Client Component?
- What hooks are used?
- What child components are rendered?

### Data Flow
- How is data fetched?
- Are there API calls?
- What services are used?

### Dependencies
- What components are imported?
- What hooks are used?
- What services are called?

### Styling
- What Tailwind classes are used?
- Are there custom styles?

## Output Format

Provide a summary with:

1. **Route**: URL path and file location
2. **Component Type**: Server/Client
3. **Data Fetching**: How data flows
4. **Key Dependencies**: Imports and services
5. **Styling**: Tailwind patterns used
6. **Potential Issues**: Any concerns

## Example

```
Page: app/platforms/threads/page.tsx
URL: /platforms/threads

Type: Client Component ("use client")

Imports:
- components/platforms/threads/monitor.tsx
- components/dashboard/threads-posts-list.tsx
- hooks/use-dashboard.ts

Data Flow:
- use-dashboard hook fetches account data
- Renders monitor and posts-list components

Styling:
- Tailwind classes throughout
- No custom CSS

Issues: None identified
```
