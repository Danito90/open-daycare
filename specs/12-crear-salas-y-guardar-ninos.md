# SPEC 12 — Salas y alta persistente de niños

> **Estado:** Implementado
> **Depende de:** SPEC 04, SPEC 05, SPEC 09, SPEC 10, SPEC 11
> **Fecha:** 2026-10-21
> **Objetivo:** Crear `public.rooms` y `public.children` en Supabase y conectar `/kids` para que el alta de niños, con sala obligatoria y fecha de nacimiento elegida en calendario, se guarde de verdad y sobreviva a la recarga.

## Alcance

**Incluye:**

- Crear el enum `public.child_status` y las tablas `public.rooms` y `public.children` mediante una migración versionada generada con la CLI.
- Sembrar en `rooms` las salas `Soles`, `Luna` y `Estrellas` para la guardería existente.
- Migrar los ocho niños estáticos de `app/data/kids.ts` a `children`, asignados a `Soles`, con sus fechas, alergias y notas.
- Habilitar RLS: cada usuario autenticado solo ve salas y niños de su guardería; solo `staff` y `admin` pueden insertar niños.
- Sustituir la lista en memoria de `/kids` y `/kids/[id]` por consultas a Supabase desde el servidor.
- Cargar el selector de sala del modal desde `rooms`, filtrado por la guardería del usuario.
- Exigir una sala seleccionada: sin preselección y sin guardado si falta.
- Sustituir el campo de texto `dd/mm/aaaa` por `<input type="date">` con calendario nativo y `max` igual a hoy.
- Guardar el alta con una Server Action que valida y hace el `INSERT` con el cliente servidor.
- Mostrar errores inline, mantener los datos del modal si falla el guardado y refrescar la lista tras un alta válida.
- Cambiar la captura de alergias a chips de catálogo que se guardan como etiquetas en inglés.
- Agrupar la lista de `/kids` por sala con su nombre y contador; la búsqueda filtra en todas las salas.
- Usar el UUID de `children.id` en `/kids/[id]` y devolver 404 para ids inválidos o inaccesibles.
- Conservar el comportamiento de vinculación de padres de SPEC 05 como estado en memoria de la sesión.
- Verificar con `npm run build`, `npx tsc --noEmit`, Playwright MCP y consultas de solo lectura a la base.

**Fuera de alcance (para futuras specs):**

- Crear, editar, borrar o reordenar salas desde la aplicación.
- Editar, archivar o eliminar niños desde la aplicación.
- Crear `parent_children` o vincular padres de forma persistente.
- Invitaciones, cuentas de padres, feed, publicaciones o fotografías.
- Subida de avatar o fotografía del niño.
- Autorización por rol distinta de la del `INSERT` en `children`.
- Validación de edad mínima, máxima o duplicados por nombre.
- Ruta independiente `/kids/agregar` o confirmación al descartar el formulario.
- Suite de pruebas permanente o dependencia de Playwright en `package.json`.

## Modelo de datos

### Base de datos

**Enum `public.child_status`:** `active`, `archived`.

**`public.rooms`**

| Columna | Tipo | Restricciones y valor por defecto |
| --- | --- | --- |
| `id` | `uuid` | PK, `NOT NULL`, `DEFAULT gen_random_uuid()` |
| `daycare_id` | `uuid` | `NOT NULL`, FK a `public.daycares(id)` con `ON DELETE RESTRICT` |
| `name` | `text` | `NOT NULL`; rechaza vacío y solo espacios |
| `created_at` | `timestamptz` | `NOT NULL`, `DEFAULT now()` |

- Restricción `UNIQUE (daycare_id, name)` e índice sobre `daycare_id`.
- No se añade `updated_at`: la referencia de `rooms` no lo incluye.

**`public.children`**

