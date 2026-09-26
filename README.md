# Singgah

Stories Make Places Brighter.

Sprint 0 foundation only: Next.js App Router, TypeScript, Tailwind CSS and ESLint.
The landing screen is a temporary development placeholder, not the product homepage.

## Development

Use Node.js 24.x and npm. Install locked dependencies with `npm ci`, then run
`npm run dev` and open http://localhost:3000.

Validation commands:

```text
npm run lint
npm run typecheck
npm run build
npm start
```

The bootstrap session used bundled Node.js and workspace-local npm; no system-wide
software was installed. npm is a development tool, not an application dependency.

## Configuration

No environment variables are required to run the placeholder. `.env.example`
documents future hosted Supabase settings. When needed, copy it to `.env.local`
and provide values from the development project. Never commit secrets. Never put
privileged Supabase keys in variables beginning with `NEXT_PUBLIC_`.

No local PostgreSQL, Docker, Supabase stack, authentication or database schema is
configured. No deployment has been performed.

## Structure

```text
src/app/          App Router layout, placeholder page and global design tokens
```

The `@/*` alias resolves to `src/*`. Using `src` separates application code from
root-level tooling. Add `src/components`, `src/lib`, `src/types` and `public` only
when real shared components, utilities, types or assets need them. shadcn/ui and
Supabase clients will be introduced when a feature requires them.

## Brand tokens

Tokens live in `src/app/globals.css` and expose Tailwind color utilities:

| Token | Color |
| --- | --- |
| Hutan | #1B3D2E |
| Terracotta | #C26A4A |
| Rembulan | #E9D7B7 |
| Emas | #B7904F |

The placeholder uses system fonts, avoiding build-time font downloads. It is
marked noindex; revisit metadata when public product pages are ready.

Sprint 1 requires approval before product or database work begins.

## Tooling compatibility

ESLint is pinned to 9.39.5 because the React plugin supplied by the current
Next.js ESLint config fails under ESLint 10. npm marks ESLint 9 deprecated;
upgrade when the Next.js lint plugin chain supports ESLint 10. No lint rules
are disabled to hide this incompatibility.
