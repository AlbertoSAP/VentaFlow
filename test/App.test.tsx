import { render, screen } from "@testing-library/react";
import App from "../src/App.tsx";
import { useAuth } from "../src/hooks/useAuth.ts";
import { useClient } from "../src/hooks/useClient.tsx";
import { __fakeDb } from "./fakes/firebaseDatabase";

// Regla de testing (2026-10-24): en los padres, los hijos van
// mockeados. App/Acceso solo prueba su puerta (ruta + rol); cada
// pantalla separada tiene su propio archivo de pruebas.
jest.mock("../src/hooks/useAuth.ts", () => ({
  useAuth: jest.fn(),
  mapAuthError: () => "Error de prueba",
}));

jest.mock("../src/hooks/useClient.tsx", () => ({
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

jest.mock("../src/features/access/VendorAuthScreen.tsx", () => ({
  VendorAuthScreen: () => <div data-testid="vendor-auth" />,
}));

jest.mock("../src/features/client/ClientAuthScreen.tsx", () => ({
  ClientAuthScreen: () => <div data-testid="client-auth" />,
}));

jest.mock("../src/features/vendor/VendorApp.tsx", () => ({
  VendorApp: () => <div data-testid="vendor-app" />,
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

const VENDOR = { user: { uid: "vendor-1" }, role: "vendedor" };

beforeEach(() => {
  jest.clearAllMocks();
  __fakeDb.reset();
  window.history.pushState({}, "", "/");
});

/** La puerta de acceso depende de la ruta: /vendedor o /cliente */
function irA(ruta: string) {
  window.history.pushState({}, "", ruta);
}

describe("puerta de acceso (App)", () => {
  it("muestra pantalla de carga mientras resuelve la sesión", () => {
    setAuth({ resolving: true });
    render(<App />);
    expect(screen.getByText("Conectando…")).toBeInTheDocument();
  });

  it("sin sesión, la ruta /vendedor muestra el acceso de vendedor", () => {
    setAuth({});
    irA("/vendedor");
    render(<App />);
    expect(screen.getByTestId("vendor-auth")).toBeInTheDocument();
    expect(screen.queryByTestId("client-auth")).not.toBeInTheDocument();
  });

  it("sin sesión, la ruta /cliente muestra el acceso de cliente", () => {
    setAuth({});
    irA("/cliente");
    render(<App />);
    expect(screen.getByTestId("client-auth")).toBeInTheDocument();
    expect(screen.queryByTestId("vendor-auth")).not.toBeInTheDocument();
  });

  it("la raíz de la app también es la entrada de clientes", () => {
    setAuth({});
    render(<App />);
    expect(screen.getByTestId("client-auth")).toBeInTheDocument();
    expect(screen.queryByTestId("vendor-auth")).not.toBeInTheDocument();
  });

  it("con sesión de vendedor muestra la app del vendedor", () => {
    setAuth(VENDOR);
    setClientsHook({ clients: [] });
    render(<App />);
    expect(screen.getByTestId("vendor-app")).toBeInTheDocument();
  });

  it("una cuenta sin registro asociado ve el aviso de cuenta huérfana", () => {
    setAuth({ user: { uid: "huerfano" }, role: null });
    render(<App />);
    expect(screen.getByText(/no tiene un registro activo/)).toBeInTheDocument();
  });
});

describe("vista del cliente (solo lectura, aún dentro de App.tsx)", () => {
  it("muestra su estado de cuenta sin controles de edición", async () => {
    __fakeDb.setData({
      clientes: {
        "cli-1": {
          idAuthVendedor: "vendor-1",
          name: "Ana",
          lastName: "López",
          email: "flowventas13+88887777@gmail.com",
          telephone: "88887777",
          created: 1,
          items: [
            {
              id: "i1",
              descripcion: "Arroz",
              precio: 80,
              cantidad: 1,
              fecha: 1791845068683,
            },
          ],
          pagos: [{ id: "p1", monto: 30, fecha: 1791845068683 }],
        },
      },
    });
    setAuth({ user: { uid: "cli-1" }, role: "cliente" });
    render(<App />);

    expect(await screen.findByText(/Hola, Ana/)).toBeInTheDocument();
    expect(screen.getByText("Arroz")).toBeInTheDocument();
    expect(screen.getAllByText("C$ 50.00").length).toBeGreaterThan(0);
    expect(screen.queryByText("Agregar fiado")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Añadir" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "quitar" }),
    ).not.toBeInTheDocument();
  });

  it("la vista del cliente también muestra su saldo a favor", async () => {
    __fakeDb.setData({
      clientes: {
        "cli-2": {
          idAuthVendedor: "vendor-1",
          name: "Luis",
          lastName: "Pérez",
          email: "flowventas13+99998888@gmail.com",
          telephone: "99998888",
          created: 1,
          items: [
            {
              id: "i1",
              descripcion: "Arroz",
              precio: 50,
              cantidad: 1,
              fecha: 1791845068683,
            },
          ],
          pagos: [{ id: "p1", monto: 80, fecha: 1791845068683 }],
        },
      },
    });
    setAuth({ user: { uid: "cli-2" }, role: "cliente" });
    render(<App />);

    expect(await screen.findByText(/Hola, Luis/)).toBeInTheDocument();
    expect(screen.getByText("Saldo a favor:")).toBeInTheDocument();
    expect(screen.getByText("+ C$ 30.00")).toBeInTheDocument();
  });
});
