# VentaFlow — Puesta en marcha de roles (vendedor / cliente)

La app ya trae el código de autenticación con 2 roles. Para que funcione
en el proyecto de Firebase **app-venta-f07d9** faltan 2 pasos en la
consola (no se pueden hacer desde el código):

## 0. Variables de entorno

La configuración de Firebase vive en el archivo `.env` de la raíz
(variables `VITE_FIREBASE_*`, ver plantilla `.env.example`). El `.env`
no se commitea: en cada máquina hay que crearlo, y en el hosting
(Vercel) hay que declarar las mismas variables en el panel del
proyecto, porque Vite las incrusta al compilar.

## 1. Habilitar el proveedor Email/Password

Consola de Firebase → **Authentication** → **Sign-in method** →
**Correo electrónico/contraseña** → Habilitar → Guardar.

Sin esto, registros e inicios de sesión fallan con
`auth/operation-not-allowed`.

## 2. Publicar las reglas de Realtime Database

Consola de Firebase → **Realtime Database** → **Reglas** → pegar el
contenido de `database.rules.json` de este repo → Publicar.

Qué garantizan esas reglas:

- Nadie sin sesión puede leer ni escribir nada.
- Un vendedor solo lee su perfil (`vendedores/{su uid}`) y los clientes
  cuyo `idAuthVendedor` sea su uid (la consulta de la app usa
  `orderByChild("idAuthVendedor")`, por eso el `.indexOn`).
- Un cliente solo lee su propio registro (`clientes/{su uid}`), en modo
  lectura: no puede crear ni editar fiados ni abonos.
- El nodo viejo `fiados` queda sin reglas = sin acceso. Los datos viejos
  NO se borran, pero la app nueva ya no los lee (ver nota de migración).

> Recomendado: probar las reglas en el **simulador de reglas** de la
> consola con un uid de vendedor y uno de cliente antes de usar datos
> reales.

## Cómo funciona el acceso

- **Vendedor**: se registra con nombre, correo y contraseña. Al
  registrarse se crea su perfil en `vendedores/{uid}`.
- **Cliente**: NO se registra solo. Cuando un vendedor lo agrega desde
  la app, ocurren 3 cosas:
  1. Se crea su cuenta en Firebase Auth desde una **app secundaria**
     (así la sesión del vendedor no se cierra), con un email generado
     desde su teléfono: `88887777@ventaflow.app`.
  2. Se genera una **contraseña temporal** que se muestra UNA sola vez
     en pantalla. La contraseña no se guarda en la base de datos; el
     vendedor debe entregársela al cliente en ese momento.
  3. Se crea su registro en `clientes/{uidAuth}` con el campo
     `idAuthVendedor` apuntando al vendedor, y su índice en
     `clienteIndex/{uidAuth}`.
- **Login del cliente**: pantalla de acceso → "Soy cliente" → entra con
  su **número de teléfono** y su contraseña.

## Estructura de datos resultante

```
vendedores/{uidVendedor}      { name, email, created }
clientes/{uidCliente}         { idAuthVendedor, name, lastName, email,
                                telephone, created, items[], pagos[] }
clienteIndex/{uidCliente}     uidVendedor
```

## Limitaciones conocidas de esta ruta (sin backend)

- **Eliminar un cliente** borra su registro y su índice, pero su
  cuenta de Auth no se puede borrar desde el cliente web (eso requiere
  Admin SDK / Cloud Functions). La cuenta huérfana no puede ver nada:
  al entrar, la app le dice que no tiene registro activo.
- **Recuperar contraseña del cliente** por correo no funciona (su email
  es generado, no una bandeja real). Si un cliente la olvida, el
  vendedor elimina su registro y lo vuelve a crear (pierde su
  historial), o se cambia manualmente desde la consola de Firebase →
  Authentication → Users.
- Un mismo número de teléfono = una sola cuenta de cliente. Como el
  email se genera desde el teléfono, dos vendedores no pueden registrar
  al mismo cliente con el mismo número.

## Nota sobre los datos anteriores

La versión anterior guardaba todo en el nodo `fiados` sin usuarios.
Esos datos quedan intactos en la base, pero fuera del nuevo modelo:
para migrarlos habría que asignarles un vendedor y re-crearlos como
`clientes/{uid}` con cuentas Auth. Si eran datos de prueba, se pueden
ignorar o borrar el nodo `fiados` desde la consola.
