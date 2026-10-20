# SPEC 07 — Publicar y actualizar el feed

> **Estado:** Implementado
> **Depende de:** SPEC 06
> **Fecha:** 2026-10-11
> **Objetivo:** Conectar el formulario válido de creación de publicaciones con un estado cliente en memoria que inserte la nueva publicación al inicio del feed y se reinicie al recargar.

## Alcance

**Incluye:**

- Crear un proveedor cliente compartido para las publicaciones del feed.
- Mantener las publicaciones iniciales actuales y agregar nuevas publicaciones en memoria.
- Conectar el callback válido de `CreatePostModal` de SPEC 06 con el proveedor.
- Crear una publicación con autor fijo `Caro Giménez`.
- Usar la hora local de creación con el formato visual existente.
- Convertir los destinatarios seleccionados en el texto visible del feed.
- Mantener el tipo seleccionado y su estilo visual correspondiente.
- Mostrar la descripción ingresada como contenido de la nueva tarjeta.
- Insertar la nueva publicación al inicio de la lista del feed.
- Iniciar la nueva publicación con 0 likes y 0 comentarios.
- Cerrar el modal después de una publicación válida.
- Reiniciar las publicaciones creadas al recargar la aplicación.
- Verificar ambos accesos al modal y la actualización visible del feed.

**Fuera de alcance (para futuras specs):**

- API, base de datos, autenticación o sincronización entre usuarios.
- Persistencia en `localStorage`, `sessionStorage` o archivos.
- Subida o persistencia de fotografías.
- Likes, comentarios, edición o eliminación de publicaciones.
- Validación adicional distinta de la definida en SPEC 06.
- Cambiar el autor fijo o crear perfiles de usuarios.
- Nuevos destinatarios o tipos distintos de SPEC 06.
- Notificaciones, actualización en tiempo real o paginación del feed.

## Modelo de datos

El proveedor conserva las publicaciones iniciales y las nuevas publicaciones durante la sesión. El formulario de SPEC 06 se transforma en un registro completo para renderizar la tarjeta existente.

```ts
type PostRecipient = "mateo" | "sofia" | "benjamin" | "all";
type PostType = "Comida" | "Siesta" | "Actividad" | "Logro" | "Ánimo" | "Foto" | "Anuncio";

type FeedPost = {
  id: string;
  author: "Caro Giménez";
  avatar: "C";
  time: string;
  type: PostType;
  recipients: PostRecipient[];
  description: string;
  likes: number;
  comments: number;
  image: false;
};

type FeedContextValue = {
  posts: FeedPost[];
  addPost: (form: CreatePostForm) => FeedPost;
};
```

- `posts` inicia con el contenido estático actual del feed convertido al modelo compartido.
- `id` se genera localmente y solo debe ser único durante la sesión.
- `time` usa la hora local de creación con formato `HH:mm`.
- `recipients` se muestra como `Para: Mateo`, `Para: Sofía`, `Para: Benjamín`, `Para: Mateo, Sofía y Benjamín` o `Para: toda la sala`.
- Cuando hay varios niños, la lista visible separa los dos primeros con coma y el último con `y`.
- `all` es exclusivo y se muestra únicamente como `Para: toda la sala`.
- `type` conserva una clase visual definida para cada categoría.
- `likes` y `comments` inician en `0` para cada publicación nueva.
- `image` permanece en `false` porque las fotos son visuales y no se cargan en esta spec.
- El proveedor se reinicia al recargar porque no existe persistencia.

## Plan de implementación

1. Crear `open-daycare/app/components/feed-provider.tsx` con el modelo `FeedPost`, la colección inicial y `addPost`, manteniendo en memoria los datos de la sesión. Comprobación manual: el feed conserva sus publicaciones existentes y el proveedor puede crear un registro nuevo.
2. Integrar `FeedProvider` en `open-daycare/app/layout.tsx` junto con `KidsProvider`, sin alterar la navegación ni los datos de niños. Comprobación manual: `/`, `/kids` y `/kids/[id]` siguen cargando con sus datos actuales.
3. Adaptar `open-daycare/app/page.tsx` para leer `posts` del proveedor y renderizar la tarjeta existente desde `FeedPost`, incluyendo destinatario, tipo, descripción, hora, likes y comentarios. Comprobación manual: las publicaciones iniciales conservan su orden y composición visual.
4. Conectar `CreatePostModal` de `open-daycare/app/feed/CreatePostModal.tsx` con `addPost` y el estado de apertura de `/`, cerrando el modal después de una alta válida. Comprobación manual: una publicación válida aparece como primera tarjeta y muestra los datos elegidos.
5. Verificar que cancelar, Escape y fondo no agregan registros, y que los dos accesos (`Compartí un momento…` y `Nueva publicación`) usan el mismo estado del modal. Comprobación manual: todos los cierres dejan el feed sin cambios y ambos accesos publican correctamente.
6. Ejecutar `npm run build`, `npx tsc --noEmit` y las pruebas Playwright de creación, orden, contenido, reinicio, ambos disparadores, responsive y ausencia de errores de consola en desktop y `390 × 844`. Guardar capturas y logs exclusivamente bajo `.playwright-mcp/`.

