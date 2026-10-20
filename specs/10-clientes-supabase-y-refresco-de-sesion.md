# SPEC 10 — Clientes Supabase y refresco de sesión

> **Estado:** Implementado
> **Fecha:** 2026-10-20
> **Objetivo:** Incorporar clientes Supabase para navegador y servidor y refrescar sus sesiones mediante el proxy de Next.js sin cambiar las pantallas existentes.

## Alcance

**Incluye:**

- Instalar `@supabase/supabase-js` y `@supabase/ssr` con versiones fijadas y actualizar `package-lock.json`.
- Documentar `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` en `.env-template` y configurar sus valores proporcionados en `.env.local`, que permanece fuera de Git.
- Crear `utils/supabase/client.ts`, `utils/supabase/server.ts` y `utils/supabase/middleware.ts` para clientes de navegador, servidor y refresco de sesión.
- Registrar el refresco en `proxy.ts`, la convención de Next.js 16, para las rutas de la aplicación salvo recursos estáticos.
- Invocar Auth durante la petición para activar la renovación cuando sea necesaria y propagar las cookies y cabeceras resultantes.
- Verificar la integración sin alterar el feed ni presuponer que existe la tabla `todos`.

**Fuera de alcance (para futuras specs):**

- Sustituir el feed de `/` por el listado `todos` del ejemplo o añadir otra página de consulta.
- Conectar el login o la activación existentes a Supabase Auth, crear cuentas, proteger rutas o añadir redirecciones de autenticación.
- Crear o modificar tablas, políticas RLS, migraciones o datos en la base de datos.
- Instalar `supabase/agent-skills`, ya que el proyecto dispone de skills Supabase.

## Modelo de datos

Esta spec no introduce tablas ni estructuras persistentes nuevas. Usa estas variables de configuración:

| Variable | Uso |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | URL pública del proyecto Supabase proporcionado. |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Clave publicable para los clientes de navegador y servidor. |

La sesión se conserva mediante las cookies gestionadas por `@supabase/ssr`. No se añade una clave secreta ni `service_role` al código cliente.

## Plan de implementación

1. Instalar ambas dependencias con versiones fijadas desde la raíz del proyecto y conservar el cambio correspondiente en `package-lock.json`.
2. Añadir las dos variables a `.env-template` y configurar `.env.local` con los valores facilitados, comprobando que este último sigue ignorado por Git.
3. Crear `utils/supabase/client.ts` con `createBrowserClient` y `utils/supabase/server.ts` con `createServerClient`, usando `await cookies()` y un cliente servidor nuevo por petición.
4. Crear `utils/supabase/middleware.ts` para actualizar cookies de la petición y de la respuesta, conservar las opciones y cabeceras emitidas por Supabase e invocar `auth.getClaims()` antes de devolver la respuesta.
5. Crear `proxy.ts` como entrada del framework y configurar el matcher para incluir páginas y handlers de la aplicación y excluir `_next`, imágenes y otros archivos estáticos; no añadir reglas de autorización ni redirecciones.
6. Comprobar que los helpers se pueden importar, que la aplicación compila y que `/` conserva el feed; verificar la renovación con una sesión de prueba controlada si está disponible.

## Criterios de aceptación

- [X] `package.json` contiene `@supabase/supabase-js` y `@supabase/ssr` con versiones fijadas y `package-lock.json` refleja su instalación.
- [X] `.env-template` documenta ambas variables públicas; `.env.local` contiene los valores proporcionados y no está bajo seguimiento de Git.
- [X] Los clientes de navegador y servidor se crean mediante `@supabase/ssr`, leen la misma configuración y el cliente servidor usa las cookies de la petición.
- [X] Existe `proxy.ts` en la raíz; se ejecuta en rutas de la aplicación y no en recursos estáticos excluidos por su matcher.
- [X] El proxy invoca Auth antes de devolver la respuesta y transmite las cookies, sus opciones y las cabeceras de refresco sin perderlas al reconstruir la respuesta.
- [X] La ruta `/` sigue mostrando el feed y no consulta `todos`; login y activación mantienen su comportamiento simulado.
- [X] `npm run build` y `npx tsc --noEmit` finalizan correctamente con la configuración local.
- [ ] Una prueba con sesión controlada confirma que un token renovable produce cookies actualizadas utilizables en la siguiente petición. Si no hay una cuenta de prueba disponible, este criterio permanece sin marcar; compilar o inspeccionar código no lo sustituye.

## Decisiones tomadas y descartadas

- **Sí:** Usar `proxy.ts` como entrada de Next.js 16 y conservar `utils/supabase/middleware.ts` únicamente como helper. Un archivo raíz `middleware.ts` ya no es la convención vigente.
- **No:** Copiar literalmente el `page.tsx` de ejemplo. Reemplazaría el feed actual y supondría la existencia y accesibilidad de `todos`.
- **Sí:** Invocar `auth.getClaims()` durante la petición. Crear el cliente y devolver `NextResponse.next()` sin una llamada de Auth no garantiza el refresco.
- **Sí:** Mantener los formularios simulados y no proteger rutas. Esta spec prepara infraestructura, no implementa autenticación real.
- **Sí:** Documentar las variables en `.env-template` y conservar `.env.local` ignorado. La clave publicable puede usarse en el navegador; ninguna clave secreta debe exponerse.
- **No:** Instalar las skills opcionales de Supabase. Ya existen instrucciones Supabase en `.agents/skills/`.

## Riesgos

| Riesgo | Mitigación |
| --- | --- |
| El ejemplo de proxy devuelve la respuesta antes de provocar el refresco de sesión. | Invocar Auth antes de devolverla y verificar la propagación de cookies y cabeceras. |
| El login simulado no genera sesiones reales para una prueba de renovación. | Usar solo una sesión de prueba controlada si existe; dejar abierto el criterio de renovación autenticada en caso contrario. |
| El proxy puede ejecutarse innecesariamente sobre recursos estáticos o perder cookies al reconstruir la respuesta. | Definir un matcher explícito y comprobar tanto sus exclusiones como la persistencia de las cookies entre peticiones. |

## Lo que **no** está incluido en esta spec

- Consultas a `todos`, cambios visibles en el feed o nuevas páginas.
- Autenticación real, alta de cuentas, protección de rutas o cambios de base de datos.
- Instalación de skills opcionales.
