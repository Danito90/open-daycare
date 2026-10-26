# SPEC 14 — Publicaciones reales desde Staff, con y sin fotos

> **Estado:** Implementado
> **Depende de:** SPEC 06, SPEC 07, SPEC 09, SPEC 10, SPEC 11, SPEC 12, SPEC 13
> **Fecha:** 2026-10-26
> **Objetivo:** Guardar en Supabase las entradas que publica el staff, con hasta cuatro fotos en un bucket privado, y mostrar a cada usuario solo las entradas que le corresponden.

## Por qué existe esta spec

SPEC 07 publica en memoria: al recargar, la entrada desaparece. SPEC 06 dejó el botón `Agregar` de fotos sin `onClick` y la tarjeta del feed pinta un recuadro punteado en lugar de una imagen. SPEC 13 dejó explícitamente fuera "feed filtrado por niño, publicaciones persistentes o reglas de privacidad del feed".

Esta spec cierra esa deuda. Publicar deja de ser un `setState`, las fotos dejan de ser un placeholder y el feed deja de ser un array compartido por todos los usuarios. Además introduce la primera regla de privacidad real del producto: un padre solo ve las entradas de sus hijos y los anuncios de su sala.

Sin esta spec, `photo_consent` es un booleano decorativo: se puede cambiar, pero ninguna foto depende de él.

## Alcance

**Incluye:**

- Corregir en `opencode.json` la referencia `docs` a la copia real del schema.
- Documentar en el schema de referencia las desviaciones `posts.daycare_id`, `posts.idempotency_key` y `post_photos.storage_path`.
- Crear el enum `public.post_type` con seis valores.
- Crear `public.posts`, `public.post_children` y `public.post_photos` con claves, restricciones e índices.
- Habilitar RLS en las tres tablas y definir políticas de lectura e inserción.
- Crear las funciones auxiliares `current_daycare_id`, `is_staff`, `can_read_post`, `can_read_photo` y `post_photos_allowed`.
- Crear el bucket privado `post-photos` y sus políticas sobre `storage.objects`.
- Sembrar cuatro entradas reales para la guardería existente, sin fotos.
- Agregar `userId` y `daycareId` a `UserProfile`.
- Crear `utils/posts/` con tipos, etiquetas de tipo, formato de fecha, consultas y compresión de imágenes.
- Crear la Server Action `createPost` con validación de rol, alcance, tipo, longitudes, consentimiento y fotos.
- Reescribir `CreatePostModal` con título opcional, tres alcances, buscador de niños, hasta cuatro fotos con vista previa y controles de accesibilidad.
- Subir fotos a Storage dentro del action y limpiar los objetos si falla el insert.
- Convertir `/` en un server component que lee el feed desde Supabase.
- Paginar el feed con cursor de veinte entradas y un enlace `Cargar más`.
- Mostrar la fecha relativa en las últimas 24 horas y absoluta después.
- Mostrar los contadores `0 me gusta · 0 comentarios` como texto estático.
- Ocultar el compositor y sus disparadores a los usuarios `parent`.
- Ocultar el enlace `Editar` de la tarjeta.
- Diferenciar tres estados vacíos según el rol y los vínculos.
- Reemplazar el subtítulo hardcodeado `12 niños · martes 17 jun` por el conteo real y la fecha actual.
- Verificar con Playwright y con pruebas de rol simulado en transacciones revertidas.

**Fuera de alcance (para futuras specs):**

- Editar, borrar o republicar una entrada.
- Reacciones y comentarios; los contadores quedan fijos en cero.
- Supabase Realtime o actualización en vivo del feed.
- Subida o recorte de avatares de usuario.
- Reordenar fotos arrastrando.
- Envío de notificaciones o correos al publicar.
- Publicaciones creadas por padres.
- Programar publicaciones a futuro.
- Vista de detalle de una entrada o galería a pantalla completa.
- Borrado automático de fotos huérfanas por cron.
- Historial de cambios de `photo_consent`.
- Rate limiting o moderación de contenido.

## Modelo de datos

### Base de datos

**Enum `public.post_type`:** `meal`, `nap`, `activity`, `achievement`, `photo`, `announcement`.

Etiquetas de UI:

| Valor DB | Etiqueta UI | Estilo existente |
| --- | --- | --- |
| `meal` | `Comida` | `bg-[#F4DC8E] text-[#765E17]` |
| `nap` | `Siesta` | `bg-[#E7DCF6] text-[#6E4FBA]` |
| `activity` | `Actividad` | `bg-[#C7E7F1] text-[#246B82]` |
| `achievement` | `Logro` | `bg-[#CFEBD8] text-[#2D714F]` |
| `photo` | `Foto` | `bg-[#FBD8CC] text-[#AA4024]` |
| `announcement` | `Anuncio` | `bg-[#CCD8F4] text-[#3659AE]` |

