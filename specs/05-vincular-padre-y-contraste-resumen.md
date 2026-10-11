# SPEC 05 — Vincular padre y corregir contraste del resumen

> **Estado:** Implementado
> **Depende de:** SPEC 04
> **Fecha:** 2026-10-11
> **Objetivo:** Implementar el modal local para invitar a otro padre desde el perfil de un niño y garantizar que `Resumen del día` se muestre con texto e icono blancos sobre su botón oscuro.

## Alcance

**Incluye:**

- Convertir `Vincular otro padre` en una acción que abra un modal sin cambiar de ruta.
- Mostrar el modal dentro de cualquier perfil `/kids/[id]` usando el nombre del niño actual.
- Reproducir la composición visual principal de `open-daycare/references/pantallas/vincular-padre.dc.html`.
- Mostrar los campos obligatorios de nombre del padre o madre y email.
- Mostrar las opciones de parentesco `Mamá`, `Papá` y `Tutor/a` sin selección inicial.
- Validar nombre, email con formato válido y parentesco antes de enviar.
- Generar al abrir el modal un código local de invitación de cinco caracteres alfanuméricos en mayúsculas.
- Mostrar el código generado y el texto `Vence en 7 días` dentro del modal.
- Permitir cerrar el modal mediante X o clic en el fondo, descartando los datos no enviados.
- Agregar al perfil el nuevo padre con estado `pending` después de un envío válido.
- Mostrar la nueva fila con inicial, nombre, parentesco y estado `PENDIENTE`.
- Mantener la invitación y el código únicamente en memoria durante la sesión actual.
- Garantizar que el texto y el icono de `Resumen del día` sean blancos sobre el botón marrón existente.
- Verificar el flujo en viewport desktop y móvil de `390 × 844`.

**Fuera de alcance (para futuras specs):**

- Envío real de emails o invitaciones.
- API, base de datos, autenticación, sesiones o integración con backend.
- Persistencia en `localStorage`, `sessionStorage` o cualquier otro almacenamiento.
- Guardar email o código dentro de `ParentLink`, ya que no se muestran en la fila actual.
- Confirmación, aceptación o activación de la invitación.
- Reenvío, cancelación o eliminación de invitaciones pendientes.
- Edición o eliminación de padres vinculados.
- Crear una pantalla o ruta independiente para vincular padres.
- Implementar el contenido o navegación funcional de `Resumen del día`.
- Añadir una entrada de vinculación desde la lista `/kids`.

## Modelo de datos

La invitación usa estado local de formulario y reutiliza `ParentLink` para el registro visual pendiente. No se agregan campos persistentes al modelo actual.

```ts
type LinkParentForm = {
  name: string;
  email: string;
  relationship: "Mamá" | "Papá" | "Tutor/a" | "";
};

type InvitationState = {
  code: string;
  expiresInDays: 7;
};

type ParentLink = {
  name: string;
  relationship: string;
  status: "active" | "pending";
  initial: string;
  avatarBackground: string;
};
```

- `code` se genera al abrir el modal con cinco caracteres alfanuméricos en mayúsculas.
- `email` solo se usa para la validación local y no se conserva en `ParentLink`.
- El nuevo registro usa `status: "pending"`.
- La inicial se deriva de la primera letra visible del nombre.
- El color del avatar usa un valor visual predeterminado compatible con el perfil actual.
- El estado del formulario, el código y los padres agregados se pierden al recargar la aplicación.

## Plan de implementación

1. Extender `open-daycare/app/components/kids-provider.tsx` con una acción para agregar un `ParentLink` pendiente al niño identificado, manteniendo la colección en memoria. Comprobación manual: el proveedor conserva los niños iniciales y puede actualizar únicamente el perfil seleccionado.
2. Crear `open-daycare/app/kids/LinkParentModal.tsx` con el encabezado, información contextual, inputs, selector de parentesco, código generado, vencimiento, botón de envío y cierre visual de la referencia. Comprobación manual: el componente puede abrirse y cerrarse sin cambiar de ruta.
3. Implementar en `LinkParentModal.tsx` el estado del formulario, la generación del código de cinco caracteres y la validación inline de nombre, email y parentesco. Comprobación manual: un envío incompleto no actualiza el perfil y los errores desaparecen al corregir cada campo.
4. Integrar el modal en `open-daycare/app/kids/[id]/page.tsx`, conectarlo con `Vincular otro padre` y actualizar el perfil mediante el proveedor después de un envío válido. Comprobación manual: una invitación válida cierra el modal y muestra una nueva fila `PENDIENTE` en el perfil correcto.
5. Ajustar en `open-daycare/app/kids/[id]/page.tsx` las clases de `Resumen del día` para que texto e icono mantengan contraste blanco sobre el fondo oscuro, sin añadir comportamiento al resumen. Comprobación manual: ambos elementos se leen claramente en desktop y móvil.
6. Ejecutar `npm run build`, `npx tsc --noEmit` y las pruebas Playwright de apertura, cierre, validaciones, generación de código, envío, actualización del perfil, contraste y ausencia de overflow en desktop y `390 × 844`. Guardar capturas y logs exclusivamente bajo `.playwright-mcp/`.