| Columna | Tipo | Restricciones y valor por defecto |
| --- | --- | --- |
| `id` | `uuid` | PK, `NOT NULL`, `DEFAULT gen_random_uuid()` |
| `room_id` | `uuid` | `NOT NULL`, FK a `public.rooms(id)` con `ON DELETE RESTRICT` |
| `full_name` | `text` | `NOT NULL`; rechaza vacío y solo espacios |
| `birth_date` | `date` | `NOT NULL` |
| `enrolled_at` | `date` | `NOT NULL`, `DEFAULT current_date` |
| `medical_notes` | `text` | Admite `NULL` |
| `allergy_tags` | `text[]` | `NOT NULL`, `DEFAULT '{}'` |
| `photo_consent` | `boolean` | `NOT NULL`, `DEFAULT true` |
| `status` | `public.child_status` | `NOT NULL`, `DEFAULT 'active'` |
| `created_at` | `timestamptz` | `NOT NULL`, `DEFAULT now()` |
| `updated_at` | `timestamptz` | `NOT NULL`, `DEFAULT now()`; trigger de actualización automática |

- Índice sobre `children.room_id`.
- La regla «fecha no futura» se valida en la Server Action, no con un `CHECK` que dependa de `current_date`.

**RLS y privilegios**

- `rooms`: RLS activado; `SELECT` para `authenticated` solo cuando `daycare_id` coincide con el del perfil propio. Sin `INSERT`, `UPDATE` ni `DELETE` para clientes.
- `children`: RLS activado; `SELECT` para `authenticated` solo de niños cuya sala pertenece a la guardería del perfil propio.
- `children`: `INSERT` para `authenticated` solo si el perfil tiene `role in ('staff','admin')` y la sala indicada pertenece a su guardería.
- Conceder a `authenticated` `SELECT` e `INSERT` limitado a las columnas `room_id`, `full_name`, `birth_date`, `medical_notes` y `allergy_tags`. `enrolled_at`, `photo_consent`, `status`, `created_at`, `updated_at` e `id` se completan con defaults del servidor.
- `anon` no recibe privilegios ni políticas. Se revocan privilegios previos solo sobre estas dos tablas.

**Datos iniciales**

| Sala | Guardería |
| --- | --- |
| `Soles` | La fila existente de `daycares` (`Guardería Sala Soles`) |
| `Luna` | La misma guardería |
| `Estrellas` | La misma guardería |

La guardería se resuelve con un `SELECT` por nombre dentro de la migración; no se escribe su UUID.

Niños migrados, todos en `Soles`, `status = 'active'`, `photo_consent = true`:

| `full_name` | `birth_date` | `enrolled_at` | `allergy_tags` | `medical_notes` |
| --- | --- | --- | --- | --- |
| Mateo Fernández | 2022-03-12 | 2025-02-01 | `{peanut}` | Evitar frutos secos. Lleva inhalador en la mochila. |
| Sofía Méndez | 2023-08-18 | 2025-03-01 | `{}` | Le gusta participar en actividades de música. |
| Benjamín Ruiz | 2022-06-04 | 2025-02-01 | `{}` | Usa lentes para actividades de lectura. |
| Valentina Soto | 2023-09-27 | 2025-04-01 | `{}` | `NULL` |
| Tomás Díaz | 2022-04-09 | 2025-02-01 | `{lactose}` | Ofrecer alternativas sin lácteos durante la merienda. |
| Emma Castro | 2023-07-15 | 2025-03-01 | `{}` | Lleva objeto de apego en la mochila. |
| Lucas Romero | 2022-05-22 | 2025-02-01 | `{}` | Necesita unos minutos de adaptación al llegar. |
| Olivia Vega | 2023-10-03 | 2025-04-01 | `{}` | Disfruta especialmente de los cuentos ilustrados. |

Se descartan los textos de estado de la UI (`Sin alergias registradas`, `Aún no tiene padres vinculados en la sala`): ese estado se deriva de las columnas, no se persiste.

### Tipos y contratos de la aplicación

