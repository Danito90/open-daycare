# Spec Delta

## Purpose

Dar a cada rol un lugar único donde ver y ajustar su cuenta —perfil, preferencias, hijos y sesión— sin mezclar opciones de staff con opciones de familia.

## ADDED Requirements

### Requirement: Una cuenta, dos variantes

`/cuenta` SHALL estar disponible para todo usuario autenticado y SHALL renderizar la variante de staff/admin o la de familia según el rol. La variante de staff SHALL NOT mostrar hijos ni consentimiento de fotos; la de familia SHALL NOT mostrar gestión de niños.

#### Scenario: Variante de staff

- **WHEN** un usuario `staff` o `admin` abre `/cuenta`
- **THEN** ve perfil, notificaciones, cambio de contraseña y cierre de sesión, sin hijos ni consentimiento de fotos

#### Scenario: Variante de familia

- **WHEN** un usuario `parent` abre `/cuenta`
- **THEN** ve perfil, sus hijos con consentimiento de fotos, notificaciones, cambio de contraseña y cierre de sesión

### Requirement: Tarjeta de perfil

La tarjeta SHALL mostrar el nombre completo, el email de la sesión y un subtítulo según el rol: rol y guardería para staff/admin, y los nombres de los hijos vinculados para la familia.

#### Scenario: Perfil de staff

- **WHEN** un usuario `staff` abre `/cuenta`
- **THEN** la tarjeta muestra su nombre, su email y `rol · guardería`

#### Scenario: Perfil de familia

- **WHEN** un usuario `parent` con dos hijos abre `/cuenta`
- **THEN** la tarjeta muestra su nombre, su email y los nombres de sus hijos

### Requirement: Edición del nombre

Todo usuario SHALL poder editar su nombre completo desde la cuenta. El nombre SHALL guardarse sin espacios sobrantes, SHALL NOT aceptar un valor vacío y SHALL reflejarse en el shell al guardar.

#### Scenario: Nombre válido

- **WHEN** el usuario guarda un nombre no vacío
- **THEN** el nombre persiste y el bloque de usuario del shell lo muestra actualizado

#### Scenario: Nombre vacío

- **WHEN** el usuario intenta guardar un nombre vacío o solo con espacios
- **THEN** ve un error de validación y el nombre anterior se conserva

### Requirement: Preferencias de notificación

La cuenta SHALL permitir activar o desactivar `Avisos cuando se publica algo` (`notify_on_post`) y `Resumen diario` (`daily_summary_enabled`), ambos activados por defecto, y los cambios SHALL persistir. La pantalla SHALL aclarar que todavía no se envían avisos.

#### Scenario: El cambio persiste

- **WHEN** el usuario desactiva "Avisos cuando se publica algo" y recarga la página
- **THEN** la preferencia sigue desactivada

#### Scenario: Aviso de función pendiente

- **WHEN** el usuario abre la sección de notificaciones
- **THEN** ve una nota que indica que todavía no se envían avisos

### Requirement: Consentimiento de fotos por hijo

La variante de familia SHALL listar cada hijo vinculado con nombre, edad, sala y un control de consentimiento de fotos que actualiza `children.photo_consent` al instante. Si la actualización falla, SHALL mostrar un error y conservar el valor anterior.

#### Scenario: Se guarda el consentimiento

- **WHEN** el padre cambia el consentimiento de fotos de su hijo
- **THEN** el nuevo valor persiste y se mantiene al recargar

#### Scenario: Falla al guardar

- **WHEN** la actualización del consentimiento devuelve un error
- **THEN** el control vuelve al valor anterior y se muestra un mensaje de error

### Requirement: Cambio de contraseña

La cuenta SHALL ofrecer "Cambiar contraseña" y SHALL llevar al flujo de recuperación por correo existente.

#### Scenario: Ir a recuperar contraseña

- **WHEN** el usuario elige "Cambiar contraseña"
- **THEN** llega a `/recuperar-contrasena`

### Requirement: Cierre de sesión

Ambas variantes SHALL ofrecer cerrar sesión. Al usarlo, la sesión SHALL terminar y el usuario SHALL llegar a `/login`.

#### Scenario: Cerrar sesión desde la cuenta

- **WHEN** el usuario elige "Cerrar sesión"
- **THEN** la sesión termina y queda en `/login`

### Requirement: Opciones no disponibles omitidas

La cuenta SHALL NOT mostrar acciones sin destino o sin implementación, como "Ayuda y soporte" o la subida de avatar.

#### Scenario: Sin acciones falsas

- **WHEN** el usuario abre `/cuenta` en cualquier variante
- **THEN** no ve "Ayuda y soporte" ni controles para subir o recortar un avatar
