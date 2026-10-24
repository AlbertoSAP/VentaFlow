import Dashboard, { metricas } from "@/Dashboard";
import { useAdminVendedores } from "@/hooks/useAdmin";
import { useCatalog } from "@/hooks/useCatalog";
import { useClient } from "@/hooks/useClient";
import { deuda, EstadoVendedor, fullName, setEstadoVendedor } from "@/storage";
import { useMemo, useState } from "react";
import { AwaitScreen } from "../access/AwaitScreen";
import { Topbar } from "@/components/shared/Topbar";
import { navBtnCls } from "@/components/shared/navBtnCls";
import { Wrap } from "@/components/shared/Wrap";
import { ClientList } from "./ClientList";
import { RequestsPanel } from "./RequestsPanel";
import { ClientDetails } from "./ClientDetails";

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
    return clients.filter((c) => !q || fullName(c).toLowerCase().includes(q));
  }, [clients, busqueda]);

  const totalPorCobrar = clients.reduce((s, c) => s + deuda(c), 0);
  const m = metricas(clients);

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
        <ClientList
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
        <RequestsPanel
          vendedores={vendedoresAdmin}
          miUid={vendorUid}
          onSetEstado={(uid, e) => void setEstadoVendedor(uid, e)}
        />
      ) : (
        <ClientDetails
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
