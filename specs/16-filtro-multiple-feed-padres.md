# SPEC 16 — Filtro múltiple del feed para padres

> **Estado:** Implementado
> **Depende de:** SPEC 14, SPEC 15
> **Fecha:** 2026-10-27
> **Objetivo:** Permitir que los padres filtren el feed por uno o varios hijos, salas actuales y publicaciones generales de la guardería sin cambiar qué entradas pueden leer.

## Por qué existe esta spec

El feed actual combina publicaciones dirigidas a los hijos vinculados, publicaciones de sus salas y anuncios generales. Un padre no puede separar estas fuentes para encontrar las novedades de un hijo concreto. La selección debe abarcar también las publicaciones de páginas aún no cargadas; ocultar tarjetas en el navegador no resuelve la búsqueda en todo el histórico.

## Alcance

**Incluye:**

- Mostrar un selector múltiple solo a padres con hijos vinculados, encima de las tarjetas y debajo del título `PUBLICACIONES`.
- Ofrecer `Todas`, una opción por hijo vinculado, una por cada sala actual de esos hijos y `Guardería` para los anuncios generales.
- Iniciar en `Todas`. Al seleccionar una opción concreta, desactivar `Todas`; al seleccionar `Todas`, limpiar las demás; al desmarcar la última opción, volver a `Todas`.
- Combinar las opciones concretas como unión sin duplicados: un hijo selecciona únicamente entradas que lo incluyen en `post_children`, una sala selecciona entradas con su `room_id`, y `Guardería` selecciona anuncios generales sin sala ni destinatarios individuales.
- Filtrar en el servidor antes de limitar cada página, con el mismo orden y cursor del feed actual, sin ampliar los permisos de lectura existentes.
- Conservar la selección al usar `Cargar más`, sin conservarla al recargar, salir del feed o volver a entrar.
- Mostrar `No hay publicaciones para el filtro aplicado` cuando una consulta filtrada termina correctamente sin resultados; distinguir ese caso de un error de consulta, que ofrece reintentar.
- Mantener para padres sin hijos vinculados el estado vacío actual y ocultarles el selector.
- Verificar combinaciones, paginación, aislamiento entre familias y presentación en escritorio y móvil.

**Fuera de alcance (para futuras specs):**

- Cambiar las políticas RLS, el alcance original de las publicaciones o quién puede verlas.
- Guardar o compartir el filtro mediante URL, cookies o almacenamiento del navegador.
- Filtrar el feed de `staff` o `admin`.
- Crear publicaciones, editar entradas, agregar reacciones o cambiar el consentimiento de fotos.
- Mostrar salas anteriores de un niño que cambió de sala.

## Modelo de datos

No se agregan tablas, columnas ni datos persistentes. Se reutilizan `public.parent_children`, `public.children`, `public.rooms`, `public.posts` y `public.post_children` de las specs anteriores.

El estado temporal del filtro distingue `all` de una selección concreta compuesta por conjuntos de identificadores de hijos y salas y un booleano para `Guardería`. Las opciones se obtienen de los hijos vinculados al padre y de sus salas actuales; cada sala aparece una sola vez aunque haya varios hijos en ella. El servidor vuelve a validar cada identificador recibido en cada consulta; no confía en las opciones previamente renderizadas en el cliente.

`Todas` conserva la consulta autorizada actual. Para una selección concreta, una publicación coincide si tiene al menos un niño marcado en `post_children`, si su `room_id` es una sala marcada, o si es un anuncio general y está marcada `Guardería`. Los alcances son independientes: elegir un hijo no marca implícitamente su sala ni la guardería. La política de lectura vigente de Supabase sigue siendo el límite superior de los resultados. Una publicación que coincida por más de una opción se devuelve una sola vez.

El cursor de `published_at DESC, id DESC` se aplica sobre el resultado ya filtrado. La selección permanece solo en memoria durante la estancia en el feed; `Cargar más` solicita la siguiente página de esa misma selección sin convertirla en un parámetro persistente de la URL. Los usuarios `staff` y `admin` conservan el comportamiento actual de su feed.

## Plan de implementación

1. Ampliar `utils/posts/queries.ts` para obtener los hijos vinculados y las salas actuales del padre, sin exponer opciones de otras familias. Comprobación manual: dos hijos en una sala producen dos opciones de hijo y una sola de sala.
2. Definir el contrato temporal del filtro en `utils/posts/types.ts` y extender la consulta paginada de `utils/posts/queries.ts` para filtrar antes del límite y del cursor, conservando orden y RLS. Comprobación manual: una selección de hijo, sala y guardería devuelve la unión autorizada sin duplicados.
3. Añadir una operación de servidor en `app/actions/posts.ts` para consultar páginas filtradas: verificar sesión y rol `parent`, validar pertenencia de hijos y salas y rechazar selecciones manipuladas. Comprobación manual: los identificadores ajenos no devuelven publicaciones ni datos de otra familia.
4. Pasar desde `app/page.tsx` las opciones y la primera página autorizada al feed sin alterar la carga inicial de `staff` y `admin`. Comprobación manual: un padre entra en `Todas` y el personal ve su feed habitual.
5. Crear el selector en `app/feed/` y conectarlo a `app/feed/feed-shell.tsx` con estado temporal. Incorporar estados de carga, error con reintento y vacío filtrado; mantener el estado vacío de padres sin vínculos. Comprobación manual: las opciones se pueden activar y desactivar con teclado y reflejan la selección actual.
6. Adaptar `Cargar más` para padres a la selección temporal: añadir páginas completas de la consulta filtrada sin duplicar entradas ni perder la selección. Evitar que recargar o volver al feed reactive un filtro anterior. Comprobación manual: el filtro persiste al paginar, pero no tras recargar ni navegar fuera y volver.
7. Verificar con dos familias, dos hijos, salas compartidas y una publicación con varios destinatarios. Ejecutar `npx tsc --noEmit`, `npm run lint` y `npm run build`, y comprobar escritorio y `390 × 844` con Playwright; guardar sus artefactos solo en `.playwright-mcp/`.

