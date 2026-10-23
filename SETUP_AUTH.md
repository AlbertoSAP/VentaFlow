# VentaFlow — Puesta en marcha de roles (vendedor / cliente)

> **App instalable (PWA):** la app se puede instalar en el teléfono
> desde el navegador (Android: menú ⋮ → «Instalar app»; iPhone:
> Compartir → «Agregar a inicio»). No requiere configuración: el
> manifest, los iconos y el service worker se generan en el build
> (`vite-plugin-pwa`, modo autoUpdate: cada despliegue nuevo se
> aplica solo al reabrir la app).

> **Accesos separados por ruta:** `/vendedor` es la entrada de
> vendedores (login + registro) y `/cliente` (o la raíz) la de
> clientes, que solo muestra SU formulario. A cada cliente se le
> comparte el enlace `/cliente`; el de vendedores no se comparte.

## Aprobación de vendedores (módulo de permisos)

Registrarse ya no basta para usar la app: todo vendedor nuevo
queda **pendiente** viendo solo una pantalla de espera («Por favor
espere, su cuenta será validada…») hasta que un administrador lo
apruebe desde la pestaña **Solicitudes** de la propia app.

Pasos de consola (una sola vez):

1. **Republicar las reglas** de `database.rules.json` en Realtime
   Database → Reglas (traen los nodos nuevos `admins` y
   `aprobaciones`).
2. **Marcar tu cuenta como administradora:** en Realtime Database
   creá el nodo `admins` y dentro, tu UID de vendedor (está en
   Authentication → Users) con valor `true`:
   `admins/{tu-uid}: true`. Ese nodo NO se puede escribir desde la
   app (las reglas lo bloquean): solo desde la consola.
3. Entrá a la app con tu cuenta: como admin, saltás la espera y
   ves la pestaña **Solicitudes**, desde donde aprobás, rechazás o
   revocás vendedores. Tu propia cuenta también podés aprobarla
   ahí mismo (o queda liberada por ser admin).

Notas:

- El estado vive en `aprobaciones/{uid}` y **solo un admin puede
  escribirlo** (reglas): un vendedor no puede aprobarse a sí mismo
  tocando su perfil.
- Los vendedores que ya existían antes de este módulo aparecen
  como **pendientes**: aprobalos desde el panel (o, si preferís
  liberarlos a todos de una vez, creá en la consola
  `aprobaciones/{uid}` con `{"estado": "aprobado"}` para cada uno).

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
     (así la sesión del vendedor no se cierra), con un **alias** de un
     único buzón real del negocio generado desde su teléfono:
     `flowventas13+88887777@gmail.com` (ver "Recuperación de
     contraseña" más abajo).
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
- **Recuperar contraseña del cliente**: su correo de cuenta es un
  alias (`flowventas13+<teléfono>@gmail.com`) de un único buzón real
  del negocio, así que el correo de restablecimiento de Firebase SÍ
  llega, a ese buzón. Procedimiento cuando un cliente olvida su
  contraseña: consola de Firebase → Authentication → el usuario →
  restablecer contraseña (o el enlace que se agregue en la app); el
  enlace llega a `flowventas13@gmail.com`, el vendedor lo abre, pone
  una contraseña nueva y se la entrega al cliente (o le reenvía el
  enlace para que la ponga él; vence en ~1 hora y es de un solo uso).
  Las cuentas creadas antes de este cambio (con `@ventaflow.app`)
  mantienen la limitación vieja hasta re-crearse.
- Un mismo número de teléfono = una sola cuenta de cliente. Como el
  email se genera desde el teléfono, dos vendedores no pueden registrar
  al mismo cliente con el mismo número.

## Nota sobre los datos anteriores

La versión anterior guardaba todo en el nodo `fiados` sin usuarios.
Esos datos quedan intactos en la base, pero fuera del nuevo modelo:
para migrarlos habría que asignarles un vendedor y re-crearlos como
`clientes/{uid}` con cuentas Auth. Si eran datos de prueba, se pueden
ignorar o borrar el nodo `fiados` desde la consola.

## Acceso de vendedor desde la app instalada (PWA)

La app instalada siempre abre en la raíz (la entrada del cliente),
sin barra de direcciones para escribir `/vendedor`. Dos salidas
que no exponen nada al cliente:

1. **Atajo del icono (Android):** mantener presionado el icono de
   VentaFlow muestra «Acceso vendedor», que abre directo
   `/vendedor`. Se declara en el manifiesto (`shortcuts`); como el
   manifiesto se captura al instalar, hay que desinstalar y volver
   a instalar la app para que aparezca.
2. **Gesto oculto:** en la pantalla del cliente, mantener
   presionado el logo «VF» por 1 segundo salta al acceso de
   vendedores. Funciona en cualquier teléfono y llega con la
   actualización automática, sin reinstalar.

Una vez iniciada la sesión de vendedor, la app abre directo en el
panel aunque arranque en la raíz: el rol sale de la sesión, no de
la ruta. El gesto solo hace falta para iniciar sesión.