La etiqueta `Ánimo` desaparece de la UI: no existe en el enum y el estado de ánimo pertenece a `daily_summaries`.

**`public.posts`**

| Columna | Tipo | Restricciones y valor por defecto |
| --- | --- | --- |
| `id` | `uuid` | PK, `NOT NULL`, sin `DEFAULT`; el servidor lo genera antes de subir las fotos |
| `daycare_id` | `uuid` | `NOT NULL`, FK a `public.daycares(id)` con `ON DELETE RESTRICT` |
| `author_id` | `uuid` | `NOT NULL`, FK a `public.users(id)` con `ON DELETE RESTRICT` |
| `room_id` | `uuid` | Admite `NULL`, FK a `public.rooms(id)` con `ON DELETE RESTRICT` |
| `type` | `public.post_type` | `NOT NULL` |
| `title` | `text` | Admite `NULL`; si existe, rechaza vacío y más de 80 caracteres |
| `body` | `text` | `NOT NULL`; rechaza vacío, solo espacios y más de 2000 caracteres |
| `published_at` | `timestamptz` | `NOT NULL`, `DEFAULT now()` |
| `created_at` | `timestamptz` | `NOT NULL`, `DEFAULT now()` |
| `updated_at` | `timestamptz` | `NOT NULL`, `DEFAULT now()` |
| `idempotency_key` | `text` | `NOT NULL`; rechaza vacío; único por autor |

Restricciones e índices:

- `UNIQUE (author_id, idempotency_key)` para que un reintento no duplique la entrada.
- La coherencia de alcance no se puede expresar con un `CHECK` porque cruza tablas; se valida en la acción y en los criterios de aceptación (ver tabla de alcances).
- Índice compuesto `(daycare_id, published_at DESC, id DESC)` para el cursor del feed.
- Índice `(room_id, published_at DESC)` para anuncios de sala.
- Índice `(author_id)`.
- Trigger `posts_set_updated_at` con la función `public.set_posts_updated_at`, siguiendo el patrón de `children`.

**Alcances de una entrada**

| Alcance | `room_id` | Filas en `post_children` | `type` | Etiqueta en la tarjeta |
| --- | --- | --- | --- | --- |
| Niños | `NULL` | Una o más | Cualquiera | `Para: Mateo y Sofía` |
| Sala | Sala de la guardería | Ninguna | Cualquiera | `Para: Sala Soles` |
| Toda la guardería | `NULL` | Ninguna | `announcement` | `Para: toda la guardería` |

Estas combinaciones se validan en `createPost` y en los criterios de aceptación. Una entrada con `room_id` nulo, sin `post_children` y con un tipo distinto de `announcement` es inválida.

**`public.post_children`**

| Columna | Tipo | Restricciones y valor por defecto |
| --- | --- | --- |
| `post_id` | `uuid` | `NOT NULL`, FK a `public.posts(id)` con `ON DELETE CASCADE` |
| `child_id` | `uuid` | `NOT NULL`, FK a `public.children(id)` con `ON DELETE CASCADE` |

Restricciones e índices:

- `PRIMARY KEY (post_id, child_id)`.
- Índice sobre `child_id`.

**`public.post_photos`**

| Columna | Tipo | Restricciones y valor por defecto |
| --- | --- | --- |
| `id` | `uuid` | PK, `NOT NULL`, `DEFAULT gen_random_uuid()` |
| `post_id` | `uuid` | `NOT NULL`, FK a `public.posts(id)` con `ON DELETE CASCADE` |
| `storage_path` | `text` | `NOT NULL`, `UNIQUE`; ruta completa dentro del bucket |
| `alt` | `text` | Admite `NULL`; rechaza más de 140 caracteres |
| `width` | `int` | Admite `NULL`; si existe, mayor que cero |
| `height` | `int` | Admite `NULL`; si existe, mayor que cero |
| `position` | `int` | `NOT NULL`; mayor o igual a cero |
| `created_at` | `timestamptz` | `NOT NULL`, `DEFAULT now()` |

Restricciones e índices:

- `UNIQUE (post_id, position)`.
- Índice sobre `post_id`.
- Sin columna `url`: la URL firmada se genera en cada lectura.

### RLS, funciones y privilegios

**Funciones auxiliares**, todas `STABLE`, `SECURITY DEFINER`, `SET search_path = ''`, con `REVOKE ALL` de `PUBLIC` y `anon` y `GRANT EXECUTE` a `authenticated`:

| Función | Devuelve |
| --- | --- |
| `public.current_daycare_id()` | `daycare_id` del usuario autenticado, o `NULL` |
| `public.is_staff()` | `true` si el usuario autenticado es `staff` o `admin` |
| `public.can_read_post(p_post_id uuid)` | `true` si el usuario puede leer esa entrada |
| `public.post_photos_allowed(p_post_id uuid)` | `true` si todos los niños del alcance tienen `photo_consent = true` |
| `public.can_read_photo(p_storage_path text)` | `true` si el usuario puede leer ese objeto de Storage |