```ts
// utils/kids/types.ts
export type AllergyTag = "peanut" | "lactose" | "gluten" | "egg";

export type Room = { id: string; name: string };

export type Kid = {
  id: string;
  fullName: string;
  birthDate: string;   // ISO YYYY-MM-DD
  enrolledAt: string;  // ISO YYYY-MM-DD
  roomId: string;
  roomName: string;
  allergyTags: AllergyTag[];
  medicalNotes: string | null;
};

export type AddKidState = {
  errors?: { name?: string; birthDate?: string; roomId?: string };
  formError?: string;
  savedKidId?: string;
};
```

Catálogo de alergias:

| Valor DB | Etiqueta UI |
| --- | --- |
| `peanut` | `MANÍ` |
| `lactose` | `LACTOSA` |
| `gluten` | `GLUTEN` |
| `egg` | `HUEVO` |

Convenciones:

- `birthDate` y `enrolledAt` se transportan como ISO `YYYY-MM-DD` y se formatean solo en la capa de presentación.
- `formatBirthDate("2022-03-12")` devuelve `12 mar 2022`; `formatEnrollmentDate("2025-02-01")` devuelve `feb 2025`.
- La edad se calcula comparando año, mes y día del calendario, sin desplazamientos por zona horaria.
- La sección «Alergias y notas» une las etiquetas traducidas y `medical_notes`; si ambas están vacías muestra `Sin alergias registradas.`
- `initial` es la primera letra de `fullName` en mayúscula.
- Los padres vinculados de SPEC 05 no se consultan en esta spec: se mantienen en un overlay en memoria de la sesión.

## Plan de implementación

1. Crear con la CLI un archivo nuevo en `supabase/migrations/`. Incluir el enum, las dos tablas, claves, defaults, `UNIQUE`, índices, trigger de `updated_at`, RLS, políticas, privilegios y los datos iniciales descritos. Revisar el SQL sin aplicarlo todavía. Comprobación manual: la migración es el único cambio de base y `/kids` sigue funcionando con los datos actuales.
2. Verificar el proyecto remoto de destino y el historial, aplicar la migración mediante el flujo versionado y comprobar columnas, restricciones, RLS, privilegios y filas iniciales con consultas de solo lectura y escrituras revertidas. Comprobación manual: 3 salas y 8 niños en `Soles`; `anon` sin acceso; ningún dato de prueba permanente.
3. Crear `utils/kids/types.ts` con el modelo y el catálogo de alergias, y `utils/kids/format.ts` con `formatBirthDate`, `formatEnrollmentDate`, `calculateAge` y `allergyLabels`. Comprobación manual: `npx tsc --noEmit` pasa y los formateadores devuelven `12 mar 2022` y `feb 2025`.
4. Crear `utils/kids/queries.ts` con `getRooms()`, `getKids()` y `getKidById(id)`, usando `createClient` de `utils/supabase/server.ts`, seleccionando `rooms(id, name)` embebido y ordenando salas y niños por `name`. `getKidById` valida el formato UUID antes de consultar. Comprobación manual: las funciones devuelven las 3 salas y los 8 niños con el usuario autenticado.
5. Convertir `app/kids/page.tsx` en server component que carga salas y niños y los pasa a `app/kids/kids-view.tsx`, un componente cliente con búsqueda, agrupación por sala y estado del modal. `KidsList` recibe los niños por props y pinta una sección por sala con contador; no muestra salas vacías. Comprobación manual: los 8 niños aparecen bajo `Soles`, la búsqueda filtra y `/kids` no usa datos estáticos.
6. Convertir `app/kids/[id]/page.tsx` en server component que valida el UUID, consulta `getKidById`, llama `notFound()` si no existe y renderiza `app/kids/[id]/kid-profile.tsx` con los datos reales y el modal de vinculación. Comprobación manual: una tarjeta abre el perfil correcto; `mateo-fernandez` y un UUID inexistente devuelven 404.
7. Reducir `app/components/kids-provider.tsx` a un overlay de padres en memoria (`parentsByKid`, `addParent`, `getParents`) sin importar datos estáticos, y consumirlo desde `kid-profile.tsx`. Comprobación manual: vincular un padre sigue mostrando la fila durante la sesión.
8. Crear `app/actions/kids.ts` con la Server Action `createKid`. Leer la sesión, validar nombre no vacío, fecha ISO real y no futura, sala visible para el usuario y etiquetas dentro del catálogo; insertar `room_id`, `full_name`, `birth_date`, `medical_notes` y `allergy_tags`; llamar `revalidatePath("/kids")`; devolver `savedKidId` o errores. Comprobación manual: `npx tsc --noEmit` y una invocación inválida no crea filas.
9. Reescribir `app/kids/AddKidModal.tsx` con `useActionState`: calendario nativo con `max` de hoy, selector de sala sin preselección, chips de alergias, errores inline, `formError` con `role="alert"`, botón pendiente y cierre con `router.refresh()` al recibir `savedKidId`. Comprobación manual: un envío válido crea el niño y cierra; los inválidos muestran errores sin crear nada.
10. Eliminar `app/data/kids.ts` y actualizar las importaciones restantes. Comprobación manual: `npm run build` y `npx tsc --noEmit` pasan sin referencias al arreglo estático.
11. Ejecutar `npm run build`, `npx tsc --noEmit` y Playwright MCP en escritorio y `390 × 844`: login, apertura del modal, calendario, tres salas, errores, alta válida, recarga, búsqueda, perfil, vinculación de padre y ausencia de overflow. Guardar capturas y logs solo en `.playwright-mcp/`.

