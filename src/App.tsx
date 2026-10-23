import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { Clock, Menu, MessageCircle, Search, UserCheck, X } from "lucide-react";
import {
  uid,
  fmtMoney,
  fmtFecha,
  totalItems,
  totalPagos,
  deuda,
  saldoAFavor,
  whatsAppUrl,
  mensajeEstadoCuenta,
  mensajeDatosAcceso,
  setEstadoVendedor,
  fullName,
  type EstadoVendedor,
  type VendorConEstado,
  subscribeOwnClient,
  type Client,
  type FiadoItem,
} from "./storage.ts";
import { useAuth, mapAuthError } from "./hooks/useAuth.ts";
import { useClient } from "./hooks/useClient.tsx";
import { useCatalog } from "./hooks/useCatalog.ts";
import { useAdminVendedores } from "./hooks/useAdmin.ts";
import type { CatalogProduct } from "./storage.ts";
import Dashboard, { metricas } from "./Dashboard.tsx";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

/* ===== Piezas visuales compartidas (Tailwind + shadcn/ui) ===== */

const deudaCls = "text-red-600";
const pagadoCls = "text-emerald-600";
const moneyCls = "tabular-nums";

function Logo() {
  return (
    <span className="flex items-center gap-2.5">
      <span className="grid size-9 place-items-center rounded-lg bg-gradient-to-br from-blue-600 to-blue-400 text-sm font-extrabold tracking-tight text-white shadow-sm">
        VF
      </span>
      <span className="text-lg font-bold tracking-tight text-slate-900">
        Venta<span className="text-primary">Flow</span>
      </span>
    </span>
  );
}

function Topbar({
  children,
  menu = false,
}: {
  children?: ReactNode;
  /** true = la navegación se colapsa en hamburguesa en móvil */
  menu?: boolean;
}) {
  const [abierto, setAbierto] = useState(false);
  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/85 backdrop-blur">
      <div className="relative mx-auto flex h-16 w-full max-w-5xl items-center justify-between gap-3 px-4">
        <Logo />
        {menu ? (
          <>
            <button
              type="button"
              className="grid size-10 place-items-center rounded-lg text-slate-600 transition hover:bg-slate-100 sm:hidden [&_svg]:size-5.5"
              aria-label={abierto ? "Cerrar menú" : "Abrir menú"}
              aria-expanded={abierto}
              onClick={() => setAbierto(!abierto)}
            >
              {abierto ? <X /> : <Menu />}
            </button>
            <nav
              onClick={() => setAbierto(false)}
              className={cn(
                "absolute inset-x-4 top-full z-50 mt-2 flex-col gap-1 rounded-xl border border-slate-200 bg-white p-2 shadow-xl max-sm:[&>button]:text-left sm:static sm:mt-0 sm:flex sm:flex-row sm:items-center sm:gap-1.5 sm:rounded-none sm:border-0 sm:bg-transparent sm:p-0 sm:shadow-none",
                abierto ? "flex" : "hidden sm:flex",
              )}
            >
              {children}
            </nav>
          </>
        ) : (
          children
        )}
      </div>
    </header>
  );
}

function Wrap({
  children,
  wide = false,
  narrow = false,
}: {
  children: ReactNode;
  wide?: boolean;
  narrow?: boolean;
}) {
  return (
    <main
      className={cn(
        "mx-auto flex w-full flex-col gap-5 px-4 pb-16 pt-6",
        wide ? "max-w-5xl" : narrow ? "max-w-md" : "max-w-3xl",
      )}
    >
      {children}
    </main>
  );
}

function Seg({ children }: { children: ReactNode }) {
  return (
    <div className="flex gap-1 rounded-xl bg-slate-100 p-1">{children}</div>
  );
}

function segBtnCls(active: boolean) {
  return cn(
    "flex-1 rounded-lg px-3 py-2 text-sm font-semibold transition",
    active
      ? "bg-white text-slate-900 shadow-sm"
      : "text-slate-500 hover:text-slate-800",
  );
}

function AvisoOk({ children }: { children: ReactNode }) {
  return (
    <div
      role="status"
      className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 font-medium text-emerald-800"
    >
      {children}
    </div>
  );
}

function ErrorMsg({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm font-medium text-red-700">
      {children}
    </p>
  );
}

function ShowPwButton({
  show,
  onToggle,
}: {
  show: boolean;
  onToggle: () => void;
}) {
  return (
    <Button
      type="button"
      variant="link"
      size="sm"
      className="h-auto self-end px-0 py-0.5"
      onClick={onToggle}
    >
      {show ? "Ocultar contraseña" : "Mostrar contraseña"}
    </Button>
  );
}

function TotalBox({ monto }: { monto: number }) {
  return (
    <Card className="flex flex-col gap-0.5 px-5 py-3.5 text-right shadow-sm">
      <span className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
        Deuda actual
      </span>
      <strong
        className={cn(
          "text-2xl font-bold",
          moneyCls,
          monto > 0 ? deudaCls : pagadoCls,
        )}
      >
        {fmtMoney(monto)}
      </strong>
    </Card>
  );
}

function Totales({ cliente }: { cliente: Client }) {
  const d = deuda(cliente);
  const sf = saldoAFavor(cliente);
  return (
    <div className="mt-4 flex flex-col gap-2 border-t border-slate-100 pt-4 text-sm">
      <div className="flex items-center justify-between">
        <span className="text-muted-foreground">Total fiado:</span>
        <strong className={moneyCls}>{fmtMoney(totalItems(cliente))}</strong>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-muted-foreground">Total abonado:</span>
        <strong className={cn(moneyCls, pagadoCls)}>
          − {fmtMoney(totalPagos(cliente))}
        </strong>
      </div>
      {sf > 0 && (
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Saldo a favor:</span>
          <strong className={cn(moneyCls, pagadoCls)}>
            + {fmtMoney(sf)}
          </strong>
        </div>
      )}
      <div className="mt-1 flex items-center justify-between border-t-2 border-slate-200 pt-3 text-lg font-bold">
        <span>Deuda actual:</span>
        <strong className={cn(moneyCls, deudaCls)}>{fmtMoney(d)}</strong>
      </div>
    </div>
  );
}