`can_read_post` resuelve, en este orden:

1. `false` si la entrada pertenece a otra guardería.
2. `true` si el usuario es `staff` o `admin` de esa guardería.
3. `true` si existe una fila en `post_children` cuyo `child_id` está en `parent_children` del usuario.
4. `true` si `posts.room_id` pertenece a una sala donde el usuario tiene un hijo vinculado.
5. `true` si `type = 'announcement'` y `room_id IS NULL`.

`post_photos_allowed` devuelve `false` si algún niño del alcance tiene `photo_consent = false`. El alcance se resuelve así:

1. Con `post_children`: los niños listados.
2. Con `room_id`: todos los niños de esa sala.
3. Con `announcement` y `room_id IS NULL`: todos los niños de la guardería.

`can_read_photo` busca la fila de `post_photos` por `storage_path`, aplica `can_read_post` y exige `post_photos_allowed`.

**Políticas de `posts`**

| Operación | Rol | Regla |
| --- | --- | --- |
| `SELECT` | `authenticated` | `can_read_post(id)` |
| `INSERT` | `authenticated` | `is_staff()` y `daycare_id = current_daycare_id()` y `author_id = auth.uid()` y (`room_id IS NULL` o la sala pertenece a la guardería) |
| `UPDATE` / `DELETE` | — | Sin privilegios para clientes |

**Políticas de `post_children`**

| Operación | Rol | Regla |
| --- | --- | --- |
| `SELECT` | `authenticated` | `can_read_post(post_id)` |
| `INSERT` | `authenticated` | `can_read_post(post_id)` y `is_staff()` y el niño pertenece a la guardería del usuario |
| `UPDATE` / `DELETE` | — | Sin privilegios para clientes |

**Políticas de `post_photos`**

| Operación | Rol | Regla |
| --- | --- | --- |
| `SELECT` | `authenticated` | `can_read_post(post_id)` y `post_photos_allowed(post_id)` |
| `INSERT` | `authenticated` | `can_read_post(post_id)` y `is_staff()` y `storage_path` empieza con `current_daycare_id()` |
| `UPDATE` / `DELETE` | — | Sin privilegios para clientes |

**Storage**

- Bucket `post-photos`, privado (`public = false`).
- Límite de archivo: 2 MB.
- Tipos permitidos: `image/jpeg`, `image/png`, `image/webp`.
- Ruta: `{daycare_id}/{post_id}/{position}.{ext}`.

| Operación | Rol | Regla |
| --- | --- | --- |
| `SELECT` | `authenticated` | `bucket_id = 'post-photos'` y `(storage.foldername(name))[1] = current_daycare_id()::text` y `can_read_photo(name)` |
| `INSERT` | `authenticated` | `bucket_id = 'post-photos'` y `(storage.foldername(name))[1] = current_daycare_id()::text` y `is_staff()` |
| `DELETE` | `authenticated` | `bucket_id = 'post-photos'` y `(storage.foldername(name))[1] = current_daycare_id()::text` y `is_staff()` |

**Privilegios**

- `authenticated`: `SELECT` e `INSERT` en `posts`, `post_children` y `post_photos`; sin `UPDATE` ni `DELETE`.
- `anon`: sin privilegios ni políticas en las tres tablas ni en el bucket.
- `RLS` activo en `posts`, `post_children` y `post_photos`.
- Las políticas nuevas no modifican las de `children`, `users`, `invitations` ni `parent_children` de SPEC 13.

### Tipos y contratos de la aplicación

```ts
// utils/posts/types.ts
export type PostTypeValue =
  | "meal"
  | "nap"
  | "activity"
  | "achievement"
  | "photo"
  | "announcement";

export type PostAudience =
  | { scope: "children"; children: { id: string; fullName: string }[] }
  | { scope: "room"; roomId: string; roomName: string }
  | { scope: "daycare" };

export type FeedPhoto = {
  id: string;
  alt: string | null;
  width: number | null;
  height: number | null;
  url: string | null;
};

export type FeedPost = {
  id: string;
  authorId: string;
  authorName: string;
  authorInitials: string;
  type: PostTypeValue;
  title: string | null;
  body: string;
  publishedAt: string; // ISO
  audience: PostAudience;
  photos: FeedPhoto[];
};

export type FeedPage = {
  posts: FeedPost[];
  nextCursor: string | null;
};

export type AudienceOption = {
  id: string;
  label: string;
  initial: string;
};
```

```ts
// app/actions/posts.ts
export type CreatePostState = {
  errors?: {
    type?: string;
    title?: string;
    body?: string;
    audience?: string;
    photos?: string;
  };
  formError?: string;
  published?: { postId: string };
};
```

Convenciones:

