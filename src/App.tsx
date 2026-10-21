import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  uid,
  fmtMoney,
  fmtFecha,
  totalItems,
  totalPagos,
  deuda,
  fullName,
  subscribeOwnClient,
  type Client,
  type FiadoItem,
} from "./storage.ts";
import { useAuth, mapAuthError } from "./hooks/useAuth.ts";
import { useClient } from "./hooks/useClient.tsx";
import Dashboard, { metricas } from "./Dashboard.tsx";

function App() {
  const { user, role, resolving, registerVendor, loginVendor, loginClient, logout } =
    useAuth();

  if (resolving) {
    return (
      <div className="page">
        <header className="topbar">
          <span className="logo">📒 VentaFlow</span>
        </header>
        <main className="wrap">
          <p className="mut center">Conectando…</p>
        </main>
      </div>
    );
  }

  if (!user) {
    return (
      <AuthScreen
        onLoginVendor={loginVendor}
        onLoginClient={loginClient}
        onRegisterVendor={registerVendor}
      />
    );
  }

  if (role === "vendedor") {
    return <VendorApp vendorUid={user.uid} onLogout={logout} />;
  }

  if (role === "cliente") {
    return <ClientApp clientUid={user.uid} onLogout={logout} />;
  }

  // Hay sesión pero ningún registro asociado (ej: la cuenta quedó
  // huérfana porque su registro fue eliminado por el vendedor).
  return (
    <div className="page">
      <header className="topbar">
        <span className="logo">📒 VentaFlow</span>
        <button className="btn btn-ghost" onClick={() => void logout()}>
          Salir
        </button>
      </header>
      <main className="wrap">
        <p className="mut center">
          Esta cuenta no tiene un registro activo en VentaFlow. Si eras
          cliente, pide a tu vendedor que te registre de nuevo.
        </p>
      </main>
    </div>
  );
}

/* ==================== Pantalla de acceso ==================== */

interface AuthProps {
  onLoginVendor: (email: string, password: string) => Promise<void>;
  onLoginClient: (telephone: string, password: string) => Promise<void>;
  onRegisterVendor: (
    name: string,
    email: string,
    password: string,
  ) => Promise<void>;
}

