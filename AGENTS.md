<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

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
- `npm run lint` passes; `references/**` and `.playwright-mcp/**` are ignored because they hold design fixtures and Playwright artifacts, not runtime code.

## Structure
- `references/pantallas/` and `references/screenshots/` are design/reference assets, not runtime application code. Keep changes to them separate from app implementation changes.
- The TypeScript alias `@/*` resolves to the app root (`./*`).
- `../07-DB-Schema` (referencia `docs` en `opencode.json`) describe tablas, columnas y relaciones previstas; no representa el estado implementado de la base de datos.

## MCPs
- Playwright Screenshot y cualquier cosa relacionada a Playwright tienen que estar en la carpeta de .playwright-mcp.
- Context7 Usaremos este MCP para traer la documentación actualizada del framework.
- Supabase MCP permite consultar documentación, inspeccionar el proyecto y ejecutar operaciones de base de datos. Antes de modificar el esquema, inspecciona las tablas existentes; para DDL usa migraciones y para diagnósticos consulta logs y avisos de seguridad/rendimiento.

## Supabase
- El proyecto aún no incluye clientes de Supabase en `package.json` ni un esquema local implementado en este repositorio. No asumir que el esquema de referencia ya existe en la base de datos: comprobar el estado real antes de implementarlo.
- `.env-template` documenta `SUPABASE_DB_PASSWORD`; mantener contraseñas y claves secretas fuera del repositorio y del código cliente. Para integraciones públicas usar claves publicables, nunca `service_role`.
- Priorizar desarrollo y pruebas locales antes de aplicar cambios al proyecto remoto. Habilitar RLS y definir políticas acordes al modelo de acceso para tablas expuestas mediante la API.
- Todo cambio persistente en la base de datos, incluido esquema, políticas RLS, funciones y datos iniciales, debe quedar registrado en un archivo de migración versionado dentro de `supabase/migrations/`. Crear las migraciones mediante la CLI de Supabase, verificar el destino y el historial antes de aplicarlas al proyecto remoto, y comprobar su resultado después. Preferir pruebas locales cuando estén disponibles; no son requisito si la spec acuerda un despliegue directo en remoto. No efectuar estos cambios mediante SQL directo en el proyecto remoto. Las consultas de solo lectura para inspección y diagnóstico no requieren migración.

## Skills instaladas
- `.agents/skills/supabase/SKILL.md`: cargar para tareas de Supabase (Auth, Database, Storage, Edge Functions, CLI, MCP, integración o diagnóstico). Consultar la documentación vigente antes de implementar y verificar los cambios.
- `.agents/skills/supabase-postgres-best-practices/SKILL.md`: cargar antes de diseñar o cambiar esquemas, migraciones, SQL, políticas RLS, índices, funciones o datos en Postgres; también al diagnosticar rendimiento, bloqueos o visibilidad de filas.

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