- `POST_TYPE_LABELS` traduce el enum a las etiquetas y estilos de la tabla.
- Los valores persistidos son los ingleses; la UI muestra siempre español.
- `FeedPost.audience` se arma en la consulta a partir de `posts`, `post_children` y `rooms`, nunca desde el cliente.
- El cursor es una cadena opaca `"<published_at ISO>|<id>"`; la consulta ordena por `published_at DESC, id DESC` y filtra con `or(published_at.lt.X, and(published_at.eq.X, id.lt.Y))`.
- `FeedPhoto.url` es una URL firmada con expiración de 3600 segundos, o `null` si no se pudo firmar.

### Formato de fecha

`utils/posts/format-date.ts` expone `formatPostDate(iso: string, now?: Date): string`:

| Distancia | Resultado |
| --- | --- |
| Menos de 60 segundos | `ahora` |
| Menos de 60 minutos | `hace 5 min` |
| Menos de 24 horas | `hace 3 h` |
| Mismo año | `12 oct, 14:20` |
| Otro año | `12 oct 2025` |

La zona horaria vive en `utils/posts/time.ts` como `DAYCARE_TIME_ZONE = process.env.DAYCARE_TIME_ZONE ?? "America/Mexico_City"` y se usa en todos los `Intl.DateTimeFormat`.

### Compresión de imágenes

`utils/posts/compress-image.ts` expone `compressImage(file: File, options): Promise<CompressedImage>`:

- Rechaza archivos que no sean `image/jpeg`, `image/png`, `image/webp` ni `image/heic`.
- Decodifica con `createImageBitmap`.
- Escala el lado mayor a 1600 px sin ampliar imágenes menores.
- Reencodea a WebP con calidad 0.82.
- Devuelve `blob`, `width`, `height` y `extension`.
- Si `createImageBitmap` falla con un archivo HEIC, lanza un error legible: `No pudimos procesar esta foto. Convertila a JPG e intentá de nuevo.`

### Estados de la interfaz

- **Compositor:** abre con el primer campo enfocado; `Esc` cierra; el foco queda atrapado dentro del diálogo; al cerrar vuelve al disparador; los errores se anuncian con `role="alert"` y `aria-live="polite"`.
- **Fotos:** cada vista previa muestra miniatura 96 × 96, botón `Quitar` y botones `Mover a la izquierda` / `Mover a la derecha`, deshabilitados en los extremos. Al llegar a cuatro, el tile `Agregar` desaparece.
- **Envío:** el botón `Publicar` se deshabilita mientras `isPending`; si falla, el modal permanece abierto con los datos y el error; si acierta, cierra y la entrada aparece arriba del feed.
- **Feed:** si hay más entradas, se muestra `Cargar más` que conserva el scroll y agrega la siguiente página.
- **Tarjeta:** la etiqueta de audiencia sale de `FeedPost.audience`; el enlace `Editar` no se renderiza; los contadores son texto estático `0 me gusta · 0 comentarios`.
- **Estados vacíos:** `Todavía no hay publicaciones` para staff o admin de una guardería sin entradas; `Todavía no tenés niños vinculados` para un padre sin vínculos; `No hay publicaciones para tus niños` para un padre con vínculos y sin entradas.

### Variables de entorno

| Variable | Uso | Ámbito |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Cliente Supabase | Pública; ya existe |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Cliente Supabase | Pública; ya existe |
| `DAYCARE_TIME_ZONE` | Zona horaria del feed | Solo servidor; nueva, opcional, con fallback |

## Plan de implementación