function iniciales(nombre: string) {
  return nombre
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("");
}

/**
 * Ruta de acceso: /vendedor es la entrada de vendedores (login +
 * registro); cualquier otra ruta —incluida la raíz— es la entrada
 * de clientes, que SOLO ven su propio formulario. Así el cliente
 * nunca ve el acceso ni el registro de un vendedor: a cada quien
 * se le comparte su enlace.
 */
function useRuta(): "vendedor" | "cliente" {
  const leer = (): "vendedor" | "cliente" =>
    window.location.pathname.startsWith("/vendedor")
      ? "vendedor"
      : "cliente";
  const [ruta, setRuta] = useState<"vendedor" | "cliente">(leer);
  useEffect(() => {
    const onPop = () => setRuta(leer());
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);
  return ruta;
}

function App() {
  const {
    user,
    role,
    resolving,
    estado,
    esAdmin,
    registerVendor,
    loginVendor,
    loginClient,
    logout,
  } = useAuth();
  const ruta = useRuta();

  if (resolving) {
    return (
      <div className="min-h-screen">
        <Topbar />
        <Wrap>
          <p className="py-16 text-center text-muted-foreground">
            Conectando…
          </p>
        </Wrap>
      </div>
    );
  }

  if (!user) {
    return ruta === "vendedor" ? (
      <VendorAuthScreen
        onLoginVendor={loginVendor}
        onRegisterVendor={registerVendor}
      />
    ) : (
      <ClientAuthScreen onLoginClient={loginClient} />
    );
  }

  if (role === "vendedor") {
    return (
      <VendorApp
        vendorUid={user.uid}
        onLogout={logout}
        estado={estado}
        esAdmin={esAdmin}
      />
    );
  }

  if (role === "cliente") {
    return <ClientApp clientUid={user.uid} onLogout={logout} />;
  }

  // Hay sesión pero ningún registro asociado (ej: la cuenta quedó
  // huérfana porque su registro fue eliminado por el vendedor).
  return (
    <div className="min-h-screen">
      <Topbar>
        <Button variant="outline" size="sm" onClick={() => void logout()}>
          Salir
        </Button>
      </Topbar>
      <Wrap>
        <p className="py-16 text-center text-muted-foreground">
          Esta cuenta no tiene un registro activo en VentaFlow. Si eras
          cliente, pide a tu vendedor que te registre de nuevo.
        </p>
      </Wrap>
    </div>
  );
}

/* ============ Pantalla de acceso del VENDEDOR (/vendedor) ============ */

interface VendorAuthProps {
  onLoginVendor: (email: string, password: string) => Promise<void>;
  onRegisterVendor: (
    name: string,
    email: string,
    password: string,
  ) => Promise<void>;
}

function VendorAuthScreen({ onLoginVendor, onRegisterVendor }: VendorAuthProps) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      if (mode === "register") {
        await onRegisterVendor(name, email, password);
      } else {
        await onLoginVendor(email, password);
      }
    } catch (err) {
      setError(mapAuthError(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen">
      <Topbar />

      <Wrap narrow>
        <div className="pt-2 text-center">
          <h2 className="text-2xl font-bold tracking-tight">
            Lleva tus fiados sin papel 📒
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Apunta quién te debe, cuánto te debe y qué ya te pagó. Tu
            cliente puede ver su cuenta entrando con su número de
            teléfono.
          </p>
        </div>

        <Card className="gap-5 p-6">
          <Seg>
            <button
              type="button"
              className={segBtnCls(mode === "login")}
              onClick={() => setMode("login")}
            >
              Iniciar sesión
            </button>
            <button
              type="button"
              className={segBtnCls(mode === "register")}
              onClick={() => setMode("register")}
            >
              Crear cuenta de vendedor
            </button>
          </Seg>

          <form className="flex flex-col gap-4" onSubmit={submit}>
            {mode === "register" && (
              <Input
                placeholder="Tu nombre *"
                autoComplete="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            )}
            <Input
              type="email"
              placeholder="Tu correo *"
              autoComplete="email"
              inputMode="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <Input
              type={showPw ? "text" : "password"}
              placeholder={
                mode === "register"
                  ? "Contraseña (mín. 6 caracteres) *"
                  : "Contraseña *"
              }
              autoComplete={
                mode === "register" ? "new-password" : "current-password"
              }
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <ShowPwButton show={showPw} onToggle={() => setShowPw(!showPw)} />
            {mode === "register" && (
              <p className="text-xs leading-relaxed text-muted-foreground">
                El registro es solo para vendedores. Las cuentas de
                cliente las crea su vendedor desde la app.
              </p>
            )}

            {error && <ErrorMsg>{error}</ErrorMsg>}

            <Button className="w-full" type="submit" disabled={busy}>
              {busy
                ? "Espera…"
                : mode === "register"
                  ? "Crear mi cuenta"
                  : "Entrar"}
            </Button>
          </form>
        </Card>
      </Wrap>
    </div>
  );
}

/* ============ Pantalla de acceso del CLIENTE (/cliente) ============ */
/* Solo su formulario: aquí no existe registro ni acceso de vendedor. */

interface ClientAuthProps {
  onLoginClient: (telephone: string, password: string) => Promise<void>;
}

function ClientAuthScreen({ onLoginClient }: ClientAuthProps) {
  const [telephone, setTelephone] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await onLoginClient(telephone, password);
    } catch (err) {
      setError(mapAuthError(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen">
      <Topbar />

      <Wrap narrow>
        <div className="pt-2 text-center">
          <h2 className="text-2xl font-bold tracking-tight">
            Consulta tu estado de cuenta
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Entrá con el número de teléfono que te registró tu vendedor
            y la contraseña que te entregó.
          </p>
        </div>

        <Card className="gap-5 p-6">
          <form className="flex flex-col gap-4" onSubmit={submit}>
            <Input
              placeholder="Tu número de teléfono *"
              inputMode="tel"
              autoComplete="tel"
              value={telephone}
              onChange={(e) => setTelephone(e.target.value)}
            />
            <Input
              type={showPw ? "text" : "password"}
              placeholder="Contraseña *"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <ShowPwButton show={showPw} onToggle={() => setShowPw(!showPw)} />

            {error && <ErrorMsg>{error}</ErrorMsg>}

            <Button className="w-full" type="submit" disabled={busy}>
              {busy ? "Espera…" : "Entrar"}
            </Button>
          </form>
        </Card>
      </Wrap>
    </div>
  );
}

/* ==================== Vista del vendedor ==================== */

type Vista =
  | { tipo: "lista" }
  | { tipo: "detalle"; id: string }
  | { tipo: "dashboard" }
  | { tipo: "solicitudes" };

interface VendorProps {
  vendorUid: string;
  onLogout: () => Promise<void>;
  estado: EstadoVendedor | null;
  esAdmin: boolean;
}

function navBtnCls(active: boolean) {
  return cn(
    "rounded-lg px-3.5 py-2 text-sm font-semibold transition",
    active
      ? "bg-slate-900 text-white shadow-sm"
      : "text-slate-500 hover:bg-slate-100 hover:text-slate-900",
  );
}

function VendorApp({ vendorUid, onLogout, estado, esAdmin }: VendorProps) {
  const { clients, loading, createClient, deleteClient, saveClient } =
    useClient(vendorUid);
  const {
    products: catalogo,
    addProduct: addFrecuente,
    deleteProduct: deleteFrecuente,
  } = useCatalog(vendorUid);
  const vendedoresAdmin = useAdminVendedores(esAdmin);
  const [vista, setVista] = useState<Vista>({ tipo: "dashboard" });
  const [busqueda, setBusqueda] = useState("");
  // OJO: ningún return antes de terminar TODOS los hooks — la
  // compuerta va después (el orden de hooks no puede cambiar
  // entre renders, p. ej. cuando el estado pasa a "aprobado").

  const pendientesCount = vendedoresAdmin.filter(
    (v) => v.estado === "pendiente" && v.id !== vendorUid,
  ).length;

  const clientesFiltrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return clients.filter(
      (c) => !q || fullName(c).toLowerCase().includes(q),
    );
  }, [clients, busqueda]);

  const totalPorCobrar = clients.reduce((s, c) => s + deuda(c), 0);
  const m = metricas(clients);

  // Compuerta de aprobación (después de todos los hooks): sin el
  // visto bueno de un admin (y sin ser admin), el vendedor solo
  // ve la pantalla de espera.
  if (!esAdmin && estado !== "aprobado") {
    return (
      <PantallaEspera
        estado={estado ?? "pendiente"}
        onLogout={onLogout}
      />
    );
  }

  return (
    <div className="min-h-screen">
      <Topbar menu>
          <button
            type="button"
            className={navBtnCls(vista.tipo === "dashboard")}
            onClick={() => setVista({ tipo: "dashboard" })}
          >
            Dashboard
          </button>

          <button
            type="button"
            className={navBtnCls(vista.tipo === "lista")}
            onClick={() => setVista({ tipo: "lista" })}
          >
            Clientes
            {m.clientesConDeuda > 0 ? ` (${m.clientesConDeuda})` : ""}
          </button>

          {esAdmin && (
            <button
              type="button"
              className={navBtnCls(vista.tipo === "solicitudes")}
              onClick={() => setVista({ tipo: "solicitudes" })}
            >
              Solicitudes
              {pendientesCount > 0 ? ` (${pendientesCount})` : ""}
            </button>
          )}

          <button
            type="button"
            className={navBtnCls(false)}
            onClick={() => void onLogout()}
          >
            Salir
          </button>
      </Topbar>

      {loading ? (
        <Wrap>
          <p className="py-16 text-center text-muted-foreground">
            Cargando tus clientes…
          </p>
        </Wrap>
      ) : vista.tipo === "dashboard" ? (
        <Dashboard clientes={clients} />
      ) : vista.tipo === "lista" ? (
        <ListaClientes
          allClients={clients}
          createClient={createClient}
          deleteClient={deleteClient}
          busqueda={busqueda}
          setBusqueda={setBusqueda}
          clientes={clientesFiltrados}
          totalPorCobrar={totalPorCobrar}
          onAbrir={(id: string) => setVista({ tipo: "detalle", id })}
        />
      ) : vista.tipo === "solicitudes" ? (
        <PanelSolicitudes
          vendedores={vendedoresAdmin}
          miUid={vendorUid}
          onSetEstado={(uid, e) => void setEstadoVendedor(uid, e)}
        />
      ) : (
        <DetalleCliente
          onSave={saveClient}
          cliente={clients.find((c) => c.id === vista.id)}
          onVolver={() => setVista({ tipo: "lista" })}
          catalogo={catalogo}
          onAddFrecuente={addFrecuente}
          onDeleteFrecuente={deleteFrecuente}
        />
      )}
    </div>
  );
}

/* ======== Pantalla de espera: vendedor aún no aprobado ======== */

function PantallaEspera({
  estado,
  onLogout,
}: {
  estado: EstadoVendedor;
  onLogout: () => Promise<void>;
}) {
  const rechazado = estado === "rechazado";
  return (
    <div className="min-h-screen">
      <Topbar>
        <Button variant="outline" size="sm" onClick={() => void onLogout()}>
          Salir
        </Button>
      </Topbar>
      <Wrap narrow>
        <Card className="items-center gap-3 p-8 text-center">
          <span className="grid size-14 place-items-center rounded-full bg-amber-50 text-amber-600 [&_svg]:size-7">
            {rechazado ? <UserCheck /> : <Clock />}
          </span>
          <h2 className="text-xl font-bold tracking-tight">
            {rechazado
              ? "Tu cuenta no fue aprobada"
              : "Tu cuenta está en revisión"}
          </h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            {rechazado
              ? "Tu solicitud de acceso a VentaFlow no fue aprobada. Si creés que se trata de un error, contactá al administrador de la aplicación."
              : "Por favor espere, su cuenta será validada y posteriormente podrá comenzar a hacer uso de ella. Cuando sea aprobada, entrá de nuevo con tu correo y contraseña: el acceso se libera automáticamente."}
          </p>
        </Card>
      </Wrap>
    </div>
  );
}

/* ======== Panel del administrador: solicitudes de vendedores ======== */

function PanelSolicitudes({
  vendedores,
  miUid,
  onSetEstado,
}: {
  vendedores: VendorConEstado[];
  miUid: string;
  onSetEstado: (uid: string, estado: EstadoVendedor) => void;
}) {
  const pendientes = vendedores.filter(
    (v) => v.estado === "pendiente" && v.id !== miUid,
  );
  const aprobados = vendedores.filter(
    (v) => v.estado === "aprobado" && v.id !== miUid,
  );
  const rechazados = vendedores.filter(
    (v) => v.estado === "rechazado" && v.id !== miUid,
  );

  const fila = (v: VendorConEstado, acciones: ReactNode) => (
    <div
      key={v.id}
      className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card p-4 shadow-sm"
    >
      <div className="flex min-w-0 items-center gap-3.5">
        <span className="grid size-11 shrink-0 place-items-center rounded-full bg-blue-50 text-sm font-bold text-primary">
          {iniciales(v.name || v.email)}
        </span>
        <div className="min-w-0">
          <strong className="block truncate">
            {v.name || "(sin nombre)"}
          </strong>
          <div className="truncate text-xs text-muted-foreground">
            {v.email}
            {v.created > 0 ? ` · Registrado: ${fmtFecha(v.created)}` : ""}
          </div>
        </div>
      </div>
      <div className="flex shrink-0 gap-2">{acciones}</div>
    </div>
  );

  return (
    <Wrap wide>
      <div>
        <h2 className="text-2xl font-bold tracking-tight">
          Solicitudes de vendedores
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Solo los vendedores que aprobés aquí pueden comenzar a usar
          la aplicación. El resto ve una pantalla de espera.
        </p>
      </div>

      <h3 className="text-base font-semibold tracking-tight">
        Pendientes ({pendientes.length})
      </h3>
      {pendientes.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No hay solicitudes pendientes.
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {pendientes.map((v) =>
            fila(
              v,
              <>
                <Button
                  variant="success"
                  size="sm"
                  onClick={() => onSetEstado(v.id, "aprobado")}
                >
                  Aprobar
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-red-600 hover:text-red-700"
                  onClick={() => onSetEstado(v.id, "rechazado")}
                >
                  Rechazar
                </Button>
              </>,
            ),
          )}
        </div>
      )}

      <h3 className="text-base font-semibold tracking-tight">
        Aprobados ({aprobados.length})
      </h3>
      {aprobados.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Todavía no aprobaste a ningún vendedor.
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {aprobados.map((v) =>
            fila(
              v,
              <Button
                variant="outline"
                size="sm"
                onClick={() => onSetEstado(v.id, "pendiente")}
              >
                Revocar acceso
              </Button>,
            ),
          )}
        </div>
      )}

      {rechazados.length > 0 && (
        <>
          <h3 className="text-base font-semibold tracking-tight">
            Rechazados ({rechazados.length})
          </h3>
          <div className="flex flex-col gap-3">
            {rechazados.map((v) =>
              fila(
                v,
                <Button
                  variant="success"
                  size="sm"
                  onClick={() => onSetEstado(v.id, "aprobado")}
                >
                  Aprobar
                </Button>,
              ),
            )}
          </div>
        </>
      )}
    </Wrap>
  );
}

