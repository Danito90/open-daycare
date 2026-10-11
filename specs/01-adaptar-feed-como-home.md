# SPEC 01 — Adaptar el feed como home

> **Status:** Implementado
> **Depends on:** Ninguna
> **Date:** 2026-10-03
> **Objective:** Adaptar la referencia `open-daycare/references/pantallas/feed.dc.html` como la pantalla home `/` de OpenDayCare, manteniendo su apariencia visual y agregando una navegación móvil con menú de hamburguesa.

## Scope

**In:**

- Reemplazar la pantalla inicial de Next.js por el feed estático de la referencia en la ruta `/`.
- Mantener el contenido visible de la referencia, incluidos textos, nombres, fecha, publicaciones, contadores, colores, espaciados, iconografía y tipografías `Fredoka` y `Nunito`.
- Mantener la navegación lateral de escritorio con las opciones visibles en la referencia.
- Adaptar el layout para móvil mediante un botón de menú de hamburguesa.
- Hacer que el menú móvil abra y cierre un panel lateral superpuesto.
- Permitir cerrar el panel mediante el botón de cierre, una opción de navegación o el fondo exterior.
- Usar exclusivamente contenido estático en memoria.
- Actualizar metadatos y estilos globales para que correspondan con OpenDayCare.

**Out of scope (for future specs):**

- Autenticación, cierre de sesión real o control de permisos.
- Base de datos, API, persistencia o carga dinámica de publicaciones.
- Crear las rutas de destino de Feed, Niños, Avisos, Mi cuenta, Nueva publicación, detalle de publicación y foto.
- Funcionalidad real para likes, comentarios, edición, publicación o subida de fotografías.
- Cambiar el contenido de la referencia por datos propios.
- Crear componentes reutilizables fuera de los archivos necesarios para esta home.

## Data model

This feature introduces no new data structures. It renders the static content defined by the reference screen and stores only the transient open/closed state of the mobile navigation in the client component.

## Implementation plan

1. Replace `open-daycare/app/page.tsx` with the static home structure based on `open-daycare/references/pantallas/feed.dc.html`, preserving the reference content and representing its icons with inline SVG.
2. Add the mobile navigation state and controls to `open-daycare/app/page.tsx`: hamburger trigger, overlay panel, close button, close-on-navigation, and close-on-overlay-click. Manual check: the home loads and the mobile panel opens and closes without a backend.
3. Replace `open-daycare/app/globals.css` with the global palette, typography, reset, desktop layout, feed cards, and responsive rules needed to reproduce the reference at desktop and at `390 × 844`.
4. Update `open-daycare/app/layout.tsx` with the Spanish document language, OpenDayCare metadata, and the Google Fonts loading required by the reference. Manual check: the home uses `Fredoka` for headings and `Nunito` for body text.
5. Run the production build, strict TypeScript check, and Playwright visual verification against the reference. Store any Playwright artifacts only under `.playwright-mcp/` as required by the repository rules.

## Acceptance criteria

- [X] Visiting `/` renders the OpenDayCare feed instead of the default Next.js starter screen.
- [X] The desktop home includes the sidebar, brand block, new-publication call to action, navigation items, user block, greeting, composer prompt, section divider, and three feed cards from the reference.
- [X] The visible static copy matches the reference, including “OpenDayCare”, “Sala Soles”, “Caro Giménez”, “Buenas, Caro”, “Mateo”, publication texts, labels, counters, and date.
- [ ] The desktop color palette, typography, borders, radii, shadows, spacing, and inline icons visually match `open-daycare/references/pantallas/feed.dc.html`.
- [X] `Fredoka` and `Nunito` are loaded from Google Fonts and applied to the same text roles as in the reference.
- [X] At viewport `390 × 844`, the desktop sidebar is replaced by a hamburger trigger and the feed remains readable without horizontal overflow.
- [X] Activating the hamburger trigger opens a lateral overlay panel containing the navigation.
- [X] The mobile panel closes from its close button, from a navigation option, and from the overlay background.
- [X] No control performs a real authentication, persistence, database, publication, like, comment, edit, or upload operation.
- [X] The route and browser console load without application errors.
- [X] `npm run build` completes successfully from `open-daycare/`.
- [X] `npx tsc --noEmit` completes successfully from `open-daycare/`.
- [ ] A Playwright capture at desktop size and at `390 × 844` confirms the rendered home against the reference, with artifacts stored under `.playwright-mcp/`.

## Decisions

- **Yes:** Only implement the `/` route. The request is a visual adaptation of one screen, so additional routes would expand the scope without providing runtime value.
- **No:** Create empty destination routes for sidebar and card links. Those destinations belong to future specs.
- **Yes:** Preserve the reference content exactly. This makes visual comparison deterministic while no data model exists.
- **Yes:** Load `Fredoka` and `Nunito` from Google Fonts. This is the closest match to the supplied reference.
- **Yes:** Implement the hamburger as the only required interactive behavior. It is needed to make the mobile adaptation usable.
- **No:** Add likes, comments, persistence, authentication, or database state. The current feature is intentionally static.
- **Yes:** Validate with Playwright, `npm run build`, and `npx tsc --noEmit`. Visual similarity and compilation are separate acceptance concerns.
- **No:** Use the reference `.dc.html` file as runtime application code. It remains a design/reference asset.

## Risks

| Risk | Mitigation |
| --- | --- |
| Google Fonts are unavailable during a visual check | Keep the declared fallback font stack and verify the primary font declarations; the page remains renderable without the external request. |
| The reference is desktop-oriented and does not define mobile behavior | Use the approved `390 × 844` viewport and constrain the mobile adaptation to the hamburger panel plus readable feed content. |
| Static links could be mistaken for implemented features | Keep them visually present but non-functional and document their routes as out of scope. |
| Inline SVG and styling changes could cause accessibility regressions | Use meaningful button labels, keyboard-accessible controls, and visible focus states for the mobile navigation. |

## What is **not** in this spec

- Authentication or authorization.
- Database, API, persistence, or dynamic data.
- Additional application routes.
- Functional publication, editing, photo upload, likes, or comments.
- Any redesign of the supplied feed visual language.

Each item belongs in a separate spec if it is needed later.
