# Arquitectura VentaFlow

## Capas

Las dependencias van en una sola dirección: las capas de arriba usan
a las de abajo, nunca al revés.

```
features/ y components/ (pantallas y piezas)
  → hooks/ (estado, suscripciones y paquetes de funciones)
    → services/ y lib/ (WhatsApp, identidad, formato)
      → domain/ (modelos y matemática del negocio)
  → data/ (repositorios: la única puerta a Firebase)
    → domain/ (tipos)
```

| Capa | Qué vive ahí | Depende de |
| --- | --- | --- |
| `src/domain/` | `models.ts` (tipos) y `calculations.ts` (matemática: deuda, totales, saldo a favor, últimos movimientos, métricas) | Nada |
| `src/lib/` | `format.ts` (fmtMoney, fmtFecha), `utils.ts` (cn), `filterForIdAndState.ts` | Dominio (solo tipos) |
| `src/services/` | `identity.ts` (uid, alias de correo, contraseña temporal), `whatsapp.ts` (enlaces y mensajes) | Dominio y formato |
| `src/data/` | `repositories.ts` (interfaces) y `firebaseRepositories.ts` (implementación) | Dominio (tipos) y `firebase/database` |
| `src/hooks/` | Hooks de datos y paquetes de funciones (ver abajo) | Services, data, dominio |
| `src/features/` | `access/`, `client/`, `vendor/` (pantallas) | Hooks y componentes compartidos |
| `src/components/shared/` | Piezas sin estado de negocio | Hooks (paquetes) |

## Reglas

- **Ningún componente importa funciones planas.** Todo llega por un
  hook: los datos por hooks de suscripción y las funciones puras por
  paquetes (ver tabla).
- **Un solo archivo importa `firebase/database`** en `src/`
  (además de `firebase.ts`): `src/data/firebaseRepositories.ts`.
  Nadie más conoce los nodos (`vendedores`, `clientes`,
  `clienteIndex`, `aprobaciones`, `admins`, `catalogo`).
- **Los hooks dependen de interfaces, no del SDK** (DIP). Cada hook
  de datos acepta el repositorio como parámetro opcional y usa la
  implementación Firebase por defecto; las pruebas pueden inyectar
  otra sin tocar el componente.
- **Nombres en inglés** para carpetas, archivos, hooks y
  componentes. Las rutas URL pueden estar en español
  (`/vendedor/clientes`, `/vendedor/solicitudes`).
- **Los mensajes de commit van en inglés.**
- `Row` es una función pura de render, no un componente: quien la
  llama (`RequestCard`) toma `fmtFecha` de `useFormat` y se lo pasa.

## Hooks

### De datos (estado y suscripciones)

| Hook | Cubre | Repositorio |
| --- | --- | --- |
| `useAuth` | Sesión, rol, estado de aprobación, esAdmin, registro/login/logout | Vendedores, Aprobaciones |
| `useClient` | Clientes del vendedor, crear (con cuenta Auth secundaria), borrar, guardar | Clientes |
| `useCatalog` | Catálogo de productos frecuentes | Catálogo |
| `useAdminVendedores` | Vendedores con su estado + `setEstadoVendedor` (aprobar/rechazar/revocar) | Aprobaciones |
| `useOwnClient` | Registro del cliente que inició sesión (vista de solo lectura) | Clientes |

### Paquetes (funciones puras, sin estado)

Devuelven las funciones como referencias estables. Así una lista
puede usarlas dentro de un `map` o un filtro sin romper las reglas
de los hooks (lo que devuelve el hook son funciones, no valores).

| Hook | Devuelve | Usado por |
| --- | --- | --- |
| `useClientCalculations` | `fullName`, `totalItems`, `totalPagos`, `deuda`, `saldoAFavor`, `ultimosMovimientos` | ClientList, ClientDetails, ClientApp, Totals, VendorApp (búsqueda) |
| `useFormat` | `fmtMoney`, `fmtFecha` | Casi todos los componentes |
| `useWhatsApp` | `whatsAppPhone`, `whatsAppUrl`, `mensajeEstadoCuenta`, `mensajeDatosAcceso` | ClientList, ClientDetails |
| `useIdentity` | `uid`, `generateEmailAlias`, `generateTempPassword`, `telephoneError` (formato del teléfono: solo números con separadores y mínimo 8 dígitos) | ClientDetails, ClientList (botón deshabilitado), useClient, useCatalog, useAuth |
| `useMetrics` | `metricas(clientes)` memoizada (total por cobrar, clientes con deuda, % recuperado) | Dashboard, VendorApp |

## De dónde vino cada cosa (antes: `src/storage.ts`)

`storage.ts` ya no existe. Su contenido se repartió así:

- 9 tipos → `src/domain/models.ts`
- Matemática (`fullName`, `totalItems`, `totalPagos`, `deuda`,
  `saldoAFavor`, `ultimosMovimientos`, `metricas`) →
  `src/domain/calculations.ts`
- `fmtMoney`, `fmtFecha` → `src/lib/format.ts`
- `uid`, `generateEmailAlias`, `generateTempPassword` →
  `src/services/identity.ts`
- WhatsApp (`whatsAppPhone`, `whatsAppUrl`, `mensajeEstadoCuenta`,
  `mensajeDatosAcceso`) → `src/services/whatsapp.ts`
- Datos (14 funciones: clientes, vendedores, aprobaciones,
  catálogo) → interfaces en `src/data/repositories.ts` e
  implementación en `src/data/firebaseRepositories.ts`
- `metricas` salió además de `Dashboard.tsx` (ahora se alcanza con
  `useMetrics`).

Desviaciones respecto al ticket #6, por reglas fijadas después:
los archivos van en inglés (`models.ts`, `calculations.ts`,
`identity.ts`, `repositories.ts`, `firebaseRepositories.ts`) y no
se creó el paso intermedio `accesoDatos.ts`: los datos pasaron
directo a repositorios. `getEsAdmin` quedó en
`VendedoresRepository`, como decía el ticket #7.

## Pruebas

- `test/domain.test.ts`: pruebas puras (formato, cálculos,
  WhatsApp, identidad). No montan Firebase falso.
- `test/repositories.test.ts`: repositorios Firebase contra la
  RTDB simulada (`test/fakes/firebaseDatabase`).
- `test/useAuth.test.tsx`, `test/useClient.test.tsx`,
  `test/useCatalog.test.ts`: usan los repositorios por defecto, que
  en Jest resuelven al SDK falso vía el `moduleNameMapper` de la
  configuración. Los fakes del SDK quedan, por tanto, como
  infraestructura de pruebas, no como código de la app.
- Los hooks de datos aceptan el repositorio inyectado: una prueba
  nueva puede pasar un repositorio en memoria sin tocar el SDK
  falso.

## Pendiente

- Ticket #8 (ARQ-4): `useAuth` todavía concentra sesión y
  aprobación; el plan era separarlo en `useSession` y
  `useAprobacion` más un servicio de cuentas de cliente.
- Cerrar en GitHub los tickets #6 y #7, que este cambio deja
  cubiertos en sustancia.
