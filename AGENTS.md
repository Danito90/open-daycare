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

## Migraciones de base de datos
- El agente `db-migrator` (`.opencode/agent/db-migrator.md`) diagnostica, crea y aplica las migraciones versionadas, y mantiene `supabase/migrations/` sincronizado con el proyecto remoto.
- Se invoca con `@db-migrator` indicando una spec, un cambio de esquema o una instrucción de puesta al día.
- Solo escribe mediante migraciones creadas con la CLI; nunca aplica DDL directo al proyecto remoto ni edita migraciones ya aplicadas.
- Antes de aplicar al remoto muestra la lista exacta con `supabase db push --dry-run` y solicita aprobación explícita.

## Auditoría de seguridad de datos
- El agente `db-security-auditor` (`.opencode/agent/db-security-auditor.md`) audita fugas de datos entre niños, padres y guarderías: RLS, roles, grants, políticas, funciones `SECURITY DEFINER`, Storage y la capa de acceso a datos.
- Se invoca con `@db-security-auditor` o con el comando `/db-security-audit <alcance>`; sin argumento audita el esquema expuesto completo.
- Es de solo lectura: no crea migraciones, no edita código y no aplica SQL. Las pruebas de aislamiento se ejecutan con roles simulados dentro de transacciones que siempre terminan en `rollback`.
- Usa el MCP de Supabase para inspección y `get_advisors`, y Context7 para validar las reglas vigentes antes de concluir.
- Las correcciones se implementan después con `@db-migrator` a partir de la remediación propuesta, con aprobación explícita antes de tocar el remoto.
- Una auditoría no certifica la seguridad global de la aplicación; solo el alcance revisado.

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

## Accesibilidad
- El agente `accessibility-checker` (`.opencode/agent/accessibility-checker.md`) audita y corrige accesibilidad WCAG 2.2 nivel AA en los archivos indicados.
- Se invoca con `@accessibility-checker` indicando archivos, rutas o globs, o con el comando `/a11y-check <ruta>`. Si no se indican archivos, pregunta cuáles revisar; nunca audita el repositorio completo por iniciativa propia.
- Valida cada criterio con Context7 (WCAG 2.2 de W3C) y verifica en navegador real con Playwright y `axe-core`, que ya viene en `node_modules`; no agrega dependencias.
- Puede corregir código, pero pregunta antes de cambios que alteren comportamiento, identidad visual o estructura de componentes compartidos.
- Los artefactos de Playwright y los scripts temporales se guardan exclusivamente en `.playwright-mcp/`.
- Auditar archivos concretos no certifica la conformidad AA de toda la aplicación.

## Reglas de código
- Usar código limpio, nombres, funciones, variables en inglés
