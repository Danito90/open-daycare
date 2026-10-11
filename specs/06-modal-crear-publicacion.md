# SPEC 06 — Modal de crear publicación

> **Estado:** Implementado
> **Depende de:** SPEC 01
> **Fecha:** 2026-10-11
> **Objetivo:** Implementar el modal responsive de creación de publicaciones con destinatarios, tipo, descripción, fotos visuales y validación local sin persistir todavía el contenido en el feed.

## Alcance

**Incluye:**

- Convertir `Compartí un momento…` del feed en un disparador funcional del modal.
- Convertir `Nueva publicación` del menú lateral y del menú móvil en disparadores del mismo modal.
- Reproducir la composición visual principal de `open-daycare/references/pantallas/crear-publicacion.dc.html`.
- Mostrar los destinatarios `Mateo`, `Sofía`, `Benjamín` y `Toda la sala`.
- Mostrar los tipos `Comida`, `Siesta`, `Actividad`, `Logro`, `Ánimo`, `Foto` y `Anuncio`.
- Iniciar el modal sin destinatario ni tipo seleccionados.
- Permitir seleccionar varios niños al mismo tiempo.
- Mantener `Toda la sala` en una fila propia debajo de los botones de los niños.
- Hacer exclusiva la selección de `Toda la sala`: al seleccionarla se desmarcan los niños y al seleccionar un niño se desmarca `Toda la sala`.
- Requerir un destinatario, un tipo y una descripción antes de aceptar el formulario.
- Mostrar errores inline y actualizar cada error al corregir el campo correspondiente.
- Mostrar un recuadro de imagen de ejemplo y un recuadro `Agregar` únicamente visual.
- Cerrar mediante `Cancelar`, la tecla `Escape` o clic en el fondo.
- Descartar los valores del formulario al cerrar sin enviar.
- Exponer el formulario válido al contenedor mediante un callback para que SPEC 07 conecte la publicación al feed.
- Mantener el contenido en estado local mientras el modal está abierto.
- Verificar el modal en desktop y en viewport móvil de `390 × 844`.

**Fuera de alcance (para futuras specs):**

- Insertar publicaciones nuevas en el feed.
- Estado compartido o persistencia de publicaciones.
- API, base de datos, autenticación o envío a un servidor.
- Selección real, subida, compresión o almacenamiento de fotografías.
- Edición, eliminación, likes o comentarios de publicaciones.
- Destinatarios distintos de los cuatro definidos en esta spec.
- Tipos de publicación distintos de los siete definidos en esta spec.
- Confirmación adicional antes de descartar el formulario.

## Modelo de datos

El modal usa un formulario local y entrega una estructura de envío al contenedor. No introduce todavía un modelo persistente de publicaciones.

```ts
type CreatePostForm = {
  recipients: ("mateo" | "sofia" | "benjamin" | "all")[];
  type: "Comida" | "Siesta" | "Actividad" | "Logro" | "Ánimo" | "Foto" | "Anuncio" | "";
  description: string;
};

type CreatePostModalProps = {
  open: boolean;
  onClose: () => void;
  onSubmit: (form: CreatePostForm) => void;
};
```

- `recipients` se inicia como arreglo vacío y representa uno o varios destinatarios seleccionados.
- `all` es exclusivo: no puede coexistir con destinatarios individuales.
- `type` se inicia vacío y representa la categoría seleccionada.
- `description` se inicia vacía y debe contener texto no compuesto únicamente por espacios.
- Las fotos de la referencia no forman parte de `CreatePostForm`.
- El callback `onSubmit` solo entrega datos válidos; la persistencia y el renderizado en el feed pertenecen a SPEC 07.

## Plan de implementación

1. Crear `open-daycare/app/feed/CreatePostModal.tsx` con la tarjeta, encabezado, destinatarios, tipos, descripción y sección visual de fotos de la referencia. Comprobación manual: el componente renderiza su composición sin depender de datos externos.
2. Implementar el estado local de `CreatePostForm`, la selección exclusiva de destinatario y tipo, y la validación inline de los tres campos obligatorios. Comprobación manual: un envío vacío muestra los tres errores y corregir cada campo elimina su error.
3. Implementar el cierre mediante `Cancelar`, `Escape` y clic en el fondo, restableciendo el formulario y sin ejecutar el callback. Comprobación manual: cada cierre descarta los valores introducidos.
4. Añadir a `open-daycare/app/components/app-shell.tsx` un callback opcional para abrir creación de publicaciones desde los botones desktop y móvil, conservando el comportamiento actual en otras rutas.
5. Integrar el estado de apertura y `CreatePostModal` en `open-daycare/app/page.tsx`; conectar también la tarjeta `Compartí un momento…` y pasar un callback que reciba el formulario válido sin insertar todavía publicaciones. Comprobación manual: ambos accesos abren el mismo modal y un envío válido ejecuta el callback.
6. Ejecutar `npm run build`, `npx tsc --noEmit` y las pruebas Playwright de ambos disparadores, selección inicial, validaciones, cierres, responsive y ausencia de overflow en desktop y `390 × 844`. Guardar capturas y logs exclusivamente bajo `.playwright-mcp/`.

## Criterios de aceptación