1. Corregir en `opencode.json` la ruta de `docs` a la copia real del schema. Agregar al markdown `posts.daycare_id`, `posts.idempotency_key` y `post_photos.storage_path` con una nota de desviación y su motivo. Comprobación manual: la ruta configurada abre el archivo y las tres columnas aparecen documentadas.
2. Crear con la CLI la migración del enum `post_type` y de las tres tablas con claves, `CHECK`, `UNIQUE`, índices, trigger de `updated_at` y `RLS` activo. Revisar el SQL sin aplicarlo. Comprobación manual: la aplicación sigue funcionando con el feed en memoria y el archivo de migración es el único cambio de base.
3. Crear con la CLI la segunda migración: `current_daycare_id`, `is_staff`, `can_read_post`, `post_photos_allowed`, `can_read_photo`, las políticas de las tres tablas, el bucket `post-photos` y las políticas de `storage.objects`. Comprobación manual: las funciones existen, `anon` no accede y el bucket es privado.
4. Crear con la CLI la tercera migración: cuatro entradas sembradas para `Guardería Sala Soles`, una de alcance niños, una de sala y dos de toda la guardería, con un autor `staff` existente y sin fotos. Aplicar las tres migraciones al remoto después de verificar destino e historial con `supabase db push --dry-run` y aprobación explícita. Comprobación manual: las filas existen, ninguna tiene `post_photos` y el feed en memoria sigue siendo el que renderiza la app.
5. Verificar RLS en transacciones revertidas con `SET LOCAL ROLE authenticated` y claims simulados: staff ve todas las entradas de su guardería, padre vinculado ve solo las de sus hijos, padre ve anuncios de la sala de sus hijos, padre no ve entradas de niños ajenos y `INSERT` de `posts` falla para un `parent`. Comprobación manual: no quedan filas de prueba.
6. Agregar `userId` y `daycareId` a `UserProfile` y a `getCurrentProfile`, manteniendo el fallback actual. Comprobación manual: `npx tsc --noEmit` pasa y el shell no cambia visualmente.
7. Crear `utils/posts/types.ts` con los tipos, `POST_TYPE_LABELS` y las etiquetas de alcance. Crear `utils/posts/time.ts` y `utils/posts/format-date.ts` con la tabla de distancias. Comprobación manual: una prueba rápida en Node devuelve `ahora`, `hace 5 min`, `hace 3 h` y la fecha absoluta para casos de ejemplo.
8. Crear `utils/posts/queries.ts` con `getFeedPage`, `getAudienceOptions` y `signPhotoUrls`. `getFeedPage` consulta `posts` con el embed de `post_children(children(full_name))`, `rooms(name)` y `post_photos`, aplica el cursor y firma las URLs con 3600 segundos. Comprobación manual: con un usuario staff real devuelve las cuatro entradas sembradas en el orden esperado.
9. Crear `utils/posts/compress-image.ts` y probarlo en el navegador con una foto de más de 1600 px y con un HEIC: la primera devuelve un WebP menor a 2 MB y el segundo muestra el error legible. Comprobación manual: sin cambios en el feed.
10. Agregar `serverActions.bodySizeLimit: "8mb"` en `next.config.ts`. Comprobación manual: `npm run build` pasa.
11. Crear `app/actions/posts.ts` con `createPost`: validar sesión, rol, `idempotencyKey`, tipo, longitudes, alcance, pertenencia de niños y sala a la guardería, consentimiento de fotos del alcance y archivos; generar el `post_id`; subir las fotos al bucket; insertar `posts`, `post_children` y `post_photos` con el cliente del usuario; borrar los objetos subidos si algo falla; devolver `published` y llamar `revalidatePath("/")`. Si el insert choca con `(author_id, idempotency_key)`, devolver la entrada existente sin volver a subir fotos. Comprobación manual: publicar sin fotos crea una fila; publicar con un niño sin consentimiento devuelve error y no sube objetos.
12. Reescribir `app/feed/CreatePostModal.tsx`: `useActionState(createPost)`, campo oculto `idempotencyKey` generado al montar, selector de alcance, buscador de niños, título opcional, seis tipos, selector de fotos con compresión, vistas previas con quitar y reordenar, foco inicial, trampa de foco, retorno de foco y `aria-live`. Comprobación manual: el modal se opera completo solo con teclado y `Esc` devuelve el foco al disparador.
13. Convertir `app/page.tsx` en server component: leer `searchParams.cursor`, llamar `getFeedPage`, renderizar `PostCard` y el enlace `Cargar más`, y montar el compositor solo si el rol es `staff` o `admin`. Extraer `PostCard` a `app/feed/post-card.tsx` con la fecha relativa, la audiencia y las fotos reales. Comprobación manual: recargar conserva las entradas y el botón de paginación trae la siguiente página.
14. Eliminar `app/components/feed-provider.tsx` y su uso en `app/layout.tsx`. Quitar `Ánimo` de los estilos y de cualquier referencia. Ocultar `Nueva publicación` en `app/components/app-shell.tsx` para `parent`. Comprobación manual: un padre no ve ningún disparador del compositor y la app compila sin `FeedProvider`.
15. Implementar los tres estados vacíos y reemplazar el subtítulo `12 niños · martes 17 jun` por el conteo real de niños activos y la fecha formateada. Comprobación manual: staff y padre ven mensajes distintos cuando no hay datos.
16. Ejecutar `npm run build`, `npx tsc --noEmit` y Playwright MCP en escritorio y `390 × 844`: publicar sin foto, publicar con dos fotos, padre con consentimiento revocado, y padre que no ve entradas de niños ajenos. Guardar capturas y logs solo en `.playwright-mcp/`. Limpiar las entradas y objetos de prueba al terminar.

## Criterios de aceptación

**Base de datos**

