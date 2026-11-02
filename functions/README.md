# Cloud Functions de VentaFlow

## Qué hace

`notifyAdminOnNewVendor`: cuando se crea un perfil en `vendedores/{uid}`
(un vendedor nuevo, pendiente de aprobación), manda un correo a los
admins con su nombre, correo y fecha. El disparo es la creación del
perfil: `aprobaciones/{uid}` no se crea al registrarse (su ausencia
significa "pendiente").

Los destinatarios se leen de `admins/` (cada uid con `true`) buscando
su correo en `vendedores/{uid}/email`. Si se define `ADMIN_EMAIL`, el
aviso va solo a ese correo. Un admin que se registra no se avisa a sí
mismo. Si el envío falla, se registra el error y no se reintenta (un
reintento duplicaría el correo).

La función corre en `asia-southeast1`, la misma región que la base de
datos: un trigger en otra región no vería los cambios.

## Configuración

Node 20. Instalar dependencias:

```bash
cd functions && npm install
```

Secretos (no van en el repo; se guardan con Secret Manager):

```bash
firebase functions:secrets:set SMTP_USER
firebase functions:secrets:set SMTP_PASS
```

Parámetros opcionales (con `firebase functions:params:set` o en el
despliegue): `SMTP_HOST` (por defecto `smtp.gmail.com`), `SMTP_PORT`
(por defecto `587`), `SMTP_FROM` (por defecto el mismo `SMTP_USER`) y
`ADMIN_EMAIL` (por defecto vacío: avisa a todos los admins).

Con Gmail, `SMTP_PASS` debe ser una contraseña de aplicación (la
cuenta necesita verificación en dos pasos). Con otro proveedor SMTP —
incluido un servidor propio en el futuro — solo cambian `SMTP_HOST`,
`SMTP_PORT`, `SMTP_USER` y `SMTP_PASS`; el código no se toca.

## Despliegue

Requiere el plan Blaze de Firebase: la función llama a un SMTP
externo, y el plan gratuito no permite esa salida.

```bash
firebase deploy --only functions
```

## Probar

La lógica pura (`email.js`: destinatarios y contenido) tiene pruebas
en `test/functions/email.test.ts`, que corren con la suite del repo.

El disparo completo solo se prueba desplegado: registrar un vendedor
de prueba desde la app y revisar la bandeja del admin y los registros
con `firebase functions:log`.