interface CreadoInfo {
  nombre: string;
  telephone: string;
  tempPassword: string;
}

interface ListaProps {
  allClients: Client[];
  createClient: (input: {
    name: string;
    lastName: string;
    telephone: string;
  }) => Promise<
    | { ok: true; client: Client; tempPassword: string }
    | { ok: false; error: string }
  >;
  deleteClient: (id: string, name: string) => Promise<string | null>;
  busqueda: string;
  setBusqueda: (v: string) => void;
  clientes: Client[];
  totalPorCobrar: number;
  onAbrir: (id: string) => void;
}

function ListaClientes({
  allClients,
  createClient,
  deleteClient,
  busqueda,
  setBusqueda,
  clientes,
  totalPorCobrar,
  onAbrir,
}: ListaProps) {
  const [name, setName] = useState("");
  const [lastName, setLastName] = useState("");
  const [telephone, setTelephone] = useState("");
  const [formError, setFormError] = useState("");
  const [busy, setBusy] = useState(false);
  const [creado, setCreado] = useState<CreadoInfo | null>(null);
  const [clienteAEliminar, setClienteAEliminar] = useState<Client | null>(null);
  const [avisoEliminar, setAvisoEliminar] = useState<Client | null>(null);
  const [aviso, setAviso] = useState("");

  useEffect(() => {
    if (!aviso) return;
    const t = setTimeout(() => setAviso(""), 4000);
    return () => clearTimeout(t);
  }, [aviso]);

  const agregar = async (e: FormEvent) => {
    e.preventDefault();
    setFormError("");
    setCreado(null);
    setBusy(true);
    const result = await createClient({ name, lastName, telephone });
    setBusy(false);
    if (!result.ok) {
      setFormError(result.error);
      return;
    }
    setCreado({
      nombre: fullName(result.client),
      telephone: result.client.telephone,
      tempPassword: result.tempPassword,
    });
    setName("");
    setLastName("");
    setTelephone("");
  };

  // Eliminar exige pasar por el modal: si el cliente tiene registros
  // se muestra el aviso de bloqueo; si no, la confirmación de borrado.
  const eliminar = (c: Client) => {
    const hasRecords =
      (c.items?.length ?? 0) > 0 || (c.pagos?.length ?? 0) > 0;
    if (hasRecords) setAvisoEliminar(c);
    else setClienteAEliminar(c);
  };

  const confirmarEliminar = async () => {
    if (!clienteAEliminar) return;
    const target = clienteAEliminar;
    setClienteAEliminar(null);
    const msg = await deleteClient(target.id, fullName(target));
    if (msg) alert(msg);
    else setAviso(`Cliente eliminado: ${fullName(target)}.`);
  };

  return (
    <Wrap>
      <div className="grid grid-cols-2 gap-4">
        <Card className="gap-1 p-5">
          <span className="text-sm text-muted-foreground">
            Total por cobrar
          </span>
          <strong className={cn("text-2xl font-bold", moneyCls, deudaCls)}>
            {fmtMoney(totalPorCobrar)}
          </strong>
        </Card>
        <Card className="gap-1 p-5">
          <span className="text-sm text-muted-foreground">
            Clientes con deuda
          </span>
          <strong className={cn("text-2xl font-bold", moneyCls)}>
            {allClients.filter((c) => deuda(c) > 0).length}
          </strong>
        </Card>
      </div>

      {aviso && <AvisoOk>{aviso}</AvisoOk>}

      <Card className="gap-4 p-6">
        <h3 className="text-base font-semibold tracking-tight">
          Agregar cliente
        </h3>
        <form className="flex flex-col gap-4" onSubmit={agregar}>
          <div className="flex flex-wrap gap-3">
            <Input
              className="min-w-36 flex-1"
              placeholder="Nombre *"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <Input
              className="min-w-36 flex-1"
              placeholder="Apellido"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
            />
          </div>
          <div className="flex flex-wrap gap-3">
            <Input
              className="min-w-52 flex-1"
              placeholder="Teléfono (será su usuario para entrar) *"
              inputMode="tel"
              autoComplete="tel"
              value={telephone}
              onChange={(e) => setTelephone(e.target.value)}
            />
            <Button type="submit" disabled={busy}>
              {busy ? "Creando…" : "Agregar"}
            </Button>
          </div>
          <p className="text-xs leading-relaxed text-muted-foreground">
            Al agregarlo se crea también su cuenta: entrará con su teléfono
            y la contraseña temporal que se genera aquí.
          </p>
          {formError && <ErrorMsg>{formError}</ErrorMsg>}
          {creado && (
            <div className="flex flex-col gap-1 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3.5 text-sm text-emerald-900">
              <strong>✅ Cuenta creada para {creado.nombre}</strong>
              <span>
                Usuario: <b>{creado.telephone}</b> · Contraseña temporal:{" "}
                <b>{creado.tempPassword}</b>
              </span>
              <span className="text-xs">
                Entrégale estos datos ahora: la contraseña no se guarda y
                no se puede volver a ver.
              </span>
              <Button
                asChild
                variant="success"
                size="sm"
                className="mt-2 self-start"
              >
                <a
                  href={whatsAppUrl(
                    creado.telephone,
                    mensajeDatosAcceso(
                      creado.nombre,
                      creado.telephone,
                      creado.tempPassword,
                    ),
                  )}
                  target="_blank"
                  rel="noreferrer"
                >
                  <MessageCircle /> Enviar datos por WhatsApp
                </a>
              </Button>
            </div>
          )}
        </form>
      </Card>

      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4.5 -translate-y-1/2 text-slate-400" />
        <Input
          className="bg-card pl-10.5"
          placeholder="Buscar cliente..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
        />
      </div>

      <div className="flex flex-col gap-3">
        {clientes.map((c) => {
          const d = deuda(c);
          return (
            <div
              className="group flex cursor-pointer items-center justify-between gap-3 rounded-xl border bg-card p-4 shadow-sm transition hover:border-primary/50 hover:shadow-md"
              key={c.id}
              onClick={() => onAbrir(c.id)}
            >
              <div className="flex min-w-0 items-center gap-3.5">
                <span className="grid size-11 shrink-0 place-items-center rounded-full bg-blue-50 text-sm font-bold text-primary">
                  {iniciales(fullName(c))}
                </span>
                <div className="min-w-0">
                  <strong className="block truncate">{fullName(c)}</strong>
                  <div className="text-xs text-muted-foreground">
                    {c.telephone ? `${c.telephone} · ` : ""}
                    {c.items?.length || 0} productos fiados
                  </div>
                </div>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1">
                <strong
                  className={cn(
                    "text-base font-bold",
                    moneyCls,
                    d > 0 ? deudaCls : pagadoCls,
                  )}
                >
                  {fmtMoney(d)}
                </strong>
                <span className="flex items-center gap-2">
                  <Badge variant={d > 0 ? "danger" : "success"}>
                    {d > 0 ? "Con deuda" : "Al día"}
                  </Badge>
                  <button
                    className="py-0.5 text-xs font-medium text-red-600 underline-offset-2 hover:underline"
                    onClick={(e) => {
                      e.stopPropagation();
                      eliminar(c);
                    }}
                  >
                    eliminar
                  </button>
                </span>
              </div>
            </div>
          );
        })}
        {clientes.length === 0 && (
          <p className="py-10 text-center text-sm text-muted-foreground">
            {allClients.length === 0
              ? "Todavía no tienes clientes. Agrega el primero con el formulario de arriba: solo necesitas su nombre y su número de teléfono."
              : "Ningún cliente coincide con tu búsqueda. Prueba con otro nombre."}
          </p>
        )}
      </div>

      {avisoEliminar && (
        <ConfirmModal
          title="No se puede eliminar"
          message={`${fullName(avisoEliminar)} tiene productos fiados o abonos registrados. Un cliente con registros no puede ser eliminado.`}
          confirmLabel="Entendido"
          cancelLabel={null}
          confirmTone="primary"
          onConfirm={() => setAvisoEliminar(null)}
          onCancel={() => setAvisoEliminar(null)}
        />
      )}

      {clienteAEliminar && (
        <ConfirmModal
          title={`¿Eliminar a ${fullName(clienteAEliminar)}?`}
          message="Se eliminará su registro y su cuenta quedará sin acceso a la app. Esta acción no se puede deshacer."
          confirmLabel="Sí, eliminar"
          onConfirm={() => void confirmarEliminar()}
          onCancel={() => setClienteAEliminar(null)}
        />
      )}
    </Wrap>
  );
}

