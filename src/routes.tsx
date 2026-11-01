/* Definición de rutas de la app (React Router). Este es el único
 * archivo que define <Routes>: Access y VendorApp solo consumen
 * estos componentes. La lógica (sesión, aprobación, datos, estado
 * de la UI) sigue en los componentes que los usan; aquí solo se
 * declara qué ruta muestra qué pantalla. */

import {
  Navigate,
  Route,
  Routes,
  useNavigate,
  useParams,
} from "react-router-dom";
import Dashboard from "./Dashboard";
import { ClientList } from "./features/vendor/ClientList";
import { ClientDetails } from "./features/vendor/ClientDetails";
import { RequestsPanel } from "./features/vendor/RequestsPanel";
import { VendorAuthScreen } from "./features/access/VendorAuthScreen";
import { ClientAuthScreen } from "./features/access/ClientAuthScreen";
import type {
  CatalogProduct,
  Client,
  EstadoVendedor,
  VendorConEstado,
} from "./domain/models";
import type { CreateClientResult } from "./hooks/useClient";

/* ---------------- Acceso (sin sesión) ---------------- */

interface AuthRoutesProps {
  loginVendor: (email: string, password: string) => Promise<void>;
  registerVendor: (
    name: string,
    email: string,
    password: string,
  ) => Promise<void>;
  loginClient: (telephone: string, password: string) => Promise<void>;
}

/** Login de vendedor en /vendedor, de cliente en cualquier otra ruta. */
export function AuthRoutes({
  loginVendor,
  registerVendor,
  loginClient,
}: AuthRoutesProps) {
  const navigate = useNavigate();
  return (
    <Routes>
      <Route
        path="/vendedor"
        element={
          <VendorAuthScreen
            onLoginVendor={loginVendor}
            onRegisterVendor={registerVendor}
          />
        }
      />
      <Route
        path="*"
        element={
          <ClientAuthScreen
            onLoginClient={loginClient}
            onIrVendedor={() => navigate("/vendedor")}
          />
        }
      />
    </Routes>
  );
}

/* ---------------- Secciones del vendedor ---------------- */

interface DetalleClienteProps {
  clients: Client[];
  onSave: (c: Client) => Promise<void>;
  catalogo: CatalogProduct[];
  onAddFrecuente: (descripcion: string, precio: number) => Promise<void>;
  onDeleteFrecuente: (productId: string) => Promise<void>;
}

/* Componente a nivel de módulo (no dentro de VendorRoutes): si se
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
      cliente={clients.find((client) => client.id === id)}
      onVolver={() => navigate("/vendedor/clientes")}
      catalogo={catalogo}
      onAddFrecuente={onAddFrecuente}
      onDeleteFrecuente={onDeleteFrecuente}
    />
  );
}

interface VendorRoutesProps {
  clients: Client[];
  createClient: (input: {
    name: string;
    lastName: string;
    telephone: string;
  }) => Promise<CreateClientResult>;
  deleteClient: (id: string, name: string) => Promise<string | null>;
  busqueda: string;
  setBusqueda: (v: string) => void;
  clientes: Client[];
  totalPorCobrar: number;
  onAbrir: (id: string) => void;
  saveClient: (c: Client) => Promise<void>;
  catalogo: CatalogProduct[];
  addFrecuente: (descripcion: string, precio: number) => Promise<void>;
  deleteFrecuente: (productId: string) => Promise<void>;
  vendedoresAdmin: VendorConEstado[];
  vendorUid: string;
  setEstadoVendedor: (uid: string, estado: EstadoVendedor) => Promise<void>;
  esAdmin: boolean;
}

/** Secciones del vendedor; desconocida y solicitudes sin ser admin van a /vendedor. */
export function VendorRoutes({
  clients,
  createClient,
  deleteClient,
  busqueda,
  setBusqueda,
  clientes,
  totalPorCobrar,
  onAbrir,
  saveClient,
  catalogo,
  addFrecuente,
  deleteFrecuente,
  vendedoresAdmin,
  vendorUid,
  setEstadoVendedor,
  esAdmin,
}: VendorRoutesProps) {
  return (
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
            clientes={clientes}
            totalPorCobrar={totalPorCobrar}
            onAbrir={onAbrir}
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
              onSetEstado={(uid, event) => void setEstadoVendedor(uid, event)}
            />
          ) : (
            <Navigate to="/vendedor" replace />
          )
        }
      />
      <Route path="*" element={<Navigate to="/vendedor" replace />} />
    </Routes>
  );
}