## Criterios de aceptación

**Selección y presentación**

- [ ] Solo un padre con al menos un hijo vinculado ve el selector encima de las publicaciones; `staff` y `admin` no lo ven.
- [ ] Al entrar al feed, `Todas` muestra las mismas publicaciones autorizadas que antes de esta spec.
- [ ] Un hijo seleccionado muestra las entradas que lo incluyen en `post_children`, pero no incluye automáticamente las de su sala o guardería.
- [ ] Una sala seleccionada muestra las entradas cuyo `room_id` coincide; `Guardería` muestra los anuncios generales.
- [ ] Dos hijos de una misma sala producen dos opciones de hijo y una opción de sala.
- [ ] Seleccionar varias opciones muestra su unión sin entradas duplicadas, incluso si una publicación está dirigida a dos hijos seleccionados.
- [ ] Seleccionar `Todas` limpia los filtros concretos; seleccionar un filtro concreto desactiva `Todas`; desmarcar el último filtro vuelve a `Todas`.
- [ ] Un padre sin hijos vinculados sigue viendo `Todavía no tenés niños vinculados` y no ve un selector vacío.
- [ ] Un filtro sin coincidencias muestra `No hay publicaciones para el filtro aplicado`.
- [ ] Una consulta fallida muestra un mensaje de error y permite reintentar; no se presenta como ausencia de publicaciones.
- [ ] El selector es operable con teclado y no produce desbordamiento horizontal a `390 × 844`.

**Paginación y seguridad**

- [ ] Cada página contiene hasta veinte entradas que cumplen el filtro y `Cargar más` recupera las siguientes coincidencias de todo el histórico autorizado.
- [ ] Al pulsar `Cargar más` se conserva la selección y no se repiten ni se omiten entradas con la misma fecha de publicación.
- [ ] Al recargar, salir del feed o volver a él, la selección vuelve a `Todas`.
- [ ] Un padre no obtiene entradas de otra familia, sala no vinculada o guardería ajena aunque manipule los identificadores enviados al servidor.
- [ ] El filtro no altera las políticas actuales de lectura de publicaciones y fotos ni la visibilidad de `staff` y `admin`.
- [ ] `npx tsc --noEmit`, `npm run lint` y `npm run build` finalizan correctamente.
- [ ] La verificación con Playwright en escritorio y móvil guarda artefactos exclusivamente en `.playwright-mcp/`.

## Decisiones tomadas y descartadas

- **Sí:** Selector múltiple con hijos, salas actuales y guardería. Permite encontrar entradas de un hijo sin perder la posibilidad de combinar alcances.
- **Sí:** Alcances independientes y unión sin duplicados. Elegir un hijo no equivale a elegir su sala.
- **Sí:** `Todas` explícita como valor inicial y de retorno al desmarcar la última opción. Mantiene el comportamiento previo del feed.
- **Sí:** Filtro temporal en memoria. La selección acompaña la paginación, pero se restablece al recargar o regresar al feed.
- **Sí:** Consulta filtrada en servidor antes de paginar y limitada por RLS. Ocultar tarjetas ya cargadas daría resultados incompletos.
- **Sí:** Salas actuales del niño. Esta spec no reconstruye un historial de cambios de sala.
- **No:** Tratar un error de red como un filtro sin resultados. Un fallo requiere mensaje y reintento distintos.
- **No:** Ampliar la visibilidad de sala o guardería para hacer funcionar el selector. Este control reorganiza únicamente entradas que el padre ya puede leer.

## Riesgos

| Riesgo | Mitigación |
| --- | --- |
| Aplicar el filtro después del límite deja páginas vacías aunque existan coincidencias más antiguas. | Aplicarlo en la consulta antes de limitar y probar páginas sucesivas con entradas intercaladas. |
| Una selección enviada manualmente incluye IDs de niños o salas ajenos. | Validar pertenencia en el servidor y mantener RLS como límite de lectura. |
| La paginación mezcla resultados de selecciones distintas o duplica entradas de varios hijos. | Reiniciar páginas y cursor al cambiar la selección; obtener publicaciones únicas y usar `published_at` e `id` como orden estable. |
| Cambiar la sala de un hijo deja una opción obsoleta en una pestaña abierta. | Revalidar los identificadores en cada consulta y mostrar un error recuperable si la selección ya no es válida. |

## Lo que **no** está incluido en esta spec

- Nuevos permisos o cambios en las políticas de publicaciones y fotos.
- Persistencia o enlaces compartibles del filtro.
- Filtros para personal, salas históricas o cambios en la creación de entradas.

Cada punto requiere una spec separada si se decide incorporarlo.