## Criterios de aceptación

- [X] Existe una migración creada con la CLI en `supabase/migrations/` y aplicada en remoto; no se ejecutó DDL ni `INSERT` persistente fuera de ese flujo.
- [X] `public.child_status` contiene exactamente `active` y `archived`.
- [X] `public.rooms` tiene exactamente `id`, `daycare_id`, `name` y `created_at` con los tipos, defaults, FK y restricción de nombre no vacío descritos.
- [X] `rooms` rechaza dos salas con el mismo nombre en la misma guardería y permite el mismo nombre en guarderías distintas.
- [X] `public.children` tiene exactamente las once columnas del modelo, con `room_id NOT NULL`, `allergy_tags` por defecto `{}` y `status` por defecto `active`.
- [X] `children.updated_at` cambia automáticamente al actualizar una fila.
- [X] Existen 3 salas para `Guardería Sala Soles`: `Soles`, `Luna` y `Estrellas`, sin filas en otras guarderías.
- [X] Existen exactamente 8 niños migrados en `Soles` con los valores de la tabla de datos iniciales.
- [X] RLS está activo en `rooms` y `children`; `anon` no puede leer ni escribir ninguna de las dos.
- [X] Un usuario autenticado solo ve las salas y los niños de su guardería.
- [X] Un perfil `staff` o `admin` puede insertar un niño en una sala de su guardería; un perfil `parent` no puede.
- [X] Un intento de insertar un niño en una sala de otra guardería es rechazado por RLS.
- [X] Las pruebas de escritura se revierten y no quedan filas de prueba en la base.
- [X] `/kids` obtiene los niños de Supabase y no de `app/data/kids.ts`.
- [X] `/kids` muestra los 8 niños agrupados bajo `Soles`, no muestra secciones de salas vacías y la búsqueda filtra en todas las salas.
- [X] Cada tarjeta enlaza a `/kids/<uuid>` y el perfil muestra nombre, edad calculada, fecha `12 mar 2022`, sala y alergias/notas reales.
- [X] `/kids/mateo-fernandez` y un UUID inexistente devuelven 404; un UUID válido accesible carga el perfil.
- [X] El modal abre con un selector que contiene exactamente las salas de la guardería del usuario.
- [X] El selector de sala arranca sin opción seleccionada y no permite guardar vacío.
- [X] La fecha de nacimiento se elige con un calendario nativo, no se puede elegir una fecha futura y se guarda como `date` en la base.
- [X] Una fecha manipulada manualmente inválida o futura muestra un error inline y no crea filas.
- [X] Un envío sin nombre, sin fecha o sin sala muestra errores inline y no crea filas.
- [X] Un alta válida inserta exactamente una fila con la sala elegida, `status = active`, `photo_consent = true` y `enrolled_at` igual a la fecha del servidor.
- [X] Tras el alta, el modal se cierra y el niño aparece en la sección de su sala sin recargar manualmente la página.
- [X] Al recargar o abrir la app en otra sesión, el niño creado sigue apareciendo con sus datos.
- [X] Si el guardado falla, el modal permanece abierto, conserva lo escrito y muestra el error en un elemento con `role="alert"`, sin insertar filas.
- [X] Los chips seleccionados se guardan como `{peanut}`, `{lactose}`, `{gluten}` o `{egg}`; sin chips, `allergy_tags` queda en `{}`.
- [X] Las notas médicas se guardan en `medical_notes` y un texto vacío se guarda como `NULL`.
- [X] Los badges de la lista se derivan de `allergy_tags` y muestran `MANÍ` o `LACTOSA` cuando corresponden.
- [X] Los niños migrados muestran la sección de padres vacía y vincular un padre sigue funcionando durante la sesión.
- [X] No queda ninguna referencia a `app/data/kids.ts` ni a la lista estática de ocho niños.
- [X] `npm run build` finaliza correctamente desde la raíz del proyecto.
- [X] `npx tsc --noEmit` finaliza correctamente.
- [X] Playwright MCP verifica en escritorio y `390 × 844` el calendario, las tres salas, los errores, el alta, la persistencia tras recarga, el perfil y la ausencia de desbordamiento horizontal.
- [X] Las rutas verificadas no generan errores de aplicación en la consola del navegador.
- [X] Los artefactos de Playwright se guardan exclusivamente en `.playwright-mcp/`.
- [X] Ninguna clave secreta ni `service_role` aparece en código cliente.