/* =============== Modal de confirmación reutilizable =============== */

interface ConfirmModalProps {
  title: string;
  message: string;
  confirmLabel: string;
  /** null = sin botón de cancelar (modal de solo aviso) */
  cancelLabel?: string | null;
  /** danger = botón rojo (acciones destructivas), primary = azul */
  confirmTone?: "danger" | "primary";
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmModal({
  title,
  message,
  confirmLabel,
  cancelLabel = "Cancelar",
  confirmTone = "danger",
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  // Escape cierra el modal, como espera cualquier usuario.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (cancelLabel === null) onConfirm();
      else onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [cancelLabel, onConfirm, onCancel]);

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-slate-950/60 p-4 backdrop-blur-sm"
      onClick={onCancel}
    >
      <div
        className="animate-in fade-in zoom-in-95 w-full max-w-md rounded-2xl border bg-card p-6 shadow-xl duration-150"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-semibold tracking-tight">{title}</h3>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          {message}
        </p>
        <div className="mt-5 flex justify-end gap-2.5">
          {cancelLabel !== null && (
            <Button variant="outline" type="button" onClick={onCancel}>
              {cancelLabel}
            </Button>
          )}
          <Button
            variant={confirmTone === "danger" ? "destructive" : "default"}
            type="button"
            onClick={onConfirm}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}

interface DetalleProps {
  onSave: (c: Client) => Promise<void>;
  cliente: Client | undefined;
  onVolver: () => void;
  catalogo: CatalogProduct[];
  onAddFrecuente: (descripcion: string, precio: number) => Promise<void>;
  onDeleteFrecuente: (productId: string) => Promise<void>;
}

function DetalleCliente({
  onSave,
  cliente,
  catalogo,
  onAddFrecuente,
  onDeleteFrecuente,
}: DetalleProps) {
  const [desc, setDesc] = useState("");
  const [precio, setPrecio] = useState("");
  const [cantidad, setCantidad] = useState("1");
  const [montoPago, setMontoPago] = useState("");
  const [itemAQuitar, setItemAQuitar] = useState<FiadoItem | null>(null);
  const [confirmarSaldar, setConfirmarSaldar] = useState(false);
  const [aviso, setAviso] = useState("");
  const [editandoFrecuentes, setEditandoFrecuentes] = useState(false);
  const [frecDesc, setFrecDesc] = useState("");
  const [frecPrecio, setFrecPrecio] = useState("");
  const [frecuenteAQuitar, setFrecuenteAQuitar] =
    useState<CatalogProduct | null>(null);

  // El aviso de "guardado" se quita solo a los pocos segundos.
  useEffect(() => {
    if (!aviso) return;
    const t = setTimeout(() => setAviso(""), 4000);
    return () => clearTimeout(t);
  }, [aviso]);

  if (!cliente)
    return (
      <Wrap>
        <p className="py-16 text-center text-muted-foreground">
          Cliente no encontrado.
        </p>
      </Wrap>
    );

  const d = deuda(cliente);

  // Si al quitar el producto los abonos superan el fiado restante,
  // queda un saldo a favor: el modal lo advierte antes de confirmar.
  const saldoTrasQuitar = itemAQuitar
    ? totalPagos(cliente) -
      (totalItems(cliente) -
        itemAQuitar.precio * (itemAQuitar.cantidad || 1))
    : 0;

  const guardar = (mutate: (c: Client) => void) => {
    const next = structuredClone(cliente);
    mutate(next);
    void onSave(next);
  };

  const agregarItem = (e: FormEvent) => {
    e.preventDefault();
    const p = parseFloat(precio);
    if (!desc.trim() || isNaN(p) || p <= 0) return;
    guardar((c) => {
      c.items.unshift({
        id: uid(),
        descripcion: desc.trim(),
        precio: p,
        cantidad: Math.max(1, parseInt(cantidad) || 1),
        fecha: Date.now(),
      });
    });
    setDesc("");
    setPrecio("");
    setCantidad("1");
    setAviso(`✅ Fiado agregado a la cuenta de ${fullName(cliente)}.`);
  };

  // Quitar un producto exige confirmación en el modal: un clic
  // accidental no debe poder alterar la cuenta del cliente.
  const confirmarQuitarItem = () => {
    if (!itemAQuitar) return;
    const itemId = itemAQuitar.id;
    guardar((c) => {
      c.items = c.items.filter((it) => it.id !== itemId);
    });
    setAviso(`Producto "${itemAQuitar.descripcion}" quitado de la cuenta.`);
    setItemAQuitar(null);
  };

  const registrarPago = (e: FormEvent) => {
    e.preventDefault();
    const m = parseFloat(montoPago);
    if (isNaN(m) || m <= 0) return;
    guardar((c) => {
      c.pagos.unshift({ id: uid(), monto: m, fecha: Date.now() });
    });
    setMontoPago("");
    setAviso(`✅ Abono de ${fmtMoney(m)} registrado.`);
  };

  // Un toque en un frecuente llena descripción y precio del fiado.
  const usarFrecuente = (p: CatalogProduct) => {
    setDesc(p.descripcion);
    setPrecio(String(p.precio));
  };

  const agregarFrecuente = async (e: FormEvent) => {
    e.preventDefault();
    const p = parseFloat(frecPrecio);
    if (!frecDesc.trim() || isNaN(p) || p <= 0) return;
    await onAddFrecuente(frecDesc.trim(), p);
    setFrecDesc("");
    setFrecPrecio("");
    setAviso(`✅ "${frecDesc.trim()}" agregado a tus productos frecuentes.`);
  };

  const confirmarQuitarFrecuente = () => {
    if (!frecuenteAQuitar) return;
    void onDeleteFrecuente(frecuenteAQuitar.id);
    setAviso(
      `Producto frecuente "${frecuenteAQuitar.descripcion}" eliminado.`,
    );
    setFrecuenteAQuitar(null);
  };

  // Saldar también pasa por el modal: registra un abono por el total.
  const confirmarSaldarPago = () => {
    guardar((c) => {
      c.pagos.unshift({ id: uid(), monto: d, fecha: Date.now() });
    });
    setConfirmarSaldar(false);
    setAviso("✅ Deuda saldada por completo. 🎉");
  };

  return (
    <Wrap>
      {aviso && <AvisoOk>{aviso}</AvisoOk>}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">
            {fullName(cliente)}
          </h2>
          {cliente.telephone && (
            <span className="text-sm text-muted-foreground">
              {cliente.telephone}
            </span>
          )}
        </div>
        <div className="flex flex-col items-end gap-2.5">
          <TotalBox monto={d} />
          {cliente.telephone && (
            <Button asChild variant="success" size="sm">
              <a
                href={whatsAppUrl(
                  cliente.telephone,
                  mensajeEstadoCuenta(cliente),
                )}
                target="_blank"
                rel="noreferrer"
              >
                <MessageCircle /> Enviar estado por WhatsApp
              </a>
            </Button>
          )}
        </div>
      </div>

      <Card className="gap-4 p-6">
        <h3 className="text-base font-semibold tracking-tight">
          Agregar fiado
        </h3>
        <form
          className="flex flex-wrap items-end gap-3"
          onSubmit={agregarItem}
        >
          <Input
            className="min-w-44 flex-[2]"
            placeholder="Descripción (ej: 2 libras de arroz) *"
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
          />
          <Input
            className="w-[110px] flex-none"
            type="number"
            min="0"
            step="0.01"
            placeholder="Precio *"
            value={precio}
            onChange={(e) => setPrecio(e.target.value)}
          />
          <Input
            className="w-20 flex-none"
            type="number"
            min="1"
            step="1"
            placeholder="Cant."
            value={cantidad}
            onChange={(e) => setCantidad(e.target.value)}
          />
          <Button type="submit">Añadir</Button>
        </form>

        {catalogo.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-muted-foreground">
              Frecuentes:
            </span>
            {catalogo.map((p) => (
              <Button
                key={p.id}
                type="button"
                variant="outline"
                size="sm"
                className="rounded-full px-3.5"
                onClick={() => usarFrecuente(p)}
              >
                {p.descripcion} · {fmtMoney(p.precio)}
              </Button>
            ))}
          </div>
        )}

        <div>
          <Button
            type="button"
            variant="link"
            size="sm"
            className="h-auto px-0 py-0.5"
            onClick={() => setEditandoFrecuentes(!editandoFrecuentes)}
          >
            {editandoFrecuentes
              ? "Ocultar productos frecuentes"
              : "Editar productos frecuentes"}
          </Button>
        </div>

        {editandoFrecuentes && (
          <div className="flex flex-col gap-3 border-t border-slate-100 pt-4">
            {catalogo.length === 0 && (
              <p className="text-sm text-muted-foreground">
                Aún no tienes productos frecuentes. Agrega los que fías
                seguido (arroz, aceite, huevos…) y aparecerán como
                botones para llenar el fiado con un toque.
              </p>
            )}
            {catalogo.map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between gap-3 text-sm"
              >
                <span>
                  {p.descripcion}{" "}
                  <span className="text-muted-foreground">
                    · {fmtMoney(p.precio)}
                  </span>
                </span>
                <button
                  type="button"
                  className="py-0.5 text-xs font-medium text-red-600 underline-offset-2 hover:underline"
                  onClick={() => setFrecuenteAQuitar(p)}
                >
                  quitar
                </button>
              </div>
            ))}
            <form
              className="flex flex-wrap gap-2.5"
              onSubmit={agregarFrecuente}
            >
              <Input
                className="h-10 min-w-40 flex-1"
                placeholder="Producto frecuente (ej: Arroz 1 lb)"
                value={frecDesc}
                onChange={(e) => setFrecDesc(e.target.value)}
              />
              <Input
                className="h-10 w-24 flex-none"
                type="number"
                min="0"
                step="0.01"
                placeholder="Precio"
                value={frecPrecio}
                onChange={(e) => setFrecPrecio(e.target.value)}
              />
              <Button type="submit" size="sm" className="h-10">
                Agregar frecuente
              </Button>
            </form>
          </div>
        )}
      </Card>

      <Card className="gap-2 p-6">
        <h3 className="text-base font-semibold tracking-tight">
          Productos fiados
        </h3>
        {(cliente.items || []).length === 0 && (
          <p className="text-sm text-muted-foreground">
            Este cliente aún no tiene productos fiados. Agrega el primero
            con el formulario «Agregar fiado» de arriba.
          </p>
        )}
        {(cliente.items || []).map((it) => (
          <div
            className="flex items-center justify-between gap-3 border-b border-slate-100 py-3 last:border-0"
            key={it.id}
          >
            <div className="min-w-0">
              <strong className="block truncate">{it.descripcion}</strong>
              <div className="text-xs text-muted-foreground">
                {fmtFecha(it.fecha)} ·{" "}
                {it.cantidad > 1
                  ? `${it.cantidad} × ${fmtMoney(it.precio)}`
                  : fmtMoney(it.precio)}
              </div>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-0.5">
              <strong className={moneyCls}>
                {fmtMoney(it.precio * (it.cantidad || 1))}
              </strong>
              <button
                className="py-0.5 text-xs font-medium text-red-600 underline-offset-2 hover:underline"
                onClick={() => setItemAQuitar(it)}
              >
                quitar
              </button>
            </div>
          </div>
        ))}
        <Totales cliente={cliente} />
      </Card>

      <Card className="gap-4 p-6">
        <h3 className="text-base font-semibold tracking-tight">
          Registrar abono
        </h3>
        <form onSubmit={registrarPago}>
          <div className="flex flex-wrap gap-3">
            <Input
              className="w-[150px] flex-none"
              type="number"
              min="0"
              step="0.01"
              placeholder="Monto del abono"
              value={montoPago}
              onChange={(e) => setMontoPago(e.target.value)}
            />
            <Button variant="success" type="submit">
              Abonar
            </Button>
            {d > 0 && (
              <Button
                variant="outline"
                type="button"
                onClick={() => setConfirmarSaldar(true)}
              >
                Saldar todo
              </Button>
            )}
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="text-xs text-muted-foreground">
              Montos rápidos:
            </span>
            {[50, 100, 200, 500].map((v) => (
              <Button
                key={v}
                type="button"
                variant="outline"
                size="sm"
                className="rounded-full px-4"
                onClick={() => setMontoPago(String(v))}
              >
                C$ {v}
              </Button>
            ))}
          </div>
        </form>
        {(cliente.pagos || []).length > 0 && (
          <div className="flex flex-col gap-2">
            {(cliente.pagos || []).map((p) => (
              <div
                className="flex items-center justify-between rounded-lg bg-emerald-50 px-3.5 py-2 text-sm"
                key={p.id}
              >
                <span className="text-xs text-muted-foreground">
                  {fmtFecha(p.fecha)}
                </span>
                <strong className={cn(moneyCls, pagadoCls)}>
                  − {fmtMoney(p.monto)}
                </strong>
              </div>
            ))}
          </div>
        )}
      </Card>

      {itemAQuitar && (
        <ConfirmModal
          title="¿Quitar este producto?"
          message={`Se quitará "${itemAQuitar.descripcion}" (${fmtMoney(itemAQuitar.precio * (itemAQuitar.cantidad || 1))}) de la cuenta de ${fullName(cliente)}.${saldoTrasQuitar > 0 ? ` Ojo: ya abonó ${fmtMoney(totalPagos(cliente))}, así que quedará un saldo a favor del cliente de ${fmtMoney(saldoTrasQuitar)}.` : ""} Esta acción no se puede deshacer.`}
          confirmLabel="Sí, quitar"
          onConfirm={confirmarQuitarItem}
          onCancel={() => setItemAQuitar(null)}
        />
      )}

      {frecuenteAQuitar && (
        <ConfirmModal
          title="¿Quitar este producto frecuente?"
          message={`Se quitará "${frecuenteAQuitar.descripcion}" de tus productos frecuentes. Los fiados ya registrados no se tocan.`}
          confirmLabel="Sí, quitar"
          onConfirm={confirmarQuitarFrecuente}
          onCancel={() => setFrecuenteAQuitar(null)}
        />
      )}

      {confirmarSaldar && (
        <ConfirmModal
          title="¿Saldar toda la deuda?"
          message={`Se registrará un abono de ${fmtMoney(d)} y la cuenta de ${fullName(cliente)} quedará en cero.`}
          confirmLabel="Sí, saldar"
          confirmTone="primary"
          onConfirm={confirmarSaldarPago}
          onCancel={() => setConfirmarSaldar(false)}
        />
      )}
    </Wrap>
  );
}