## Criterios de aceptación

- [X] El feed conserva las publicaciones iniciales al cargar.
- [X] `FeedProvider` mantiene las publicaciones nuevas en memoria durante la sesión.
- [X] Una publicación válida usa autor `Caro Giménez`.
- [X] Una publicación válida muestra la hora local de creación.
- [X] Un destinatario aparece como `Para: Mateo`, `Para: Sofía` o `Para: Benjamín`.
- [X] Varios destinatarios aparecen como `Para: Mateo, Sofía y Benjamín` con la conjunción antes del último nombre.
- [X] `Toda la sala` aparece como `Para: toda la sala` y no se mezcla con nombres individuales.
- [X] El tipo de la nueva publicación coincide con la selección del modal.
- [X] El tipo nuevo usa el estilo visual correspondiente a su categoría.
- [X] La descripción publicada coincide con el texto ingresado.
- [X] La nueva publicación aparece al inicio del feed.
- [X] La nueva publicación inicia con 0 likes.
- [X] La nueva publicación inicia con 0 comentarios.
- [X] El modal se cierra después de una publicación válida.
- [X] Cancelar no agrega una publicación.
- [X] Escape no agrega una publicación.
- [X] Clic en el fondo no agrega una publicación.
- [X] `Compartí un momento…` y `Nueva publicación` abren el mismo flujo.
- [X] Los datos publicados son visibles sin realizar peticiones de red.
- [X] Recargar la aplicación elimina las publicaciones creadas durante la sesión.
- [X] `/kids` y `/kids/[id]` conservan su contenido y navegación existente.
- [X] El feed no presenta desplazamiento horizontal en `390 × 844`.
- [X] El flujo conserva la composición visual principal del feed en desktop.
- [X] `npm run build` finaliza correctamente desde `open-daycare/`.
- [X] `npx tsc --noEmit` finaliza correctamente desde `open-daycare/`.
- [X] Playwright verifica publicación, orden, contenido, cancelación, reinicio y responsive.
- [X] Las rutas verificadas no generan errores de aplicación en la consola del navegador.

## Decisiones tomadas y descartadas

- **Sí:** Crear un proveedor cliente compartido para publicaciones. Permite que el feed y el modal compartan una única colección durante la sesión.
- **No:** Mantener la lista de publicaciones únicamente dentro de `page.tsx`. Dificultaría separar el formulario y el estado de dominio.
- **Sí:** Insertar la publicación nueva al inicio. Es el comportamiento esperado de un feed y permite verificarla sin desplazarse hasta el final.
- **No:** Añadirla al final de la lista. Ocultaría el resultado principal de la acción.
- **Sí:** Usar `Caro Giménez` y su inicial `C` como autor fijo. Es la identidad visible de la aplicación actual.
- **No:** Crear un selector de autor. No existe un modelo de usuarios para esta funcionalidad.
- **Sí:** Usar hora local y 0 likes/0 comentarios. Son valores verificables sin inventar interacción o datos remotos.
- **No:** Reutilizar una hora, likes o comentarios fijos de la referencia. Haría indistinguible una publicación nueva de una publicación inicial.
- **Sí:** Reiniciar el estado al recargar. La persistencia no forma parte de esta spec.
- **No:** Usar `localStorage`, API o base de datos. Requieren un contrato de persistencia independiente.
- **Sí:** Mantener `image: false` en las publicaciones nuevas. La sección de fotos de SPEC 06 es únicamente visual.
- **No:** Asociar archivos o URLs de imágenes. La carga de fotos queda fuera de alcance.
- **Sí:** Depender de SPEC 06. El proveedor recibe el contrato de formulario que define el modal y evita duplicar validaciones.
- **Sí:** Mostrar varios destinatarios como una lista natural con `y` antes del último nombre. Mantiene legibilidad sin crear etiquetas nuevas.
- **No:** Mostrar únicamente el primer destinatario. Ocultaría una selección válida del formulario.

## Riesgos

| Riesgo | Mitigación |
| --- | --- |
| Convertir las publicaciones estáticas puede cambiar la composición actual. | Mantener los mismos valores iniciales, orden, estilos y contenido visible durante la migración. |
| El estado puede perderse al cambiar de ruta si no está en el layout. | Integrar `FeedProvider` en `app/layout.tsx` y comprobar navegación entre rutas. |
| La hora local puede variar entre entornos. | Verificar el formato `HH:mm`, no un valor fijo, y probar que el campo se genera al publicar. |
| Un nuevo tipo puede no tener estilo asociado. | Usar un mapa explícito de estilos para los siete tipos definidos en SPEC 06. |
| El reinicio puede confundirse con un fallo de publicación. | Mantener el registro durante la sesión y verificar explícitamente su desaparición solo después de recargar. |

## Lo que **no** está incluido en esta spec

- Backend, API, base de datos o persistencia local.
- Usuarios dinámicos o selección de autor.
- Likes, comentarios, edición o eliminación.
- Carga, almacenamiento o renderizado de fotografías reales.
- Notificaciones o sincronización en tiempo real.
- Nuevos destinatarios o categorías fuera de SPEC 06.

Cada elemento pertenece a una spec independiente si se necesita más adelante.