function AuthScreen({ onLoginVendor, onLoginClient, onRegisterVendor }: AuthProps) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [loginAs, setLoginAs] = useState<"vendedor" | "cliente">("vendedor");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [telephone, setTelephone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      if (mode === "register") {
        await onRegisterVendor(name, email, password);
      } else if (loginAs === "vendedor") {
        await onLoginVendor(email, password);
      } else {
        await onLoginClient(telephone, password);
      }
    } catch (err) {
      setError(mapAuthError(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="page">
      <header className="topbar">
        <span className="logo">📒 VentaFlow</span>
      </header>

      <main className="wrap" style={{ maxWidth: 480 }}>
        <div className="form-card">
          <div className="seg">
            <button
              type="button"
              className={`seg-btn${mode === "login" ? " active" : ""}`}
              onClick={() => setMode("login")}
            >
              Iniciar sesión
            </button>
            <button
              type="button"
              className={`seg-btn${mode === "register" ? " active" : ""}`}
              onClick={() => setMode("register")}
            >
              Crear cuenta de vendedor
            </button>
          </div>

          <form className="stack" onSubmit={submit}>
            {mode === "register" && (
              <>
                <input
                  placeholder="Tu nombre *"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
                <input
                  type="email"
                  placeholder="Tu correo *"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
                <input
                  type="password"
                  placeholder="Contraseña (mín. 6 caracteres) *"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <p className="mut small">
                  El registro es solo para vendedores. Las cuentas de
                  cliente las crea su vendedor desde la app.
                </p>
              </>
            )}

            {mode === "login" && (
              <>
                <div className="seg">
                  <button
                    type="button"
                    className={`seg-btn${loginAs === "vendedor" ? " active" : ""}`}
                    onClick={() => setLoginAs("vendedor")}
                  >
                    Soy vendedor
                  </button>
                  <button
                    type="button"
                    className={`seg-btn${loginAs === "cliente" ? " active" : ""}`}
                    onClick={() => setLoginAs("cliente")}
                  >
                    Soy cliente
                  </button>
                </div>

                {loginAs === "vendedor" ? (
                  <input
                    type="email"
                    placeholder="Tu correo *"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                ) : (
                  <>
                    <input
                      placeholder="Tu número de teléfono *"
                      value={telephone}
                      onChange={(e) => setTelephone(e.target.value)}
                    />
                    <p className="mut small">
                      Entrás con el teléfono que te registró tu vendedor y
                      la contraseña que te entregó.
                    </p>
                  </>
                )}
                <input
                  type="password"
                  placeholder="Contraseña *"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </>
            )}

            {error && <p className="error">{error}</p>}

            <button className="btn btn-primary" type="submit" disabled={busy}>
              {busy
                ? "Espera…"
                : mode === "register"
                  ? "Crear mi cuenta"
                  : "Entrar"}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}

/* ==================== Vista del vendedor ==================== */

type Vista =
  { tipo: "lista" } | { tipo: "detalle"; id: string } | { tipo: "dashboard" };

interface VendorProps {
  vendorUid: string;
  onLogout: () => Promise<void>;
}

function VendorApp({ vendorUid, onLogout }: VendorProps) {
  const { clients, loading, createClient, deleteClient, saveClient } =
    useClient(vendorUid);
  const [vista, setVista] = useState<Vista>({ tipo: "dashboard" });
  const [busqueda, setBusqueda] = useState("");

  const clientesFiltrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return clients.filter(
      (c) => !q || fullName(c).toLowerCase().includes(q),
    );
  }, [clients, busqueda]);

  const totalPorCobrar = clients.reduce((s, c) => s + deuda(c), 0);
  const m = metricas(clients);

  return (
    <div className="page">
      <header className="topbar">
        <span className="logo">📒 VentaFlow</span>

        <nav className="nav">
          <button
            type="button"
            className={`nav-btn${vista.tipo === "dashboard" ? " active" : ""}`}
            onClick={() => setVista({ tipo: "dashboard" })}
          >
            Dashboard
          </button>

          <button
            type="button"
            className={`nav-btn${vista.tipo === "lista" ? " active" : ""}`}
            onClick={() => setVista({ tipo: "lista" })}
          >
            Clientes
            {m.clientesConDeuda > 0 ? ` (${m.clientesConDeuda})` : ""}
          </button>

          <button
            type="button"
            className="nav-btn"
            onClick={() => void onLogout()}
          >
            Salir
          </button>
        </nav>
      </header>

      {loading ? (
        <main className="wrap">
          <p className="mut center">Cargando tus clientes…</p>
        </main>
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
      ) : (
        <DetalleCliente
          onSave={saveClient}
          cliente={clients.find((c) => c.id === vista.id)}
          onVolver={() => setVista({ tipo: "lista" })}
        />
      )}
    </div>
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
  };

  return (
    <main className="wrap">
      <div className="resumen">
        <div>
          <span>Total por cobrar</span>
          <strong className="deuda">{fmtMoney(totalPorCobrar)}</strong>
        </div>
        <div>
          <span>Clientes con deuda</span>
          <strong>{allClients.filter((c) => deuda(c) > 0).length}</strong>
        </div>
      </div>

      <form className="form-card" onSubmit={agregar}>
        <h3>Agregar cliente</h3>
        <div className="stack">
          <div className="row">
            <input
              placeholder="Nombre *"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <input
              placeholder="Apellido"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
            />
          </div>
          <div className="row">
            <input
              placeholder="Teléfono (será su usuario para entrar) *"
              value={telephone}
              onChange={(e) => setTelephone(e.target.value)}
            />
            <button className="btn btn-primary" type="submit" disabled={busy}>
              {busy ? "Creando…" : "Agregar"}
            </button>
          </div>
          <p className="mut small">
            Al agregarlo se crea también su cuenta: entrará con su teléfono
            y la contraseña temporal que se genera aquí.
          </p>
          {formError && <p className="error">{formError}</p>}
          {creado && (
            <div className="success-card">
              <strong>✅ Cuenta creada para {creado.nombre}</strong>
              <span>
                Usuario: <b>{creado.telephone}</b> · Contraseña temporal:{" "}
                <b>{creado.tempPassword}</b>
              </span>
              <span className="small">
                Entrégale estos datos ahora: la contraseña no se guarda y
                no se puede volver a ver.
              </span>
            </div>
          )}
        </div>
      </form>

      <input
        className="search"
        placeholder="🔍 Buscar cliente..."
        value={busqueda}
        onChange={(e) => setBusqueda(e.target.value)}
      />

      <div className="list">
        {clientes.map((c) => {
          const d = deuda(c);
          return (
            <div
              className="cliente-card"
              key={c.id}
              onClick={() => onAbrir(c.id)}
            >
              <div>
                <strong>{fullName(c)}</strong>
                {c.telephone && <span className="mut"> · {c.telephone}</span>}
                <div className="mut small">
                  {c.items?.length || 0} productos fiados
                </div>
              </div>
              <div className="right">
                <strong className={d > 0 ? "deuda" : "pagado"}>
                  {fmtMoney(d)}
                </strong>
                <button
                  className="link danger"
                  onClick={(e) => {
                    e.stopPropagation();
                    eliminar(c);
                  }}
                >
                  eliminar
                </button>
              </div>
            </div>
          );
        })}
        {clientes.length === 0 && (
          <p className="mut center">
            No hay clientes. Agrega el primero arriba.
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
    </main>
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
  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <h3>{title}</h3>
        <p className="mut">{message}</p>
        <div className="modal-actions">
          {cancelLabel !== null && (
            <button className="btn btn-cancel" type="button" onClick={onCancel}>
              {cancelLabel}
            </button>
          )}
          <button
            className={`btn ${confirmTone === "danger" ? "btn-danger" : "btn-primary"}`}
            type="button"
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

interface DetalleProps {
  onSave: (c: Client) => Promise<void>;
  cliente: Client | undefined;
  onVolver: () => void;
}

function DetalleCliente({ onSave, cliente }: DetalleProps) {
  const [desc, setDesc] = useState("");
  const [precio, setPrecio] = useState("");
  const [cantidad, setCantidad] = useState("1");
  const [montoPago, setMontoPago] = useState("");
  const [itemAQuitar, setItemAQuitar] = useState<FiadoItem | null>(null);
  const [confirmarSaldar, setConfirmarSaldar] = useState(false);

  if (!cliente)
    return (
      <main className="wrap">
        <p className="mut center">Cliente no encontrado.</p>
      </main>
    );

  const d = deuda(cliente);

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
  };

  // Quitar un producto exige confirmación en el modal: un clic
  // accidental no debe poder alterar la cuenta del cliente.
  const confirmarQuitarItem = () => {
    if (!itemAQuitar) return;
    const itemId = itemAQuitar.id;
    guardar((c) => {
      c.items = c.items.filter((it) => it.id !== itemId);
    });
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
  };

  // Saldar también pasa por el modal: registra un abono por el total.
  const confirmarSaldarPago = () => {
    guardar((c) => {
      c.pagos.unshift({ id: uid(), monto: d, fecha: Date.now() });
    });
    setConfirmarSaldar(false);
  };

  return (
    <main className="wrap">
      <div className="cliente-head">
        <div>
          <h2>{fullName(cliente)}</h2>
          {cliente.telephone && (
            <span className="mut">{cliente.telephone}</span>
          )}
        </div>
        <div className="total-box">
          <span>Deuda actual</span>
          <strong className={d > 0 ? "deuda" : "pagado"}>{fmtMoney(d)}</strong>
        </div>
      </div>

      <form className="form-card" onSubmit={agregarItem}>
        <h3>Agregar fiado</h3>
        <div className="row wrap-row">
          <input
            className="grow"
            placeholder="Descripción (ej: 2 libras de arroz) *"
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
          />
          <input
            className="num"
            type="number"
            min="0"
            step="0.01"
            placeholder="Precio *"
            value={precio}
            onChange={(e) => setPrecio(e.target.value)}
          />
          <input
            className="num"
            type="number"
            min="1"
            step="1"
            placeholder="Cant."
            value={cantidad}
            onChange={(e) => setCantidad(e.target.value)}
          />
          <button className="btn btn-primary" type="submit">
            Añadir
          </button>
        </div>
      </form>

      <div className="table-card">
        <h3>Productos fiados</h3>
        {(cliente.items || []).length === 0 && (
          <p className="mut">Sin productos registrados.</p>
        )}
        {(cliente.items || []).map((it) => (
          <div className="item-row" key={it.id}>
            <div>
              <strong>{it.descripcion}</strong>
              <div className="mut small">
                {fmtFecha(it.fecha)} ·{" "}
                {it.cantidad > 1
                  ? `${it.cantidad} × ${fmtMoney(it.precio)}`
                  : fmtMoney(it.precio)}
              </div>
            </div>
            <div className="right">
              <strong>{fmtMoney(it.precio * (it.cantidad || 1))}</strong>
              <button
                className="link danger"
                onClick={() => setItemAQuitar(it)}
              >
                quitar
              </button>
            </div>
          </div>
        ))}
        <div className="totales">
          <div>
            <span>Total fiado:</span>
            <strong>{fmtMoney(totalItems(cliente))}</strong>
          </div>
          <div>
            <span>Total abonado:</span>
            <strong className="pagado">
              − {fmtMoney(totalPagos(cliente))}
            </strong>
          </div>
          <div className="gran-total">
            <span>Deuda actual:</span>
            <strong className="deuda">{fmtMoney(d)}</strong>
          </div>
        </div>
      </div>

      <form className="form-card" onSubmit={registrarPago}>
        <h3>Registrar abono</h3>
        <div className="row">
          <input
            className="num"
            type="number"
            min="0"
            step="0.01"
            placeholder="Monto del abono"
            value={montoPago}
            onChange={(e) => setMontoPago(e.target.value)}
          />
          <button className="btn btn-ok" type="submit">
            Abonar
          </button>
          {d > 0 && (
            <button
              className="btn btn-ghost"
              type="button"
              onClick={() => setConfirmarSaldar(true)}
            >
              Saldar todo
            </button>
          )}
        </div>
        {(cliente.pagos || []).length > 0 && (
          <div className="pagos">
            {(cliente.pagos || []).map((p) => (
              <div className="pago-row" key={p.id}>
                <span className="mut small">{fmtFecha(p.fecha)}</span>
                <strong className="pagado">− {fmtMoney(p.monto)}</strong>
              </div>
            ))}
          </div>
        )}
      </form>

      {itemAQuitar && (
        <ConfirmModal
          title="¿Quitar este producto?"
          message={`Se quitará "${itemAQuitar.descripcion}" (${fmtMoney(itemAQuitar.precio * (itemAQuitar.cantidad || 1))}) de la cuenta de ${fullName(cliente)}. Esta acción no se puede deshacer.`}
          confirmLabel="Sí, quitar"
          onConfirm={confirmarQuitarItem}
          onCancel={() => setItemAQuitar(null)}
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
    </main>
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
    <div className="page">
      <header className="topbar">
        <span className="logo">📒 VentaFlow</span>
        <button className="btn btn-ghost" onClick={() => void onLogout()}>
          Salir
        </button>
      </header>

      {cliente === undefined ? (
        <main className="wrap">
          <p className="mut center">Cargando tu registro…</p>
        </main>
      ) : cliente === null ? (
        <main className="wrap">
          <p className="mut center">Tu registro no fue encontrado.</p>
        </main>
      ) : (
        <main className="wrap">
          <div className="cliente-head">
            <div>
              <h2>Hola, {cliente.name}</h2>
              <span className="mut">Este es tu estado de cuenta</span>
            </div>
            <div className="total-box">
              <span>Deuda actual</span>
              <strong
                className={deuda(cliente) > 0 ? "deuda" : "pagado"}
              >
                {fmtMoney(deuda(cliente))}
              </strong>
            </div>
          </div>

          <div className="table-card">
            <h3>Productos fiados</h3>
            {(cliente.items || []).length === 0 && (
              <p className="mut">Sin productos registrados.</p>
            )}
            {(cliente.items || []).map((it) => (
              <div className="item-row" key={it.id}>
                <div>
                  <strong>{it.descripcion}</strong>
                  <div className="mut small">
                    {fmtFecha(it.fecha)} ·{" "}
                    {it.cantidad > 1
                      ? `${it.cantidad} × ${fmtMoney(it.precio)}`
                      : fmtMoney(it.precio)}
                  </div>
                </div>
                <div className="right">
                  <strong>
                    {fmtMoney(it.precio * (it.cantidad || 1))}
                  </strong>
                </div>
              </div>
            ))}
            <div className="totales">
              <div>
                <span>Total fiado:</span>
                <strong>{fmtMoney(totalItems(cliente))}</strong>
              </div>
              <div>
                <span>Total abonado:</span>
                <strong className="pagado">
                  − {fmtMoney(totalPagos(cliente))}
                </strong>
              </div>
              <div className="gran-total">
                <span>Deuda actual:</span>
                <strong className="deuda">
                  {fmtMoney(deuda(cliente))}
                </strong>
              </div>
            </div>
          </div>

          {(cliente.pagos || []).length > 0 && (
            <div className="table-card">
              <h3>Mis abonos</h3>
              <div className="pagos" style={{ marginTop: 0 }}>
                {(cliente.pagos || []).map((p) => (
                  <div className="pago-row" key={p.id}>
                    <span className="mut small">{fmtFecha(p.fecha)}</span>
                    <strong className="pagado">
                      − {fmtMoney(p.monto)}
                    </strong>
                  </div>
                ))}
              </div>
            </div>
          )}
        </main>
      )}
    </div>
  );
}

export default App;