## Decisiones tomadas y descartadas

- **Sí:** Crear `rooms` como tabla propia y sembrar `Soles`, `Luna` y `Estrellas`. El selector se alimenta de datos reales y demuestra que no es una opción fija.
- **Sí:** Sembrar los 8 niños estáticos en `children`. Evita perder los datos visibles y deja una sola fuente de verdad.
- **No:** Conservar los niños estáticos en código junto a los nuevos. Mezclaría dos fuentes y rompería la persistencia de los perfiles.
- **Sí:** Resolver la guardería del usuario mediante `users.daycare_id` y RLS. La app ya es multi-guardería y no debe filtrar solo en el cliente.
- **Sí:** Permitir `INSERT` solo a `staff` y `admin`. Crear niños es una tarea de personal; un padre no debe poder hacerlo aunque conozca la API.
- **Sí:** Server Action con el cliente servidor. Mantiene las credenciales fuera del navegador, centraliza la validación y sigue el patrón de SPEC 11.
- **No:** Insertar con el cliente de navegador. Repartiría validación y errores entre cliente y RLS.
- **Sí:** `/kids` y `/kids/[id]` como server components con `router.refresh()` tras el alta. La fila mostrada es la real, con su UUID y defaults de la base.
- **Sí:** Usar el UUID de `children.id` en la ruta. Es el identificador canónico y no requiere columnas fuera del esquema.
- **No:** Añadir una columna `slug`. No está en la referencia y puede colisionar con nombres repetidos.
- **Sí:** `<input type="date">` nativo con `max` de hoy. Ofrece calendario accesible, valor ISO inequívoco y cero dependencias.
- **No:** Calendario personalizado. Añadiría teclado, foco y accesibilidad a mantener sin un requisito visual que lo justifique.
- **Sí:** Guardar `birth_date` y `enrolled_at` como `date` y formatear solo en la UI. Evita ambigüedades de zona horaria.
- **Sí:** Mostrar la fecha como `12 mar 2022`. Conserva el formato actual del perfil y la lista.
- **Sí:** Selector de sala sin preselección. Hace explícita la regla «todo niño tiene sala» y evita altas accidentales en la sala equivocada.
- **Sí:** Chips de alergias con catálogo fijo y etiquetas en inglés en la base. Cumple la convención del esquema y permite badges fiables.
- **No:** Texto libre de alergias. Generaría valores en español o no normalizados en `allergy_tags`.
- **Sí:** Agrupar la lista por sala con contador. Reemplaza el encabezado fijo «SALA SOLES», que deja de ser cierto con tres salas.
- **Sí:** Mantener la vinculación de padres de SPEC 05 en un overlay de sesión. Evita una regresión mientras `parent_children` no existe.
- **No:** Crear `parent_children` o sembrar padres. Requiere cuentas reales de Auth y pertenece a otra spec.
- **Sí:** Dejar la sección de padres vacía en los niños migrados. Es honesto con el estado real y no inventa datos.
- **Sí:** Descartar los textos de estado de la UI al migrar `medical_notes`. Se derivan de columnas, no son información médica.
- **No:** CRUD de salas, edición o borrado de niños. No forman parte del objetivo y merecen sus propias specs.
- **Sí:** Aplicar y verificar directamente en remoto tras inspeccionar destino e historial, como SPEC 08 y SPEC 09.

