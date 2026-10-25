---
description: Audita aislamiento de datos y RLS de Supabase con el agente db-security-auditor.
agent: db-security-auditor
---

Audita la seguridad de datos de `$ARGUMENTS` siguiendo estrictamente el flujo del agente `db-security-auditor`.

- Interpreta `$ARGUMENTS` como una tabla, función, flujo o módulo concreto (por ejemplo `public.children`, `invitaciones`, `app/actions/kids.ts`).
- Si está vacío, audita el esquema expuesto completo y la capa de acceso a datos: migraciones, políticas, grants, funciones, Storage y `utils/supabase/*`.
- Recuerda que la auditoría es de solo lectura: no crees migraciones, no edites código y no apliques SQL. Las correcciones se delegan a `@db-migrator` con aprobación explícita.
- Entrega el reporte con severidad, evidencia, remediación y pruebas de aislamiento, y marca explícitamente lo que no pudiste verificar.