- [ ] Existen tres migraciones creadas con la CLI y aplicadas en remoto; no se ejecutó DDL fuera de ese flujo.
- [ ] `supabase db push --dry-run` se revisó y se aprobó antes de aplicar.
- [ ] `public.post_type` contiene exactamente `meal`, `nap`, `activity`, `achievement`, `photo` y `announcement`.
- [ ] `public.posts` tiene las once columnas del modelo y `id` no tiene valor por defecto.
- [ ] No se pueden insertar dos entradas con el mismo `(author_id, idempotency_key)`.
- [ ] `posts.title` rechaza cadenas vacías y textos de más de 80 caracteres.
- [ ] `posts.body` rechaza vacío, solo espacios y más de 2000 caracteres.
- [ ] `public.post_children` tiene `PRIMARY KEY (post_id, child_id)`.
- [ ] `public.post_photos` tiene las ocho columnas del modelo, `UNIQUE (post_id, position)` y ninguna columna `url`.
- [ ] Borrar una entrada borra sus filas en `post_children` y `post_photos`.
- [ ] RLS está activo en las tres tablas y `anon` no puede leer ni escribir ninguna.
- [ ] El índice `(daycare_id, published_at DESC, id DESC)` existe.
- [ ] Las funciones auxiliares son `STABLE`, `SECURITY DEFINER`, con `search_path` vacío y sin ejecución para `anon`.
- [ ] `can_read_post` devuelve `false` para un usuario de otra guardería.
- [ ] `post_photos_allowed` devuelve `false` cuando un niño del alcance tiene `photo_consent = false`.
- [ ] `can_read_photo` devuelve `false` para un padre cuando `post_photos_allowed` es `false`.
- [ ] El bucket `post-photos` es privado, limita a 2 MB y acepta solo JPEG, PNG y WebP.
- [ ] Un intento de subir un objeto a una carpeta de otra guardería es rechazado por la política.
- [ ] Las pruebas de escritura se revierten y no quedan filas ni objetos de prueba.

**Aislamiento entre familias**

- [ ] Un `staff` lee todas las entradas de su guardería.
- [ ] Un `parent` lee solo las entradas con un hijo vinculado en `post_children`.
- [ ] Un `parent` lee los anuncios de cualquier sala donde tenga un hijo vinculado.
- [ ] Un `parent` lee los anuncios de toda la guardería.
- [ ] Un `parent` no lee entradas de niños ajenos ni por consulta directa ni abriendo una URL con el `id`.
- [ ] Un usuario de otra guardería no lee entradas ni obtiene URLs firmadas.
- [ ] Un `parent` que intenta insertar en `posts` recibe un error de política.
- [ ] Las entradas históricas de un niño `archived` siguen siendo legibles para su familia.

**Publicar sin fotos**

- [ ] Un `staff` publica una entrada de alcance niños con un solo hijo y aparece arriba del feed.
- [ ] Una entrada de alcance sala guarda `room_id` y no crea filas en `post_children`.
- [ ] Una entrada de alcance toda la guardería exige tipo `announcement`.
- [ ] Recargar el feed conserva la entrada.
- [ ] El `author_id` guardado es el usuario que publicó y la tarjeta muestra su nombre.
- [ ] Un `parent` no ve el botón `Nueva publicación` ni el bloque `Compartí un momento…`.
- [ ] Un formulario sin tipo, sin cuerpo o sin alcance muestra error inline y no inserta nada.
- [ ] Un título de más de 80 caracteres o un cuerpo de más de 2000 se rechazan en cliente y en servidor.
- [ ] Publicar el mismo `idempotencyKey` dos veces no crea dos entradas.

**Publicar con fotos**

- [ ] Se pueden adjuntar hasta cuatro imágenes y el tile `Agregar` desaparece al llegar a cuatro.
- [ ] Una imagen de más de 1600 px se guarda con el lado mayor en 1600 px y pesa menos de 2 MB.
- [ ] Un archivo que no es imagen se rechaza con un mensaje antes de enviar.
- [ ] Un HEIC no decodificable muestra el mensaje de convertir a JPG y no rompe el modal.
- [ ] Cada foto subida queda en `post-photos/{daycare_id}/{post_id}/{position}.webp`.
- [ ] `post_photos.position` conserva el orden elegido con los botones de mover.
- [ ] La tarjeta renderiza las fotos como `<img>` con `width` y `height` y sin recuadro punteado.
- [ ] Las URLs firmadas expiran en 3600 segundos.
- [ ] Publicar con tipo `photo` y cero imágenes muestra un error y no inserta nada.
- [ ] Publicar con cualquier otro tipo y cero imágenes funciona.
- [ ] Publicar con un niño destinatario con `photo_consent = false` muestra error, no inserta la entrada y no deja objetos en el bucket.
- [ ] Publicar con alcance sala valida el consentimiento de todos los niños de la sala.
- [ ] Si el insert falla después de subir, no quedan objetos huérfanos en `post-photos/{daycare_id}/{post_id}/`.
- [ ] Revocar `photo_consent` de un niño oculta las fotos de sus entradas en la siguiente carga, sin borrar las filas de `post_photos`.
- [ ] El texto alternativo guardado se usa en el `alt` de la imagen; si no existe, se genera uno con el tipo de entrada.

**Feed, presentación y accesibilidad**

