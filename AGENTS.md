<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Code Style (Enforced by Biome)

### ES6+ Syntax

- Prefer arrow functions: `const handler = () => {}`. Do not use `function` declarations; class methods are allowed.
- Prefer `const`; never use `var`.
- Use template literals for string interpolation instead of concatenation.
- Use strict equality (`===` / `!==`), never `==` / `!=`.

### Imports

- Use `@/` for imports from `src/` (`@/*` maps to `./src/*`).
- Omit `.js` extensions from TypeScript imports.
- Let Biome organize imports.
- Follow Biome formatting: double-quoted strings and semicolons only when required.

### Formatting

- Indent with 2 spaces.
- Keep lines within 100 characters where practical.
- Use trailing commas where supported by the formatter.

### Styling

- Use Tailwind `className` for static styles instead of inline `style` props.
- Inline styles are acceptable for runtime-computed values only; keep static styles in classes.

## Tooling

- Run `pnpm lint` for Biome and Oxlint checks.
- Run `pnpm typecheck` for TypeScript checks.
- Biome configuration: [`biome.json`](./biome.json).

## Commit Rule

- Do not commit directly. Present changes for review and wait for approval before committing.
