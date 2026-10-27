# Spec Delta

## Purpose

Ofrecer a la familia un resumen diario del niño —comidas, siestas, cantidad de momentos y la línea de tiempo del día— construido solo con las publicaciones que ya puede leer, sin capturar datos nuevos.

## ADDED Requirements

### Requirement: Contenido calculado de las publicaciones

El resumen SHALL construirse exclusivamente a partir de las publicaciones del día del niño seleccionado. SHALL NOT mostrar métricas que ninguna publicación pueda respaldar, como minutos de siesta o ánimo del día.

#### Scenario: Solo datos respaldados por publicaciones

- **WHEN** un padre abre el resumen de un niño
- **THEN** las métricas y la línea de tiempo provienen de las publicaciones de ese día y no se muestra siesta en minutos ni ánimo del día

### Requirement: Selección de niño

El resumen SHALL mostrar un niño a la vez. Con un solo hijo vinculado SHALL mostrarlo sin selector. Con varios SHALL ofrecer un selector y el hijo elegido SHALL conservarse en la URL mediante el parámetro `nino`.

#### Scenario: Un solo hijo

- **WHEN** el padre tiene un único hijo vinculado
- **THEN** el resumen muestra a ese hijo sin selector

#### Scenario: Varios hijos

- **WHEN** el padre tiene más de un hijo vinculado
- **THEN** el resumen muestra un selector con todos sus hijos y al elegir otro el parámetro `nino` cambia y el contenido se actualiza

### Requirement: Hijo inválido o ajeno

Si el parámetro `nino` no corresponde a un hijo vinculado al padre, el resumen SHALL mostrar el primer hijo vinculado en orden alfabético y SHALL NOT exponer ningún dato del niño solicitado.

#### Scenario: Identificador ajeno

- **WHEN** un padre abre `/resumen?nino=<id-de-un-niño-ajeno>`
- **THEN** se muestra el primer hijo vinculado y no aparece ningún dato del niño ajeno

#### Scenario: Identificador inválido

- **WHEN** un padre abre `/resumen?nino=no-es-un-uuid`
- **THEN** se muestra el primer hijo vinculado sin error visible

### Requirement: Día en la zona horaria de la guardería

El día del resumen SHALL calcularse con la zona horaria de la guardería (`DAYCARE_TIME_ZONE`), no con UTC.

#### Scenario: Después de las 18:00 locales

- **WHEN** en la guardería son las 23:30 del martes y en UTC ya es miércoles
- **THEN** el resumen sigue mostrando el martes local y sus publicaciones

### Requirement: Métricas del día

El resumen SHALL mostrar tres métricas del día local: cantidad de comidas (publicaciones de tipo `meal`), cantidad de siestas (publicaciones de tipo `nap`) y cantidad de momentos (todas las publicaciones del día). SHALL contar solo publicaciones legibles por el padre.

#### Scenario: Conteo por tipo

- **WHEN** el niño tiene dos publicaciones `meal`, una `nap` y una `activity` en el día
- **THEN** el resumen muestra 2 comidas, 1 siesta y 4 momentos

#### Scenario: Sin publicaciones

- **WHEN** el niño no tiene publicaciones ese día
- **THEN** las tres métricas muestran 0

### Requirement: Línea de tiempo del día

El resumen SHALL listar las publicaciones del día de la más reciente a la más antigua. Cada entrada SHALL mostrar la hora local, el título o, si no tiene, la etiqueta de su tipo, y el cuerpo del texto.

#### Scenario: Orden y formato

- **WHEN** el niño tiene publicaciones a las 09:40 y a las 14:20
- **THEN** la de 14:20 aparece primero y cada entrada muestra hora, título y cuerpo

#### Scenario: Publicación sin título

- **WHEN** una publicación del día no tiene título
- **THEN** su entrada muestra la etiqueta del tipo en lugar del título

### Requirement: Estados vacíos

Sin hijos vinculados, el resumen SHALL indicar que todavía no hay niños vinculados. Con hijos pero sin publicaciones ese día, SHALL indicar que no hay novedades del día.

#### Scenario: Sin hijos vinculados

- **WHEN** un padre sin hijos vinculados abre `/resumen`
- **THEN** ve un mensaje que indica que todavía no tiene niños vinculados

#### Scenario: Sin novedades del día

- **WHEN** un padre con hijos abre el resumen de un niño sin publicaciones hoy
- **THEN** ve un mensaje que indica que no hay novedades de ese día

### Requirement: Solo lectura

El resumen SHALL ser de solo lectura. SHALL NOT permitir crear, editar, reaccionar ni comentar desde esa pantalla.

#### Scenario: Sin acciones de escritura

- **WHEN** un padre abre el resumen del día
- **THEN** no hay botones ni controles para publicar, editar, reaccionar o comentar
