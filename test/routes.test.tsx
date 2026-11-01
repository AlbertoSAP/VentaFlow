import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { AuthRoutes, VendorRoutes } from "../src/routes";
import { ClientList } from "../src/features/vendor/ClientList.tsx";
import { ClientDetails } from "../src/features/vendor/ClientDetails.tsx";
import { RequestsPanel } from "../src/features/vendor/RequestsPanel.tsx";
import { makeClient } from "./fixtures";

// Hijos automockeados: cada uno tiene sus propias pruebas. Aquí solo
// se prueba que cada ruta resuelve a la pantalla que le corresponde.
jest.mock("../src/Dashboard", () => ({
  __esModule: true,
  default: () => <div data-testid="dashboard" />,
}));

jest.mock("../src/features/vendor/ClientList.tsx");
jest.mock("../src/features/vendor/ClientDetails.tsx");
jest.mock("../src/features/vendor/RequestsPanel.tsx");

const mockClientList = ClientList as jest.Mock;
const mockClientDetails = ClientDetails as jest.Mock;
const mockRequestsPanel = RequestsPanel as jest.Mock;

// Un componente automockeado no retorna nada y React fallaría al
// renderizarlo: se le da una implementación mínima que reproduce su
// marcador, para que las pruebas de rutas sigan viendo la pantalla.
mockClientList.mockImplementation(() => <div data-testid="client-list" />);
mockClientDetails.mockImplementation(
  ({ cliente }: { cliente?: { name: string; lastName: string } }) => (
    <div data-testid="client-details">
      {cliente ? `${cliente.name} ${cliente.lastName}` : "sin cliente"}
    </div>
  ),
);
mockRequestsPanel.mockImplementation(() => (
  <div data-testid="requests-panel" />
));

beforeEach(() => {
  jest.clearAllMocks();
});

const noop = async () => {};

function renderAuthRoutes(ruta: string) {
  render(
    <MemoryRouter initialEntries={[ruta]}>
      <AuthRoutes
        loginVendor={noop}
        registerVendor={noop}
        loginClient={noop}
      />
    </MemoryRouter>,
  );
}

function renderVendorRoutes(
  ruta: string,
  esAdmin = false,
  client = makeClient(),
) {
  render(
    <MemoryRouter initialEntries={[ruta]}>
      <VendorRoutes
        clients={[client]}
        createClient={async () => ({ ok: false, error: "error" })}
        deleteClient={async () => null}
        busqueda=""
        setBusqueda={() => {}}
        clientes={[client]}
        totalPorCobrar={100}
        onAbrir={() => {}}
        saveClient={noop}
        catalogo={[]}
        addFrecuente={noop}
        deleteFrecuente={noop}
        vendedoresAdmin={[]}
        vendorUid="vendor-1"
        setEstadoVendedor={noop}
        esAdmin={esAdmin}
      />
    </MemoryRouter>,
  );
}

describe("AuthRoutes", () => {
  it("muestra el login de vendedor en /vendedor", () => {
    renderAuthRoutes("/vendedor");
    expect(
      screen.getByPlaceholderText("Tu correo *"),
    ).toBeInTheDocument();
    expect(
      screen.queryByPlaceholderText("Tu número de teléfono *"),
    ).not.toBeInTheDocument();
  });

  it("muestra el login de cliente en la raíz y en cualquier otra ruta", () => {
    renderAuthRoutes("/");
    expect(
      screen.getByPlaceholderText("Tu número de teléfono *"),
    ).toBeInTheDocument();
    expect(
      screen.queryByPlaceholderText("Tu correo *"),
    ).not.toBeInTheDocument();
  });
});

describe("VendorRoutes", () => {
  it("muestra el dashboard en /vendedor", () => {
    renderVendorRoutes("/vendedor");
    expect(screen.getByTestId("dashboard")).toBeInTheDocument();
  });

  it("muestra la lista en /vendedor/clientes", () => {
    renderVendorRoutes("/vendedor/clientes");
    expect(screen.getByTestId("client-list")).toBeInTheDocument();
    expect(mockClientList).toHaveBeenCalled();
  });

  it("muestra el detalle del cliente de la URL", () => {
    const client = makeClient();
    renderVendorRoutes(`/vendedor/clientes/${client.id}`, false, client);
    expect(screen.getByTestId("client-details")).toHaveTextContent(
      `${client.name} ${client.lastName}`,
    );
    expect(mockClientDetails).toHaveBeenCalled();
  });

  it("muestra el detalle sin cliente cuando el id no existe", () => {
    renderVendorRoutes("/vendedor/clientes/no-existe");
    expect(screen.getByTestId("client-details")).toHaveTextContent(
      "sin cliente",
    );
  });

  it("redireige solicitudes al dashboard cuando no es admin", () => {
    renderVendorRoutes("/vendedor/solicitudes", false);
    expect(screen.getByTestId("dashboard")).toBeInTheDocument();
    expect(
      screen.queryByTestId("requests-panel"),
    ).not.toBeInTheDocument();
  });

  it("muestra solicitudes cuando es admin", () => {
    renderVendorRoutes("/vendedor/solicitudes", true);
    expect(screen.getByTestId("requests-panel")).toBeInTheDocument();
    expect(mockRequestsPanel).toHaveBeenCalled();
  });

  it("redireige una ruta desconocida al dashboard", () => {
    renderVendorRoutes("/vendedor/otra-cosa");
    expect(screen.getByTestId("dashboard")).toBeInTheDocument();
  });
});
