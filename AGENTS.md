<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Repository
- The application root is this `open-daycare/` directory; run all npm commands from here.
- This is a single Next.js App Router app. The main entrypoints are `app/layout.tsx`, `app/page.tsx`, and `app/globals.css`; there are no other application packages or test suites.
- Use the committed `package-lock.json` with npm (`npm ci` for a clean install).

## Commands
- `npm run dev` starts the development server at `http://localhost:3000`.
- `npm run build` creates the production build; `npm start` serves that build.
- `npx tsc --noEmit` runs the strict TypeScript check; there is no package script for it.
- `npm run lint` currently fails on the legacy reference fixture `references/pantallas/support.js` (`ReactDOM.render` and assignment to `module`). Treat those as fixture issues unless the fixture is intentionally being modernized.

## Structure
- `references/pantallas/` and `references/screenshots/` are design/reference assets, not runtime application code. Keep changes to them separate from app implementation changes.
- The TypeScript alias `@/*` resolves to the app root (`./*`).



## MCPs
- Playwright Screenshot y cualquier cosa relacionada a Playwright tienen que estar en la carpeta de .playwright-mcp.
- Context7 Usaremos este MCP para traer la documentación actualizada del framework.

## Spec Driven Development
- /spec Usaremos esta skill para crear las especificaciones.
- /spec-impl Usaremos este skill para hacer las implementaciones.


## Verificación de specs
- El agente `spec-verifier` verifica las specs contra el estado real del proyecto.
- Comprueba los criterios de aceptación mediante inspección del código, build, TypeScript y Playwright cuando corresponda.
- El comando `/verify-spec` recibe la ruta de una spec como argumento: `/verify-spec specs/01-adaptar-feed-como-home.md`.
- Si no se proporciona una spec, el comando lista las disponibles en `specs/` y solicita una ruta, número o slug exacto.
- También se puede invocar directamente con `@spec-verifier` indicando la ruta de la spec.
- Los artefactos de Playwright se guardan exclusivamente en `.playwright-mcp/`.
- Después de verificar, marca con `[X]` únicamente los criterios confirmados y deja `[ ]` los no verificados o fallidos.

## Reglas de código
- Usar código limpio, nombres, funciones, variables en inglés

##