- [ ] El feed trae veinte entradas por página en orden `published_at DESC`.
- [ ] `Cargar más` agrega la siguiente página sin duplicar ni saltear entradas.
- [ ] Dos entradas con el mismo `published_at` no se repiten ni desaparecen al paginar.
- [ ] Una entrada de hoy muestra `hace N min` o `hace N h`.
- [ ] Una entrada de otro año muestra la fecha con año.
- [ ] Los contadores se muestran como texto estático `0 me gusta · 0 comentarios`.
- [ ] El enlace `Editar` no aparece en ninguna tarjeta.
- [ ] La audiencia se muestra como `Para: Mateo y Sofía`, `Para: Sala Soles` o `Para: toda la guardería` según el alcance guardado.
- [ ] El modal enfoca el primer campo al abrir y devuelve el foco al disparador al cerrar.
- [ ] El foco no sale del modal con `Tab` ni `Shift+Tab`.
- [ ] Los errores del formulario se anuncian con `role="alert"`.
- [ ] El botón `Publicar` queda deshabilitado mientras la acción está pendiente.
- [ ] Los tres estados vacíos se muestran según el caso y ninguno dice `No hay publicaciones` a un padre sin vínculos.
- [ ] El subtítulo del feed muestra el conteo real de niños activos y la fecha actual.

**Verificación general**

- [ ] `npm run build` finaliza correctamente desde la raíz del proyecto.
- [ ] `npx tsc --noEmit` finaliza correctamente.
- [ ] `npm run lint` finaliza sin errores.
- [ ] Playwright MCP verifica publicar sin foto, publicar con dos fotos, bloqueo por consentimiento y aislamiento entre familias.
- [ ] Las rutas verificadas no generan errores de aplicación en la consola del navegador.
- [ ] No hay desbordamiento horizontal en `390 × 844`.
- [ ] Los artefactos de Playwright se guardan exclusivamente en `.playwright-mcp/`.
- [ ] Las entradas y objetos de prueba se eliminan al terminar la verificación.

## Decisiones tomadas y descartadas

- **Sí:** Persistir el feed en Supabase en esta spec. Publicar sin persistencia no es publicar; el `setState` actual se pierde al recargar.
- **Sí:** Solo `staff` y `admin` publican, con validación en el servidor. Ocultar el botón en el cliente no es autorización.
- **No:** Publicaciones de padres. No están en el objetivo y abren moderación y visibilidad que merecen su propia spec.
- **Sí:** Mantener el compositor como modal sobre `/`. Respeta SPEC 06 y evita una navegación extra para quien publica varias entradas.
- **Sí:** Tres alcances mutuamente excluyentes: niños, sala, toda la guardería. Mezclar alcances vuelve ambiguo el filtro del padre y la política de RLS.
- **Sí:** Un solo `room_id` por entrada. Es la columna que ya define el esquema de referencia.
- **Sí:** Agregar `posts.daycare_id` aunque no esté en el esquema de referencia. Evita un join a `users` en cada política y en cada índice del feed.
- **Sí:** Guardar `post_photos.storage_path` en lugar de `url`. Una URL firmada persistida caduca y obliga a reescribir filas cada hora.
- **Sí:** Alinear los tipos al enum de seis valores y eliminar `Ánimo`. `Ánimo` no existe en el enum y el estado de ánimo pertenece a `daily_summaries`.
- **Sí:** Título opcional con `maxlength` 80 y cuerpo obligatorio de hasta 2000. Permite entradas cortas sin inventar un campo obligatorio.
- **Sí:** Bucket privado con URLs firmadas de una hora. Un bucket público de fotos de menores es un enlace permanente imposible de revocar.
- **Sí:** Firmar URLs en cada render y usar `<img>` plano. El optimizador de `next/image` cachea por URL y seguiría sirviendo imágenes después de expirar el permiso.
- **Sí:** Subir las fotos dentro de la Server Action con `FormData`. Mantiene la validación de rol y de consentimiento en un solo lugar y permite limpiar los objetos si falla el insert.
- **No:** Subida directa del navegador con URL firmada. Agrega un paso de firma y deja huérfanos más difíciles de auditar.
- **Sí:** Elevar `serverActions.bodySizeLimit` a 8 MB. Cuatro imágenes de 2 MB no caben en el límite por defecto de 1 MB.
- **Sí:** Comprimir con `createImageBitmap` y `canvas`, sin dependencias nuevas. Cubre el caso real y evita sumar un paquete por una sola función.
- **Sí:** Fallback explícito para HEIC no decodificable. Aceptar HEIC en el `accept` y fallar con un mensaje legible es mejor que rechazarlo sin explicación.
- **Sí:** Bloquear la publicación si algún niño del alcance tiene `photo_consent = false`. Sin el bloqueo, el consentimiento no protege nada.
- **Sí:** Ocultar fotos cuando el consentimiento se revoca después de publicar, sin borrar las filas. El consentimiento revocado debe tener efecto retroactivo visible.
- **Sí:** Conservar las entradas de niños archivados. El historial es lo que la familia espera encontrar.
- **Sí:** Un `idempotencyKey` por apertura del modal. Con cuatro fotos la subida tarda y el doble clic es el caso normal.
- **Sí:** Persistir la clave en `posts` con `UNIQUE (author_id, idempotency_key)`. Deshabilitar el botón no protege ante un reintento de red; la restricción sí.
- **Sí:** Paginar con cursor y no con `offset`. Las entradas nuevas desplazan el `offset` y producen duplicados o saltos.
- **Sí:** Veinte entradas por página con enlace `Cargar más`. El scroll infinito complica teclado, foco y navegación.
- **Sí:** Contadores fijos en cero, como texto estático. `reactions` y `comments` no existen y un botón inerte es una promesa falsa.
- **Sí:** Ocultar el enlace `Editar`. Editar una entrada no está en esta spec.
- **Sí:** Fecha relativa en las últimas 24 horas y absoluta después, en la zona de la guardería. `14:20` solo es correcto cuando todo es del mismo día.
- **Sí:** Foco atrapado, foco inicial y retorno de foco en el compositor. Es el modal que más crece y el que peor se comporta con teclado.
- **No:** Arrastrar para reordenar fotos. Botones de mover resuelven el orden con menos riesgo de accesibilidad.
- **Sí:** Sembrar cuatro entradas reales en una migración. Un feed vacío hace indistinguible "no hay datos" de "está roto".
- **No:** Sembrar fotos. Los objetos de Storage no se pueden sembrar con SQL y quedarían filas apuntando a rutas inexistentes.
- **Sí:** Corregir la ruta del schema de referencia en `opencode.json`. La referencia configurada apunta a una carpeta que no existe.