## Criterios de aceptación

- [X] `Vincular otro padre` abre un modal sin cambiar la URL.
- [X] El modal muestra el nombre del niño del perfil actual.
- [X] El modal reproduce la composición visual principal de `vincular-padre.dc.html`.
- [X] El modal muestra inputs para nombre y email.
- [X] El modal muestra exactamente las opciones `Mamá`, `Papá` y `Tutor/a`.
- [X] Ningún parentesco aparece seleccionado inicialmente.
- [X] Un nombre vacío muestra un error inline y bloquea el envío.
- [X] Un email vacío o inválido muestra un error inline y bloquea el envío.
- [X] Ningún parentesco seleccionado muestra un error inline y bloquea el envío.
- [X] Los errores desaparecen al corregir los campos correspondientes.
- [X] El código se genera al abrir el modal y contiene exactamente cinco caracteres alfanuméricos en mayúsculas.
- [X] El modal muestra el código generado y `Vence en 7 días`.
- [X] X cierra el modal sin agregar un padre.
- [X] Clic en el fondo cierra el modal sin agregar un padre.
- [X] Un envío válido cierra el modal y agrega exactamente un padre al perfil actual.
- [X] El padre agregado aparece con estado `PENDIENTE`.
- [X] El padre agregado muestra nombre, parentesco e inicial derivados del formulario.
- [X] El email y el código no se muestran ni se guardan en `ParentLink`.
- [X] Recargar la aplicación restaura la colección inicial y elimina los padres agregados durante la sesión.
- [X] El botón `Resumen del día` muestra texto blanco.
- [X] El icono de `Resumen del día` se muestra blanco.
- [X] El flujo no presenta desplazamiento horizontal en `390 × 844`.
- [X] `npm run build` finaliza correctamente desde `open-daycare/`.
- [X] `npx tsc --noEmit` finaliza correctamente desde `open-daycare/`.
- [X] Playwright verifica apertura, cancelación, validaciones, código, envío, actualización, contraste y responsive.
- [X] Las rutas verificadas no generan errores de aplicación en la consola del navegador.

## Decisiones tomadas y descartadas

- **Sí:** Usar un modal dentro de `/kids/[id]`. El flujo pertenece al contexto del niño y la referencia representa una ventana contenida.
- **No:** Crear una ruta independiente para vincular padres. No se necesita navegación adicional para una invitación local.
- **Sí:** Agregar el padre como `pending` después de un envío válido. Hace visible el resultado sin simular una aceptación real.
- **No:** Cerrar el modal sin modificar el perfil. No permitiría verificar que la invitación fue creada.
- **Sí:** Generar un código local de cinco caracteres alfanuméricos en mayúsculas. Mantiene la forma de la referencia sin inventar persistencia o un servicio externo.
- **No:** Usar el código fijo `7K4P9`. El código debe cambiar entre aperturas para representar invitaciones distintas.
- **Sí:** Ofrecer únicamente `Mamá`, `Papá` y `Tutor/a`. Son las opciones definidas por la referencia.
- **No:** Permitir texto libre o seleccionar un parentesco por defecto. Podría crear valores no definidos o enviar un dato no confirmado.
- **Sí:** Mantener email y código como datos transitorios. El listado actual solo necesita datos visuales de `ParentLink`.
- **No:** Ampliar `ParentLink` con email y código. No hay una vista ni comportamiento que los consuma en esta spec.
- **Sí:** Mantener los datos en memoria. Es consistente con el alcance local de SPEC 04 y no simula un backend.
- **No:** Usar API, base de datos o `localStorage`. La persistencia y el envío real requieren decisiones y contratos propios.
- **Sí:** Corregir solo el contraste de `Resumen del día`. La implementación de su contenido queda fuera de esta spec.
- **No:** Implementar el resumen o cambiar su destino. Sería una funcionalidad independiente.

## Riesgos

| Riesgo | Mitigación |
| --- | --- |
| El modal puede desbordarse en pantallas pequeñas. | Usar composición adaptable y verificar explícitamente el viewport `390 × 844`. |
| El código local puede parecer una invitación real. | Mantener el flujo sin red, documentar que es temporal y mostrar solo el estado visual pendiente. |
| El proveedor puede actualizar un niño incorrecto. | Pasar el `kidId` explícito y verificar que solo el perfil seleccionado recibe la nueva fila. |
| El estado transitorio puede confundirse con persistencia. | Probar la recarga y mantener la pérdida de datos como criterio de aceptación. |
| El contraste puede depender de clases heredadas o estilos globales. | Verificar color computado de texto e icono en Playwright sobre el botón oscuro. |

## Lo que **no** está incluido en esta spec

- Envío real de invitaciones o emails.
- API, base de datos, autenticación, sesiones o persistencia.
- Guardado de email o código en `ParentLink`.
- Aceptación, activación, reenvío, cancelación o eliminación de invitaciones.
- Edición o eliminación de padres vinculados.
- Ruta independiente o acción desde la lista `/kids`.
- Implementación funcional de `Resumen del día`.

Cada elemento pertenece a una spec independiente si se necesita más adelante.
