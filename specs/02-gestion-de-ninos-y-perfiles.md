# SPEC 02 — Gestión de niños y perfiles

> **Status:** Implementado
> **Depends on:** SPEC 01
> **Date:** 2026-10-05
> **Objective:** Crear las rutas `/kids` y `/kids/[id]` siguiendo las referencias visuales de niños y perfil de niño, migrando la navegación compartida y la home a Tailwind.

## Scope

**In:**

- Crear la ruta `/kids` con la lista estática de los 8 niños de la referencia `open-daycare/references/pantallas/ninos.dc.html`.
- Crear la ruta dinámica `/kids/[id]` con un perfil completo para cada uno de los 8 niños.
- Definir ids estables para los niños y enlazar cada tarjeta de `/kids` con su perfil correspondiente.
- Implementar búsqueda local por nombre en `/kids`.
- Mostrar un estado vacío cuando la búsqueda no encuentre coincidencias.
- Mostrar `notFound()` para ids inexistentes en `/kids/[id]`.
- Mantener la navegación lateral de escritorio y el menú móvil de SPEC 01 en las nuevas rutas.
- Extraer la navegación y el layout compartidos para reutilizarlos en `/`, `/kids` y `/kids/[id]`.
- Migrar la home `/` y las nuevas pantallas a clases Tailwind, manteniendo la apariencia actual de la home.
- Reproducir la estructura, textos, colores, tipografías, espaciados, bordes, sombras, radios e iconos de las dos referencias.
- Mantener como contenido estático en memoria los datos de niños, perfiles, padres vinculados, alergias, notas, sala, nacimiento e ingreso.
- Mantener visibles pero no funcionales las acciones de agregar niño, editar, resumen del día, vincular padre, etiquetas de vinculación y cierre de sesión.
- Verificar las pantallas en desktop y en el viewport móvil de `390 × 844`.

**Out of scope (for future specs):**

- API, base de datos, autenticación, autorización o persistencia de niños y perfiles.
- Formularios funcionales para agregar o editar niños.
- Resumen real del día, registro de actividades o historial del niño.
- Invitación, vinculación, eliminación o administración real de padres.
- Subida de fotografías o gestión de alergias y notas desde la interfaz.
- Rutas funcionales para agregar niño, editar, resumen del día, vincular padre, avisos, cuenta o cierre de sesión.
- Migración de otros módulos distintos de la home, la navegación compartida y las dos nuevas rutas.

## Data model

La aplicación usará una colección estática en memoria con una estructura equivalente a la siguiente:

```ts
type ParentLink = {
  name: string;
  relationship: string;
  status: "active" | "pending";
  initial: string;
};

type Kid = {
  id: string;
  name: string;
  initial: string;
  age: number;
  avatarBackground: string;
  avatarColor: string;
  room: "Soles";
  allergyLabel?: string;
  birthDate: string;
  enrollmentDate: string;
  allergiesAndNotes: string;
  parents: ParentLink[];
};

const kids: Kid[] = [
  // Los 8 registros estáticos de la referencia.
];
```

- Los ids serán kebab-case y serán los segmentos usados en `/kids/[id]`.
- La colección será la única fuente de datos de la lista y los perfiles.
- Los datos de los 8 perfiles serán coherentes con los nombres, edades, colores e indicadores visibles en `ninos.dc.html`.
- El perfil de Mateo conservará los datos concretos visibles en `perfil-nino.dc.html`.
- Los demás perfiles tendrán valores estáticos completos definidos durante la implementación, sin recurrir a una fuente externa.
- No se guardarán cambios entre sesiones.

## Implementation plan

1. Crear la colección tipada de niños y padres vinculados en un módulo estático del app root, incluyendo los 8 ids, datos de lista y datos completos de perfil. Manual check: cada registro tiene la información necesaria para renderizar ambas pantallas.
2. Extraer los iconos, navegación, sidebar, menú móvil y shell de aplicación que actualmente viven en `open-daycare/app/page.tsx` a componentes compartidos. Manual check: la home sigue mostrando la navegación desktop y puede abrir y cerrar el menú móvil.
3. Migrar la home `/` desde clases definidas en `globals.css` a clases Tailwind, conservando su contenido y comportamiento de SPEC 01. Manual check: `/` mantiene la estructura del feed y no presenta overflow horizontal en `390 × 844`.
4. Ajustar `open-daycare/app/globals.css` y `open-daycare/app/layout.tsx` para conservar únicamente la base global, las fuentes, la paleta y las reglas necesarias para el uso compartido de Tailwind. Manual check: Fredoka y Nunito siguen aplicándose a los mismos roles visuales.
5. Crear `open-daycare/app/kids/page.tsx` con el encabezado de gestión, botón visual de agregar, buscador, agrupación de Sala Soles y tarjetas enlazadas a `/kids/[id]`. Manual check: la ruta muestra los 8 niños y el filtro actualiza la lista en memoria.
6. Añadir el estado vacío de `/kids` para búsquedas sin coincidencias, conservando el buscador, el encabezado de sala y un mensaje verificable. Manual check: una búsqueda que no coincide no muestra tarjetas y sí muestra el estado vacío.
7. Crear `open-daycare/app/kids/[id]/page.tsx` para resolver el id contra la colección, renderizar el perfil completo y llamar a `notFound()` cuando no exista. Manual check: `/kids/mateo-fernandez` muestra el perfil de Mateo y un id inexistente devuelve 404.
8. Aplicar la adaptación responsive y los estados de foco de las referencias a `/kids` y `/kids/[id]`, incluyendo el menú móvil compartido, tarjetas en una columna y paneles legibles. Manual check: ambas rutas funcionan en desktop y en `390 × 844` sin overflow horizontal.
9. Ejecutar `npm run build`, `npx tsc --noEmit` y la verificación Playwright de `/`, `/kids` y un perfil válido e inválido en desktop y móvil. Guardar las capturas y cualquier artefacto exclusivamente bajo `.playwright-mcp/`.