## Riesgos

| Riesgo | Mitigación |
| --- | --- |
| `/kids/[id]` recibe un texto que no es UUID y Postgres devuelve `22P02`. | Validar el formato UUID antes de consultar y llamar `notFound()` sin tocar la base. |
| Los enlaces y marcadores por slug dejan de existir al usar UUID. | Documentarlo en la spec y actualizar todas las tarjetas y enlaces internos en el mismo cambio. |
| La política de `INSERT` permite una sala de otra guardería si no se cruza `rooms` con `users`. | Incluir la verificación de `daycare_id` en el `WITH CHECK` y probarla con una sala ajena en transacción revertida. |
| El privilegio de columna del `INSERT` choca con columnas enviadas por el cliente o con el `SELECT` de retorno. | Enviar solo las cinco columnas permitidas y mantener el `SELECT` a nivel de tabla para leer la fila creada. |
| Los niños migrados pierden los padres visibles. | Aceptado y documentado: `parent_children` no existe; la sección muestra su estado vacío hasta la spec de vinculación real. |
| El formato del calendario nativo varía según el navegador. | El valor enviado es siempre ISO y el `lang="es"` del documento guía la presentación; la validación no depende del formato mostrado. |
| `enrolled_at` depende de la zona horaria del cliente. | Usar el default `current_date` de la base, no una fecha calculada en el navegador. |
| La migración se aplica al proyecto equivocado o con historial divergente. | Confirmar identificador e historial antes del despliegue y detenerse ante conflictos. |
| Un fallo de RLS o de red cierra el modal y hace creer que se guardó. | Mantener el modal abierto con el error y conservar los datos hasta confirmar el alta. |
| El overlay de padres de sesión se pierde al recargar y parece un fallo de persistencia. | Documentar el comportamiento; la persistencia de padres llega con `parent_children` en otra spec. |

## Lo que **no** está incluido en esta spec

- Gestión de salas desde la aplicación.
- Edición, archivo o borrado de niños.
- Creación de `parent_children`, invitaciones o cuentas de padres.
- Persistencia de la vinculación de padres de SPEC 05.
- Subida de fotos, avatares o consentimiento editable.
- Feed, publicaciones, resumen diario o notificaciones.
- Autorización por rol más allá del `INSERT` en `children`.
- Validaciones de edad, duplicados o reglas de negocio no definidas.
- Ruta independiente de alta, confirmación al descartar o borradores.
- Suite de pruebas permanente en el repositorio.

Cada elemento pertenece a una spec independiente si se necesita más adelante.
