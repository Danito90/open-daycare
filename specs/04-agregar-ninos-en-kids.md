# SPEC 04 — Agregar niños en Kids

> **Estado:** Implementado
> **Depende de:** SPEC 02
> **Fecha:** 2026-10-10
> **Objetivo:** Implementar el modal de alta de niños dentro de `/kids`, con validación local, campos opcionales y actualización en memoria de la lista y el perfil del nuevo niño.

## Alcance

**Incluye:**

- Convertir el botón `Agregar niño` de `/kids` en una acción funcional que abra un modal sobre la lista.
- Reproducir la composición visual de `open-daycare/references/pantallas/agregar-nino.dc.html`.
- Capturar nombre completo, fecha de nacimiento, sala, alergias y notas médicas.
- Marcar como obligatorios nombre completo, fecha de nacimiento y sala.
- Mostrar máscaras o placeholders de ejemplo para nombre, fecha y sala.
- Usar el formato `DD/MM/YYYY` para la fecha de nacimiento.
- Validar que la fecha exista y no sea futura.
- Usar un selector de sala con `Soles` como opción disponible inicialmente.
- Mostrar errores inline al guardar y actualizar el error de cada campo mientras se corrige.
- Permitir cancelar mediante `Cancelar`, X o clic en el fondo del modal, descartando los datos sin guardar.
- Agregar el niño creado a la lista visible de `/kids` y cerrar el modal después de un alta válida.
- Mantener los nuevos datos únicamente en memoria durante la sesión actual.
- Derivar el id en kebab-case, la inicial y la edad del nuevo registro.
- Crear valores visuales por defecto para avatar, fecha de ingreso y padres no vinculados.
- Enlazar la tarjeta nueva con `/kids/[id]` y mostrar allí el perfil con los valores derivados y predeterminados.
- Verificar el flujo en desktop y en el viewport móvil de `390 × 844`.

**Fuera de alcance (para futuras specs):**

- API, base de datos, autenticación o persistencia en `localStorage`.
- Edición o eliminación de niños.
- Gestión funcional de salas adicionales.
- Invitación o vinculación real de padres.
- Subida de fotografías.
- Validación de edad mínima o máxima.
- Detección o bloqueo de nombres duplicados.
- Rutas independientes como `/kids/agregar`.
- Confirmación antes de descartar datos no guardados.
- Acciones funcionales de editar, resumen del día o cierre de sesión.

## Modelo de datos

El registro creado reutilizará `Kid` de `open-daycare/app/data/kids.ts` y se administrará mediante un store/contexto cliente en memoria. El formulario usará una estructura separada para distinguir datos capturados de valores derivados:

```ts
type AddKidForm = {
  name: string;
  birthDate: string;
  room: "Soles";
  allergies: string;
  medicalNotes: string;
};

type KidsStore = {
  kids: Kid[];
  addKid: (form: AddKidForm) => Kid;
};
```

- `id` se generará a partir de `name` normalizado en kebab-case.
- `initial` será la primera letra visible del nombre.
- `age` se calculará a partir de `birthDate` y la fecha actual.
- `avatarBackground` y `avatarColor` usarán una combinación visual neutra predeterminada.
- `enrollmentDate` usará el mes y año actuales con el formato visual existente.
- `allergiesAndNotes` combinará las alergias y notas opcionales; si ambas están vacías mostrará un texto equivalente a “Sin alergias registradas”.
- `parents` comenzará como un arreglo vacío.
- El store se reiniciará al recargar la aplicación porque no habrá persistencia.

## Plan de implementación

1. Crear el store cliente compartido para los niños y exponer la colección inicial de SPEC 02 junto con `addKid`. Comprobación manual: `/kids` conserva los ocho niños existentes y el store puede agregar un registro nuevo en memoria.
2. Integrar el store en el layout o proveedor cliente compartido sin cambiar la navegación visual existente. Comprobación manual: `/`, `/kids` y los perfiles existentes siguen cargando con sus datos actuales.
3. Crear `open-daycare/app/kids/AddKidModal.tsx` con el encabezado, acciones, campos, selector de sala y estilos de la referencia. Comprobación manual: el modal se puede abrir, cancelar y cerrar desde X o el fondo.
4. Implementar el estado local del formulario y la validación de nombre, fecha real no futura y sala, incluyendo errores inline y placeholders de ejemplo. Comprobación manual: un envío incompleto no crea registros y cada error desaparece al corregir su campo.
5. Conectar `Agregar niño` en `open-daycare/app/kids/page.tsx` y `open-daycare/app/kids/KidsList.tsx` con el modal y el store. Comprobación manual: un alta válida cierra el modal y muestra una nueva tarjeta filtrable en la lista.
6. Adaptar el perfil de `open-daycare/app/kids/[id]/page.tsx` para resolver también los registros creados durante la sesión, conservar los perfiles iniciales y mostrar valores predeterminados para padres, alergias y fechas no capturadas. Comprobación manual: la tarjeta nueva navega a su perfil y un id desconocido conserva el estado 404 definido por la aplicación.
7. Ejecutar `npm run build`, `npx tsc --noEmit` y las pruebas Playwright de apertura, cancelación, validaciones, alta, búsqueda, perfil y responsive en desktop y `390 × 844`. Guardar capturas y logs exclusivamente bajo `.playwright-mcp/`.

## Criterios de aceptación

