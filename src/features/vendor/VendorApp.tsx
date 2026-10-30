import Dashboard from "@/Dashboard";
import { useAdminVendedores } from "@/hooks/useAdmin";
import { useCatalog } from "@/hooks/useCatalog";
import { useClient } from "@/hooks/useClient";
import { useClientCalculations } from "@/hooks/useClientCalculations";
import { useMetrics } from "@/hooks/useMetrics";
import type {
  CatalogProduct,
  Client,
  EstadoVendedor,
} from "@/domain/models";
import { useMemo, useState } from "react";
import {
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate,
  useParams,
} from "react-router-dom";
import { AwaitScreen } from "../access/AwaitScreen";
import { Topbar } from "@/components/shared/Topbar";
import { NavBtnCls } from "@/components/shared/NavBtnCls";
import { Wrap } from "@/components/shared/Wrap";
import { ClientList } from "./ClientList";
import { RequestsPanel } from "./RequestsPanel";
import { ClientDetails } from "./ClientDetails";

/* ==================== Vista del vendedor ==================== */

/* Las secciones del vendedor son rutas, no estado interno: así un
 * refresh en /vendedor/clientes o en el detalle de un cliente deja
 * al vendedor en esa misma página (el servidor sirve index.html
 * para cualquier ruta y el Router resuelve la vista). */

interface VendorProps {
  vendorUid: string;
  onLogout: () => Promise<void>;
  estado: EstadoVendedor | null;
  esAdmin: boolean;
}

interface DetalleClienteProps {
  clients: Client[];
  onSave: (c: Client) => Promise<void>;
  catalogo: CatalogProduct[];
  onAddFrecuente: (descripcion: string, precio: number) => Promise<void>;
  onDeleteFrecuente: (productId: string) => Promise<void>;
}

/* Componente a nivel de módulo (no dentro de VendorApp): si se
 * definiera dentro, cada render del padre lo remontaría y el
 * detalle perdería su estado local cuando cambian los clientes. */
function DetalleCliente({
  clients,
  onSave,
  catalogo,
  onAddFrecuente,
  onDeleteFrecuente,
}: DetalleClienteProps) {
  const { id } = useParams();
  const navigate = useNavigate();
  return (
    <ClientDetails
      onSave={onSave}
      cliente={clients.find((c) => c.id === id)}
      onVolver={() => navigate("/vendedor/clientes")}
      catalogo={catalogo}
      onAddFrecuente={onAddFrecuente}
      onDeleteFrecuente={onDeleteFrecuente}
    />
  );
}

export function VendorApp({
  vendorUid,
  onLogout,
  estado,
  esAdmin,
}: VendorProps) {
  const { clients, loading, createClient, deleteClient, saveClient } =
    useClient(vendorUid);
  const {
    products: catalogo,
    addProduct: addFrecuente,
    deleteProduct: deleteFrecuente,
  } = useCatalog(vendorUid);
  const { vendedores: vendedoresAdmin, setEstadoVendedor } =
    useAdminVendedores(esAdmin);
  const [busqueda, setBusqueda] = useState("");
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { fullName } = useClientCalculations();
  const m = useMetrics(clients);
  // OJO: ningún return antes de terminar TODOS los hooks — la
  // compuerta va después (el orden de hooks no puede cambiar
  // entre renders, p. ej. cuando el estado pasa a "aprobado").

  const pendientesCount = vendedoresAdmin.filter(
    (v) => v.estado === "pendiente" && v.id !== vendorUid,
  ).length;

  const clientesFiltrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return clients.filter((c) => !q || fullName(c).toLowerCase().includes(q));
  }, [clients, busqueda, fullName]);

  const totalPorCobrar = m.totalPorCobrar;

  // Pestaña activa según la ruta (el detalle no marca ninguna,
  // igual que antes no marcaba ninguna vista).
  const activa =
    pathname === "/vendedor"
      ? "dashboard"
      : pathname === "/vendedor/clientes"
        ? "lista"
        : pathname === "/vendedor/solicitudes"
          ? "solicitudes"
          : "ninguna";

  // Compuerta de aprobación (después de todos los hooks): sin el
  // visto bueno de un admin (y sin ser admin), el vendedor solo
  // ve la pantalla de espera.
  if (!esAdmin && estado !== "aprobado") {
    return <AwaitScreen estado={estado ?? "pendiente"} onLogout={onLogout} />;
  }

  return (
    <div className="min-h-screen">
      <Topbar menu>
        <button
          type="button"
          className={NavBtnCls(activa === "dashboard")}
          onClick={() => navigate("/vendedor")}
        >
          Dashboard
        </button>

        <button
          type="button"
          className={NavBtnCls(activa === "lista")}
          onClick={() => navigate("/vendedor/clientes")}
        >
          Clientes
          {m.clientesConDeuda > 0 ? ` (${m.clientesConDeuda})` : ""}
        </button>

        {esAdmin && (
          <button
            type="button"
            className={NavBtnCls(activa === "solicitudes")}
            onClick={() => navigate("/vendedor/solicitudes")}
          >
            Solicitudes
            {pendientesCount > 0 ? ` (${pendientesCount})` : ""}
          </button>
        )}

        <button
          type="button"
          className={NavBtnCls(false)}
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
      ) : (
        <Routes>
          <Route path="/vendedor" element={<Dashboard clientes={clients} />} />
          <Route
            path="/vendedor/clientes"
            element={
              <ClientList
                allClients={clients}
                createClient={createClient}
                deleteClient={deleteClient}
                busqueda={busqueda}
                setBusqueda={setBusqueda}
                clientes={clientesFiltrados}
                totalPorCobrar={totalPorCobrar}
                onAbrir={(id: string) =>
                  navigate(`/vendedor/clientes/${id}`)
                }
              />
            }
          />
          <Route
            path="/vendedor/clientes/:id"
            element={
              <DetalleCliente
                clients={clients}
                onSave={saveClient}
                catalogo={catalogo}
                onAddFrecuente={addFrecuente}
                onDeleteFrecuente={deleteFrecuente}
              />
            }
          />
          <Route
            path="/vendedor/solicitudes"
            element={
              esAdmin ? (
                <RequestsPanel
                  vendedores={vendedoresAdmin}
                  miUid={vendorUid}
                  onSetEstado={(uid, e) => void setEstadoVendedor(uid, e)}
                />
              ) : (
                <Navigate to="/vendedor" replace />
              )
            }
          />
          <Route path="*" element={<Navigate to="/vendedor" replace />} />
        </Routes>
      )}
    </div>
  );
}
