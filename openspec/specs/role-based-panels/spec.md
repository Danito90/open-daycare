# role-based-panels Specification

## Purpose

Define qué panel ve cada rol —menú, marca y rutas permitidas— para que la familia y el staff compartan la aplicación sin compartir herramientas, y para que ninguna ruta de staff quede expuesta a una familia.

## Requirements

### Requirement: Menú de navegación por rol

El shell SHALL mostrar un menú distinto según el rol del usuario autenticado. `staff` y `admin` SHALL ver `Feed` (`/`), `Niños` (`/kids`) y `Mi cuenta` (`/cuenta`). `parent` SHALL ver `Feed` (`/`), `Resumen del día` (`/resumen`) y `Mi cuenta` (`/cuenta`).

#### Scenario: El staff ve su menú

- **WHEN** un usuario con rol `staff` abre cualquier pantalla autenticada
- **THEN** el menú muestra Feed, Niños y Mi cuenta, y no muestra Resumen del día

#### Scenario: La familia ve su menú

- **WHEN** un usuario con rol `parent` abre cualquier pantalla autenticada
- **THEN** el menú muestra Feed, Resumen del día y Mi cuenta, y no muestra Niños

### Requirement: Ningún ítem del menú apunta a una ruta inexistente

Todo ítem del menú SHALL corresponder a una ruta implementada. `Avisos` SHALL NOT mostrarse mientras su pantalla no exista.

#### Scenario: Avisos no aparece

- **WHEN** un usuario de cualquier rol abre cualquier pantalla autenticada
- **THEN** el menú no muestra Avisos y ningún ítem enlaza a un ancla o a una ruta sin implementar

### Requirement: Sección activa

El ítem del menú correspondiente a la pantalla actual SHALL marcarse como activo para el rol que la está viendo.

#### Scenario: Feed activo

- **WHEN** un usuario abre `/`
- **THEN** el ítem Feed se muestra como activo

#### Scenario: Cuenta activa para ambos roles

- **WHEN** un usuario de cualquier rol abre `/cuenta`
- **THEN** el ítem Mi cuenta se muestra como activo

### Requirement: Marca según el rol

La marca SHALL mostrar `OpenDayCare` con el nombre de la guardería como subtítulo para `staff` y `admin`, y `Familia` como subtítulo para `parent`. El disparador de "Nueva publicación" SHALL mostrarse solo a `staff` y `admin`.

#### Scenario: Marca de staff

- **WHEN** un usuario con rol `staff` abre el panel
- **THEN** el subtítulo de la marca es el nombre de su guardería y el botón Nueva publicación está disponible

#### Scenario: Marca de familia

- **WHEN** un usuario con rol `parent` abre el panel
- **THEN** el subtítulo de la marca es `Familia` y no existe botón ni acceso para publicar

### Requirement: Admin opera como staff

`admin` SHALL recibir el mismo menú, marca y acceso que `staff` en todas las pantallas de este cambio.

#### Scenario: Admin usa el panel de staff

- **WHEN** un usuario con rol `admin` abre `/kids`
- **THEN** accede al contenido y ve el menú de staff con el botón Nueva publicación

### Requirement: Rutas de staff bloqueadas para la familia

`/kids` y `/kids/[id]` SHALL ser accesibles solo a `staff` y `admin`. Un `parent` autenticado que solicite esas rutas SHALL ser redirigido a `/` sin que se muestren datos de ningún niño.

#### Scenario: La familia no entra a la lista de niños

- **WHEN** un usuario con rol `parent` solicita `/kids`
- **THEN** es redirigido a `/` y no ve la pantalla de gestión

#### Scenario: La familia no entra al perfil de un niño

- **WHEN** un usuario con rol `parent` solicita `/kids/<id>`, con o sin vínculo al niño
- **THEN** es redirigido a `/` y no ve datos del niño

#### Scenario: El staff sí entra

- **WHEN** un usuario con rol `staff` solicita `/kids`
- **THEN** ve la pantalla de gestión con sus niños y salas

### Requirement: Resumen del día bloqueado para el staff

`/resumen` SHALL ser accesible solo a `parent`. Un usuario `staff` o `admin` que solicite esa ruta SHALL ser redirigido a `/`.

#### Scenario: El staff no entra al resumen de familia

- **WHEN** un usuario con rol `staff` solicita `/resumen`
- **THEN** es redirigido a `/` y no ve datos de niños

#### Scenario: La familia sí entra

- **WHEN** un usuario con rol `parent` solicita `/resumen`
- **THEN** accede al resumen de su hijo

### Requirement: Rol desconocido aplica mínimo privilegio

Un usuario autenticado cuyo rol no sea reconocido (`null` o un valor no soportado) SHALL recibir el menú de familia y SHALL quedar bloqueado de las rutas de staff.

#### Scenario: Perfil sin rol

- **WHEN** un usuario autenticado sin rol reconocido abre el panel
- **THEN** ve el menú de familia y al solicitar `/kids` es redirigido a `/`

### Requirement: El bloqueo no cierra la sesión

Una redirección por rol SHALL NOT terminar la sesión del usuario.

#### Scenario: La familia sigue autenticada después del bloqueo

- **WHEN** un usuario con rol `parent` es redirigido desde `/kids`
- **THEN** su sesión continúa activa y puede abrir `/` y `/cuenta` sin volver a iniciar sesión