- [X] `Compartí un momento…` abre el modal sin cambiar la ruta.
- [X] `Nueva publicación` del menú lateral abre el mismo modal.
- [X] `Nueva publicación` del menú móvil abre el mismo modal.
- [X] El modal reproduce la composición visual principal de `crear-publicacion.dc.html`.
- [X] El modal muestra `Mateo`, `Sofía`, `Benjamín` y `Toda la sala` como destinatarios.
- [X] El modal muestra `Comida`, `Siesta`, `Actividad`, `Logro`, `Ánimo`, `Foto` y `Anuncio` como tipos.
- [X] Al abrir el modal no hay destinatario seleccionado.
- [X] Se pueden seleccionar `Mateo`, `Sofía` y `Benjamín` simultáneamente.
- [X] `Toda la sala` aparece en una fila propia debajo de los botones de los niños.
- [X] Al seleccionar `Toda la sala`, los botones de los niños quedan desmarcados.
- [X] Al seleccionar un niño mientras `Toda la sala` está marcada, `Toda la sala` queda desmarcada.
- [X] Al seleccionar varios niños, `Toda la sala` permanece desmarcada.
- [X] Al abrir el modal no hay tipo seleccionado.
- [X] La descripción inicia vacía.
- [X] Un envío sin destinatario muestra un error inline.
- [X] Un envío sin tipo muestra un error inline.
- [X] Un envío sin descripción muestra un error inline.
- [X] Los errores desaparecen al corregir los campos correspondientes.
- [X] La sección `FOTOS` muestra una imagen de ejemplo y un recuadro `Agregar`.
- [X] El recuadro `Agregar` no abre un selector ni modifica el formulario.
- [X] `Cancelar` cierra el modal y descarta los valores.
- [X] `Escape` cierra el modal y descarta los valores.
- [X] Clic en el fondo cierra el modal y descarta los valores.
- [X] Un formulario válido ejecuta el callback una sola vez.
- [X] El modal no inserta publicaciones ni realiza peticiones de red en esta spec.
- [X] El modal no presenta desplazamiento horizontal en `390 × 844`.
- [X] `npm run build` finaliza correctamente desde `open-daycare/`.
- [X] `npx tsc --noEmit` finaliza correctamente desde `open-daycare/`.
- [X] Playwright verifica ambos disparadores, validaciones, cierres y responsive.
- [X] Las rutas verificadas no generan errores de aplicación en la consola del navegador.

## Decisiones tomadas y descartadas

- **Sí:** Usar un único modal compartido por la tarjeta del feed y los botones de navegación. Evita duplicar formularios y mantiene una experiencia consistente.
- **No:** Crear una ruta independiente para crear publicaciones. La referencia define una tarjeta contenida y el flujo pertenece al feed.
- **Sí:** Iniciar destinatario y tipo sin selección. Son datos obligatorios y así se evita publicar con valores implícitos.
- **Sí:** Representar los destinatarios como una colección. Una publicación puede dirigirse a varios niños.
- **Sí:** Mantener `Toda la sala` como opción exclusiva. Evita estados redundantes en los que se mezclen la sala completa y destinatarios individuales.
- **Sí:** Colocar `Toda la sala` debajo de los niños. Hace visible la diferencia entre selección individual y selección global.
- **No:** Preseleccionar `Mateo` o `Actividad`. Esos valores aparecen en la referencia como ejemplo, no como una elección confirmada.
- **Sí:** Mantener la sección de fotos como presentación. La carga de archivos requiere decisiones de almacenamiento propias.
- **No:** Implementar selector o subida de imágenes. Queda fuera de alcance y pertenece a otra spec.
- **Sí:** Exigir destinatario, tipo y descripción. Una publicación sin esos datos no representa el contrato visual definido.
- **No:** Exigir fotos. La referencia permite una composición sin convertir la imagen en requisito funcional.
- **Sí:** Cerrar mediante `Cancelar`, `Escape` y fondo. Cubre el control explícito y los cierres habituales de la tarjeta.
- **No:** Añadir un botón X. La referencia usa `Cancelar` como acción de cierre del encabezado.
- **Sí:** Entregar el formulario válido mediante callback. Permite que SPEC 07 conecte el modal con el estado del feed sin mezclar responsabilidades.
- **No:** Actualizar el feed en esta spec. La inserción y reinicio de publicaciones se definirán en SPEC 07.

## Riesgos

| Riesgo | Mitigación |
| --- | --- |
| Los dos menús pueden abrir estados de modal distintos. | Centralizar el estado en `/` y pasar un único callback de apertura a `AppShell`. |
| El modal puede superar el alto disponible en móvil. | Usar contenedor con scroll vertical y verificar `390 × 844`. |
| El texto de la referencia puede confundirse con valores iniciales. | Iniciar los campos obligatorios vacíos y usar la referencia solo como composición visual. |
| La sección visual de fotos puede parecer funcional. | Mantener el recuadro `Agregar` sin selector ni mutación y cubrirlo en los criterios. |

## Lo que **no** está incluido en esta spec

- Insertar o persistir publicaciones en el feed.
- API, base de datos, autenticación o almacenamiento.
- Selección o subida real de fotografías.
- Edición, eliminación, likes o comentarios.
- Rutas nuevas para crear publicaciones.

Cada elemento pertenece a una spec independiente si se necesita más adelante.