## Riesgos

| Riesgo | Mitigación |
| --- | --- |
| `can_read_post` consultado desde la política de `post_children` provoca recursión de RLS. | Función `SECURITY DEFINER` con `search_path` vacío; probar cada rol en una transacción revertida. |
| Un padre ve una entrada de un niño ajeno por un error en la política. | Prueba de rol simulado obligatoria, además del recorrido Playwright con dos familias. |
| Las fotos de un niño sin consentimiento siguen visibles por una URL ya firmada. | Firmar en cada render con una hora de vida y ocultar la fila en la consulta; aceptar que una URL ya entregada vive hasta expirar. |
| El insert falla después de subir y quedan objetos huérfanos. | Borrar el prefijo `{daycare_id}/{post_id}/` en el manejo del error y verificarlo en los criterios de aceptación. |
| Cuatro fotos de 2 MB superan el límite del Server Action. | `bodySizeLimit` en 8 MB y compresión previa a 1600 px y calidad 0.82. |
| HEIC de iPhone no se decodifica en el navegador. | Aceptar el archivo, detectar el fallo y mostrar el mensaje de convertir a JPG. |
| El feed pagina con `offset` y duplica entradas nuevas. | Cursor sobre `published_at` e `id`, con desempate por `id`. |
| Las URLs firmadas expiran mientras la pestaña sigue abierta. | Expiración de una hora y refirmado en cada carga; la tarjeta tolera `url: null` sin romper. |
| `post_photos_allowed` recorre todos los niños de la guardería en cada entrada. | Función `STABLE`, invocada una vez por post; índice sobre `children.room_id` ya existente. |
| Un anuncio de sala se publica sin que el staff note que la sala tiene un niño sin consentimiento. | Error explícito con el nombre del niño y bloqueo del envío. |
| El modal conserva `useActionState` de una apertura anterior. | Remontar el formulario al abrir y regenerar `idempotencyKey`. |
| Publicar dos veces por reintento del navegador crea dos entradas. | `idempotencyKey` único por apertura, verificado en la acción. |
| El seed no encuentra un usuario `staff` y falla la migración. | Insertar solo si existe un `staff` en la guardería, con `select` guardado por `exists`. |
| La zona horaria del servidor difiere de la del usuario. | `DAYCARE_TIME_ZONE` único y todos los formatos con `Intl.DateTimeFormat`. |
| Eliminar `FeedProvider` rompe componentes que importan `useFeed` o `formatRecipient`. | Buscar todas las referencias antes de borrar y mantener la compilación verde en cada paso. |

## Lo que **no** está incluido en esta spec

- Editar, borrar o republicar entradas.
- Reacciones, comentarios o cualquier interacción con contadores reales.
- Actualización del feed en vivo con Supabase Realtime.
- Subida, recorte o edición de avatares.
- Reordenar fotos arrastrando.
- Galería a pantalla completa o vista de detalle de la entrada.
- Notificaciones por correo o push al publicar.
- Publicaciones creadas por padres.
- Programación de publicaciones a futuro.
- Limpieza automática de objetos huérfanos por cron.
- Historial de cambios de consentimiento o consentimiento por tutor.
- Rate limiting, captcha o moderación de contenido.

Cada elemento pertenece a una spec independiente si se necesita más adelante.