## Acceptance criteria

- [X] `/` mantiene el contenido y comportamiento de SPEC 01 después de la migración a Tailwind.
- [X] `/kids` carga sin errores y muestra exactamente 8 tarjetas de niños de Sala Soles.
- [X] Las tarjetas muestran los nombres, edades, iniciales, indicadores y estados de vinculación definidos por la referencia.
- [X] Cada tarjeta enlaza a un id estable en `/kids/[id]`.
- [X] El buscador filtra localmente por nombre sin realizar peticiones de red.
- [X] Una búsqueda sin coincidencias muestra el estado vacío y no muestra tarjetas.
- [X] Cada uno de los 8 ids válidos renderiza un perfil completo con nombre, edad, sala, datos básicos, alergias/notas y padres vinculados.
- [X] El perfil de Mateo conserva “Mateo Fernández”, “3 años · Sala Soles”, “Alergia al maní”, “12 mar 2022”, “feb 2025” y los padres visibles en la referencia.
- [X] Un id inexistente en `/kids/[id]` responde con el estado 404 de Next.js mediante `notFound()`.
- [X] El enlace “Volver a Niños” retorna desde un perfil válido a `/kids`.
- [X] La navegación lateral marca “Niños” como sección activa en `/kids` y en `/kids/[id]`.
- [X] En `390 × 844`, la navegación de escritorio se sustituye por el botón de hamburguesa y el panel móvil compartido.
- [X] El menú móvil se cierra desde su botón, desde una opción de navegación y desde el fondo exterior.
- [X] `/kids` y `/kids/[id]` reproducen la jerarquía visual de sus referencias, incluyendo paleta, tipografías Fredoka/Nunito, espaciado, bordes, radios, sombras e iconos.
- [X] Las acciones de agregar, editar, resumen del día, vincular padre y cierre de sesión no ejecutan operaciones reales ni requieren rutas adicionales.
- [X] No se agregan llamadas a API, base de datos, almacenamiento local ni autenticación.
- [X] `npm run build` completa correctamente desde `open-daycare/`.
- [X] `npx tsc --noEmit` completa correctamente desde `open-daycare/`.
- [X] La verificación Playwright confirma `/`, `/kids`, un perfil válido y un id inválido en desktop y `390 × 844`, con artefactos bajo `.playwright-mcp/`.
- [X] Las rutas verificadas no generan errores de aplicación en la consola del navegador.

## Decisions

- **Yes:** Crear una única spec para `/kids` y `/kids/[id]`. Comparten navegación, datos, diseño y flujo lista-detalle.
- **Yes:** Usar datos estáticos por id para los 8 niños. La petición es una adaptación visual y no incluye backend.
- **Yes:** Implementar búsqueda local y un estado vacío. Son comportamientos contenidos en la pantalla de lista.
- **Yes:** Usar `notFound()` para ids inexistentes. Es el estado semántico adecuado para una ruta dinámica sin registro.
- **Yes:** Extraer la navegación y el shell compartidos y actualizar `/` para usarlos. Evita duplicar el menú móvil y conserva el comportamiento existente.
- **Yes:** Migrar la home y las nuevas pantallas a Tailwind. Es una decisión explícita del usuario y debe aplicarse de forma consistente al conjunto de pantallas de esta spec.
- **Yes:** Completar los 8 perfiles con datos estáticos coherentes. La referencia no define todos los campos de los siete perfiles restantes, por lo que esos valores se fijarán durante la implementación sin introducir persistencia.
- **No:** Crear rutas placeholder para acciones futuras. Mantenerlas visuales evita ampliar el alcance con pantallas sin comportamiento definido.
- **No:** Implementar API, base de datos, autenticación o persistencia. Corresponde a specs posteriores.
- **Yes:** Validar visualmente con Playwright además de build y TypeScript. La fidelidad a las referencias es parte explícita del objetivo.

## Risks

| Risk | Mitigation |
| --- | --- |
| La migración de la home a Tailwind cambia accidentalmente su apariencia | Comparar `/` con la referencia y con el estado de SPEC 01 en desktop y `390 × 844` antes de cerrar la implementación. |
| La extracción del layout rompe el estado del menú móvil | Mantener el estado en el shell compartido y verificar apertura, cierre por overlay, cierre y navegación en las tres rutas. |
| Los datos completados para siete perfiles no están definidos por la referencia | Mantenerlos estáticos, coherentes y documentados en la colección; no presentar esos datos como provenientes de un backend real. |
| El contenido del perfil desborda en móvil | Usar layout responsive, permitir el apilado de columnas y comprobar explícitamente `390 × 844` sin overflow horizontal. |
| Los enlaces visuales a funciones futuras se interpretan como funcionalidades reales | Mantenerlos sin operaciones y verificar que no se crean rutas ni llamadas de red para esas acciones. |

## What is **not** in this spec

- Backend, API, base de datos, autenticación o persistencia.
- Alta, edición, eliminación o administración real de niños.
- Resumen del día, historial o registro de actividades.
- Invitaciones y vinculación real de padres.
- Gestión funcional de alergias, notas o fotografías.
- Rutas adicionales para acciones futuras.
- Funcionalidad real de cierre de sesión.

Cada elemento pertenece a una spec independiente si se necesita más adelante.