- [X] El botón `Agregar niño` de `/kids` abre un modal sin cambiar de ruta.
- [X] El modal reproduce la tarjeta, encabezado y jerarquía visual principal de `agregar-nino.dc.html`.
- [X] El modal muestra campos para nombre completo, fecha de nacimiento, sala, alergias y notas médicas.
- [X] Nombre completo, fecha de nacimiento y sala son obligatorios.
- [X] Los campos muestran ejemplos equivalentes a `Ej. Martina López`, `dd/mm/aaaa` y una sala seleccionable.
- [X] La sala se captura mediante un selector y contiene `Soles` como opción disponible.
- [X] Una fecha con formato incorrecto, calendario inválido o posterior al día actual muestra un error inline.
- [X] Un intento de guardar con campos obligatorios vacíos muestra errores inline y no agrega ningún niño.
- [X] Los errores se actualizan al corregir los campos correspondientes.
- [X] Las alergias y notas médicas pueden quedar vacías sin impedir el guardado.
- [X] Cancelar, X y clic en el fondo cierran el modal y descartan los datos sin guardar.
- [X] Un alta válida agrega exactamente un nuevo registro a la lista y cierra el modal.
- [X] El nuevo registro aparece en la búsqueda de `/kids` sin realizar peticiones de red.
- [X] El nuevo registro tiene un id estable derivado del nombre, inicial, edad calculada y sala seleccionada.
- [X] La tarjeta nueva enlaza a `/kids/[id]` y su perfil se puede abrir durante la sesión actual.
- [X] El perfil nuevo muestra valores predeterminados para avatar, ingreso y padres no vinculados.
- [X] Recargar la aplicación restaura la colección estática inicial y no conserva el niño creado.
- [X] `/kids` conserva las ocho tarjetas iniciales y su comportamiento existente.
- [X] Las pantallas modificadas no presentan desplazamiento horizontal en `390 × 844`.
- [X] El flujo conserva la composición visual principal de la referencia en viewport desktop.
- [X] `npm run build` finaliza correctamente desde `open-daycare/`.
- [X] `npx tsc --noEmit` finaliza correctamente desde `open-daycare/`.
- [X] Playwright verifica apertura, cierre, validaciones, alta, búsqueda, perfil y ausencia de overflow en desktop y móvil.
- [X] Las rutas verificadas no generan errores de aplicación en la consola del navegador.

## Decisiones tomadas y descartadas

- **Sí:** Usar un modal sobre `/kids`. Mantiene el flujo en la pestaña Kids y coincide con la referencia.
- **No:** Crear `/kids/agregar` o una página independiente. No se necesita una navegación adicional para un formulario contenido.
- **Sí:** Mantener los registros nuevos en un store cliente en memoria. Permite actualizar lista y perfil durante la sesión sin inventar un backend.
- **No:** Usar `localStorage`. La persistencia entre sesiones no forma parte de esta spec.
- **Sí:** Incluir alergias y notas como campos opcionales. Están presentes en la referencia y completan el perfil sin ampliar los requisitos obligatorios.
- **Sí:** Derivar los datos que el formulario no captura. Evita pedir padres, avatar o fecha de ingreso que pertenecen a funcionalidades futuras.
- **Sí:** Usar `Soles` como única sala inicial en un selector. Es la sala existente en los datos y en la referencia.
- **No:** Permitir texto libre para la sala. Podría crear valores incompatibles con la colección actual.
- **Sí:** Validar una fecha real no futura. Es una regla verificable sin imponer supuestos sobre la edad del niño.
- **No:** Validar duplicados o rangos de edad. Esas reglas no están definidas y requieren decisiones de negocio adicionales.
- **Sí:** Mantener el alta solo en memoria y reiniciarla al recargar. El comportamiento es explícito y evita simular persistencia real.
- **Sí:** Verificar con Playwright además de build y TypeScript. El modal y su adaptación responsive son parte central del objetivo.

## Riesgos

| Riesgo | Mitigación |
| --- | --- |
| El store cliente puede desincronizar la lista y el perfil durante una navegación. | Centralizar la colección en un proveedor compartido y verificar explícitamente el enlace del registro recién creado. |
| La conversión de `DD/MM/YYYY` puede aceptar fechas ambiguas. | Validar día, mes, año y fecha futura antes de construir el `Kid`. |
| El contenido opcional puede romper la composición del modal en móvil. | Permitir el apilado de campos y verificar `390 × 844` sin overflow. |
| Los datos derivados pueden parecer persistentes aunque se pierdan al recargar. | Documentar el alcance en la interfaz y mantener la prueba de reinicio en los criterios de aceptación. |
| La adaptación del perfil puede afectar el 404 existente de SPEC 02. | Conservar una resolución explícita para ids desconocidos y probar un id inválido durante la verificación. |

## Lo que **no** está incluido en esta spec

- Backend, API, base de datos, autenticación o persistencia entre sesiones.
- Edición, eliminación o duplicación controlada de niños.
- Administración de salas adicionales.
- Invitación y vinculación real de padres.
- Fotografías o avatares cargados por el usuario.
- Validación de edad mínima, máxima o reglas de negocio no definidas.
- Ruta independiente de alta.
- Confirmación antes de descartar el formulario.
- Acciones funcionales de editar, resumen del día o cierre de sesión.

Cada elemento pertenece a una spec independiente si se necesita más adelante.
