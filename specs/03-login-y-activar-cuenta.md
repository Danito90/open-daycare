# SPEC 03 — Login y activación de cuenta

> **Estado:** Implementado
> **Depende de:** SPEC 02
> **Fecha:** 2026-10-10
> **Objetivo:** Implementar las pantallas responsive de login y activación de cuenta de OpenDayCare con navegación simulada y validación local, eliminando la selección de tipo de usuario del login.

## Alcance

**Incluye:**

- Crear la ruta `/login` mediante `app/(auth)/login/page.tsx`.
- Crear la ruta `/activar-cuenta` mediante `app/(auth)/activar-cuenta/page.tsx`.
- Reproducir la composición visual de `references/pantallas/login.dc.html`.
- Reproducir la composición visual de `references/pantallas/activar-cuenta.dc.html`.
- Eliminar por completo el bloque `INGRESO COMO` y los botones `Personal` y `Familia` del login.
- Renderizar campos vacíos en los formularios, sin valores de ejemplo precargados.
- Validar localmente los campos obligatorios y los formatos básicos.
- Mostrar errores inline junto a cada campo inválido y bloquear la navegación mientras existan errores.
- Navegar a `/` después de enviar correctamente cualquiera de los dos formularios.
- Mantener la tarjeta estática de invitación `Mateo · Sala Soles` en la pantalla de activación.
- Mantener enlaces funcionales entre `/login` y `/activar-cuenta`.
- Mantener visible el enlace `¿Olvidaste tu contraseña?` sin implementar un flujo de recuperación.
- Verificar el comportamiento en viewport desktop y móvil con Playwright.

**Fuera de alcance (para futuras specs):**

- Autenticación real, sesiones, cookies, tokens o integración con un backend.
- Persistencia de usuarios, invitaciones, credenciales o consentimiento.
- Creación real de cuentas.
- Recuperación de contraseña.
- Datos dinámicos para la invitación, el niño o la guardería.
- Rutas alternativas con extensión `.dc.html`.
- Nuevas pantallas posteriores al login o a la activación.

## Modelo de datos

Esta funcionalidad no introduce estructuras persistentes ni modelos compartidos. Cada pantalla mantiene únicamente estado local de formulario y errores.

```ts
type LoginForm = {
  email: string;
  password: string;
};

type ActivationForm = {
  invitationCode: string;
  email: string;
  password: string;
  photoConsent: boolean;
};
```

La información visual de la invitación (`Mateo`, `Sala Soles` e inicial `M`) es estática y no se obtiene de una fuente externa.

## Plan de implementación

1. Crear el grupo de rutas `app/(auth)/` y sus páginas `login/page.tsx` y `activar-cuenta/page.tsx`, dejando disponibles `/login` y `/activar-cuenta`.
2. Implementar la composición responsive del login con la identidad visual de la referencia, campos vacíos, enlace a activación y sin selector de Personal/Familia.
3. Añadir el estado local y la validación del login para requerir email válido y contraseña no vacía, mostrando errores inline y navegando a `/` cuando sea válido.
4. Implementar la composición responsive de activación con la tarjeta estática de invitación, código, email, contraseña, consentimiento y enlaces definidos.
5. Añadir el estado local y la validación de activación para requerir código, email válido, contraseña no vacía y consentimiento marcado, mostrando errores inline y navegando a `/` cuando sea válido.
6. Ejecutar build, comprobación de TypeScript y pruebas Playwright en desktop y móvil para verificar rutas, estados inválidos, navegación y fidelidad visual básica.

## Criterios de aceptación

- [x] `/login` carga sin errores de runtime.
- [x] `/activar-cuenta` carga sin errores de runtime.
- [x] El login no muestra los botones `Personal` ni `Familia`, ni el bloque `INGRESO COMO`.
- [x] Los campos del login aparecen vacíos al cargar la pantalla.
- [x] El login muestra un error inline si el email está vacío o no tiene formato válido.
- [x] El login muestra un error inline si la contraseña está vacía.
- [x] El login no navega a `/` mientras tenga errores de validación.
- [x] Un login válido navega a `/`.
- [x] La activación conserva la tarjeta estática `Mateo · Sala Soles`.
- [x] Los campos de activación aparecen vacíos al cargar la pantalla.
- [x] La activación muestra errores inline si falta el código, el email, la contraseña o el consentimiento.
- [x] La activación no navega a `/` mientras tenga errores de validación.
- [x] Una activación válida navega a `/`.
- [x] El enlace entre login y activación navega a la ruta correspondiente.
- [x] El enlace de recuperación de contraseña permanece visible sin iniciar un flujo no definido.
- [x] Las dos pantallas son utilizables sin desplazamiento horizontal en viewport móvil.
- [x] Las dos pantallas conservan la composición visual principal de sus referencias en viewport desktop.
- [x] `npm run build` finaliza correctamente.
- [x] `npx tsc --noEmit` finaliza correctamente.
- [x] Las comprobaciones Playwright de las rutas, validaciones y navegación finalizan correctamente.

## Decisiones tomadas y descartadas

- **Sí:** Usar un grupo de rutas `app/(auth)/` para mantener juntas las pantallas sin añadir el segmento `(auth)` a las URLs públicas.
- **No:** Crear `app/login/page.tsx` y `app/activar-cuenta/page.tsx` directamente; se eligió la agrupación de rutas solicitada.
- **Sí:** Usar `/` como destino simulado después de un envío válido porque el feed actual ya existe en esa ruta.
- **No:** Implementar autenticación real o persistencia; no hay backend ni modelo de usuarios definido.
- **Sí:** Validar localmente los formularios y mostrar errores inline para que el flujo sea verificable sin dependencias externas.
- **No:** Crear un flujo de recuperación de contraseña; queda fuera de esta spec.
- **Sí:** Mantener la tarjeta de invitación como contenido estático para conservar la referencia visual sin inventar un contrato de datos.
- **No:** Mantener la selección Personal/Familia; el login representa un único flujo y esos botones deben eliminarse.
- **Sí:** Usar campos vacíos en lugar de los valores de demostración de las referencias para evitar simular credenciales reales.

## Riesgos

| Riesgo | Mitigación |
| --- | --- |
| La navegación simulada puede confundirse con autenticación real. | Mantener el flujo explícitamente local y documentar autenticación, sesiones y backend como fuera de alcance. |
| La fidelidad visual puede romperse en pantallas pequeñas. | Verificar los dos breakpoints con Playwright y evitar desbordamiento horizontal. |
| El enlace de recuperación no tiene destino funcional. | Mantenerlo como elemento informativo visible y excluir explícitamente el flujo de recuperación. |

## Lo que **no** está incluido en esta spec

- Autenticación real y gestión de sesiones.
- Persistencia o creación de cuentas.
- Recuperación de contraseña.
- Invitaciones y datos de niños obtenidos dinámicamente.
- Pantallas adicionales posteriores al login o a la activación.
