import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { VendorApp } from "../../../src/features/vendor/VendorApp.tsx";
import { useAuth } from "../../../src/hooks/useAuth.ts";
import { useClient } from "../../../src/hooks/useClient.tsx";
import { __fakeDb } from "../../fakes/firebaseDatabase";
import { makeClient, makeClientSinRegistros } from "../../fixtures";

// Hijos mockeados: cada uno tiene sus propias pruebas. El mock de la
// lista reproduce su contrato (búsqueda + abrir detalle) para probar
// el cableado de VendorApp (filtro por useMemo, cambio de vista).
jest.mock("../../../src/hooks/useAuth.ts", () => ({
  useAuth: jest.fn(),
  mapAuthError: () => "Error de prueba",
}));

jest.mock("../../../src/hooks/useClient.tsx", () => ({
  useClient: jest.fn(),
}));

jest.mock("@/components/shared/Topbar", () => ({
  Topbar: ({ children }: { children?: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

jest.mock("@/components/shared/Wrap", () => ({
  Wrap: ({ children }: { children?: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

jest.mock("@/Dashboard", () => {
  const actual = jest.requireActual("@/Dashboard");
  return {
    __esModule: true,
    default: () => <div data-testid="dashboard" />,
    metricas: actual.metricas,
  };
});

jest.mock("../../../src/features/vendor/ClientList.tsx", () => ({
  ClientList: ({
    clientes,
    busqueda,
    setBusqueda,
    onAbrir,
  }: {
    clientes: { id: string; name: string; lastName: string }[];
    busqueda: string;
    setBusqueda: (v: string) => void;
    onAbrir: (id: string) => void;
  }) => (
    <div data-testid="client-list">
      <input
        placeholder="Buscar cliente..."
        value={busqueda}
        onChange={(e) => setBusqueda(e.target.value)}
      />
      {clientes.map((c) => (
        <button key={c.id} onClick={() => onAbrir(c.id)}>
          {c.name} {c.lastName}
        </button>
      ))}
    </div>
  ),
}));

jest.mock("../../../src/features/vendor/ClientDetails.tsx", () => ({
  ClientDetails: ({
    cliente,
  }: {
    cliente?: { name: string; lastName: string };
  }) => (
    <div data-testid="client-details">
      {cliente ? `${cliente.name} ${cliente.lastName}` : "sin cliente"}
    </div>
  ),
}));

jest.mock("../../../src/features/vendor/RequestsPanel.tsx", () => ({
  RequestsPanel: () => <div data-testid="requests-panel" />,
}));

jest.mock("../../../src/features/access/AwaitScreen.tsx", () => ({
  AwaitScreen: ({ estado }: { estado: string }) => (
    <div data-testid="await-screen">{estado}</div>
  ),
}));

const useAuthMock = useAuth as unknown as jest.Mock;
const useClientMock = useClient as unknown as jest.Mock;

function setAuth(partial: Record<string, unknown>) {
  useAuthMock.mockReturnValue({
    user: null,
    role: null,
    resolving: false,
    estado: "aprobado",
    esAdmin: false,
    registerVendor: jest.fn(async () => {}),
    loginVendor: jest.fn(async () => {}),
    loginClient: jest.fn(async () => {}),
    logout: jest.fn(async () => {}),
    ...partial,
  });
}

function setClientsHook(partial: Record<string, unknown>) {
  useClientMock.mockReturnValue({
    clients: [],
    loading: false,
    createClient: jest.fn(async () => ({ ok: false, error: "error" })),
    deleteClient: jest.fn(async () => null),
    saveClient: jest.fn(async () => {}),
    ...partial,
  });
}

const VENDOR_PROPS = {
  vendorUid: "vendor-1",
  onLogout: jest.fn(async () => {}),
  estado: "aprobado" as const,
  esAdmin: false,
};

beforeEach(() => {
  jest.clearAllMocks();
  __fakeDb.reset();
  window.history.pushState({}, "", "/");
});

describe("VendorApp", () => {
  it("un vendedor pendiente solo ve la pantalla de espera", () => {
    setAuth({});
    setClientsHook({ clients: [] });
    render(<VendorApp {...VENDOR_PROPS} estado="pendiente" />);

    expect(screen.getByTestId("await-screen")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /Clientes/ }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /Dashboard/ }),
    ).not.toBeInTheDocument();
  });

  it("al ser aprobado, la pantalla de espera se libera sin volver a montar (regresión: orden de hooks)", () => {
    setAuth({});
    setClientsHook({ clients: [] });
    const { rerender } = render(
      <VendorApp {...VENDOR_PROPS} estado="pendiente" />,
    );
    expect(screen.getByTestId("await-screen")).toBeInTheDocument();

    rerender(<VendorApp {...VENDOR_PROPS} estado="aprobado" />);
    expect(screen.queryByTestId("await-screen")).not.toBeInTheDocument();
    expect(screen.getByTestId("dashboard")).toBeInTheDocument();
  });

  it("un vendedor rechazado ve la pantalla de espera con su estado", () => {
    setAuth({});
    setClientsHook({ clients: [] });
    render(<VendorApp {...VENDOR_PROPS} estado="rechazado" />);
    expect(screen.getByTestId("await-screen")).toHaveTextContent("rechazado");
  });

  it("muestra el dashboard por defecto y navega a la lista", async () => {
    const user = userEvent.setup();
    setAuth({});
    setClientsHook({ clients: [makeClient({ id: "a1" })] });
    render(<VendorApp {...VENDOR_PROPS} />);

    expect(screen.getByTestId("dashboard")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /Clientes/ }));
    expect(screen.getByTestId("client-list")).toBeInTheDocument();
  });

  it("la búsqueda filtra la lista (filtro por useMemo del padre)", async () => {
    const user = userEvent.setup();
    setAuth({});
    setClientsHook({
      clients: [
        makeClient({ id: "a1" }),
        makeClientSinRegistros({ id: "l1", name: "Luis", lastName: "Pérez" }),
      ],
    });
    render(<VendorApp {...VENDOR_PROPS} />);

    await user.click(screen.getByRole("button", { name: /Clientes/ }));
    expect(screen.getByText("Ana López")).toBeInTheDocument();
    expect(screen.getByText("Luis Pérez")).toBeInTheDocument();

    await user.type(screen.getByPlaceholderText(/Buscar cliente/), "Luis");
    expect(screen.queryByText("Ana López")).not.toBeInTheDocument();
    expect(screen.getByText("Luis Pérez")).toBeInTheDocument();
  });

  it("abrir un cliente muestra su detalle", async () => {
    const user = userEvent.setup();
    setAuth({});
    setClientsHook({ clients: [makeClient({ id: "a1" })] });
    render(<VendorApp {...VENDOR_PROPS} />);

    await user.click(screen.getByRole("button", { name: /Clientes/ }));
    await user.click(screen.getByRole("button", { name: "Ana López" }));
    expect(screen.getByTestId("client-details")).toHaveTextContent(
      "Ana López",
    );
  });

  it("mientras cargan los clientes muestra el aviso de carga", () => {
    setAuth({});
    setClientsHook({ clients: [], loading: true });
    render(<VendorApp {...VENDOR_PROPS} />);
    expect(screen.getByText("Cargando tus clientes…")).toBeInTheDocument();
  });

  it("el admin ve la pestaña Solicitudes con el conteo de pendientes", async () => {
    const user = userEvent.setup();
    __fakeDb.setData({
      vendedores: {
        "vendor-1": { name: "Admin", email: "admin@x.com", created: 1 },
        v2: { name: "Nuevo Vendedor", email: "nuevo@x.com", created: 2 },
      },
      aprobaciones: { "vendor-1": { estado: "aprobado" } },
    });
    setAuth({});
    setClientsHook({ clients: [] });
    render(<VendorApp {...VENDOR_PROPS} estado="pendiente" esAdmin />);

    await user.click(
      screen.getByRole("button", { name: /Solicitudes \(1\)/ }),
    );
    expect(screen.getByTestId("requests-panel")).toBeInTheDocument();
  });

  it("sin ser admin no aparece la pestaña Solicitudes", () => {
    setAuth({});
    setClientsHook({ clients: [] });
    render(<VendorApp {...VENDOR_PROPS} />);
    expect(
      screen.queryByRole("button", { name: /Solicitudes/ }),
    ).not.toBeInTheDocument();
  });
});