/* ==================== Vista del cliente (solo lectura) ==================== */

interface ClientProps {
  clientUid: string;
  onLogout: () => Promise<void>;
}

function ClientApp({ clientUid, onLogout }: ClientProps) {
  const [cliente, setCliente] = useState<Client | null | undefined>(undefined);

  useEffect(() => subscribeOwnClient(clientUid, setCliente), [clientUid]);

  return (
    <div className="min-h-screen">
      <Topbar>
        <Button variant="outline" size="sm" onClick={() => void onLogout()}>
          Salir
        </Button>
      </Topbar>

      {cliente === undefined ? (
        <Wrap>
          <p className="py-16 text-center text-muted-foreground">
            Cargando tu registro…
          </p>
        </Wrap>
      ) : cliente === null ? (
        <Wrap>
          <p className="py-16 text-center text-muted-foreground">
            Tu registro no fue encontrado.
          </p>
        </Wrap>
      ) : (
        <Wrap>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold tracking-tight">
                Hola, {cliente.name}
              </h2>
              <span className="text-sm text-muted-foreground">
                Este es tu estado de cuenta
              </span>
            </div>
            <TotalBox monto={deuda(cliente)} />
          </div>

          <Card className="gap-2 p-6">
            <h3 className="text-base font-semibold tracking-tight">
              Productos fiados
            </h3>
            {(cliente.items || []).length === 0 && (
              <p className="text-sm text-muted-foreground">
                Sin productos registrados.
              </p>
            )}
            {(cliente.items || []).map((it) => (
              <div
                className="flex items-center justify-between gap-3 border-b border-slate-100 py-3 last:border-0"
                key={it.id}
              >
                <div className="min-w-0">
                  <strong className="block truncate">
                    {it.descripcion}
                  </strong>
                  <div className="text-xs text-muted-foreground">
                    {fmtFecha(it.fecha)} ·{" "}
                    {it.cantidad > 1
                      ? `${it.cantidad} × ${fmtMoney(it.precio)}`
                      : fmtMoney(it.precio)}
                  </div>
                </div>
                <strong className={cn("shrink-0", moneyCls)}>
                  {fmtMoney(it.precio * (it.cantidad || 1))}
                </strong>
              </div>
            ))}
            <Totales cliente={cliente} />
          </Card>

          {(cliente.pagos || []).length > 0 && (
            <Card className="gap-3 p-6">
              <h3 className="text-base font-semibold tracking-tight">
                Mis abonos
              </h3>
              <div className="flex flex-col gap-2">
                {(cliente.pagos || []).map((p) => (
                  <div
                    className="flex items-center justify-between rounded-lg bg-emerald-50 px-3.5 py-2 text-sm"
                    key={p.id}
                  >
                    <span className="text-xs text-muted-foreground">
                      {fmtFecha(p.fecha)}
                    </span>
                    <strong className={cn(moneyCls, pagadoCls)}>
                      − {fmtMoney(p.monto)}
                    </strong>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </Wrap>
      )}
    </div>
  );
}

export default App;
