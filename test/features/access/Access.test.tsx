import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { Access } from "../../../src/features/access/Access.tsx";
import { useAuth } from "../../../src/hooks/useAuth.ts";

// Hijos mockeados: cada pantalla tiene sus propias pruebas. Access
// solo prueba su puerta (sesión + rol + ruta).
jest.mock("../../../src/hooks/useAuth.ts", () => ({
  useAuth: jest.fn(),
  mapAuthError: () => "Error de prueba",
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

jest.mock("../../../src/features/access/VendorAuthScreen.tsx", () => ({
  VendorAuthScreen: () => <div data-testid="vendor-auth" />,
}));

jest.mock("../../../src/features/client/ClientAuthScreen.tsx", () => ({
  ClientAuthScreen: () => <div data-testid="client-auth" />,
}));

jest.mock("../../../src/features/vendor/VendorApp.tsx", () => ({
  VendorApp: () => <div data-testid="vendor-app" />,
}));

jest.mock("../../../src/features/access/ClientApp.tsx", () => ({
  ClientApp: () => <div data-testid="client-app" />,
}));

const useAuthMock = useAuth as unknown as jest.Mock;

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

function renderAccess(ruta = "/") {
  return render(
    <MemoryRouter initialEntries={[ruta]}>
      <Access />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe("Access (puerta de acceso)", () => {
  it("muestra pantalla de carga mientras resuelve la sesión", () => {
    setAuth({ resolving: true });
    renderAccess();
    expect(screen.getByText("Conectando…")).toBeInTheDocument();
  });

  it("sin sesión, la ruta /vendedor muestra el acceso de vendedor", () => {
    setAuth({});
    renderAccess("/vendedor");
    expect(screen.getByTestId("vendor-auth")).toBeInTheDocument();
    expect(screen.queryByTestId("client-auth")).not.toBeInTheDocument();
  });

  it("sin sesión, la ruta /cliente muestra el acceso de cliente", () => {
    setAuth({});
    renderAccess("/cliente");
    expect(screen.getByTestId("client-auth")).toBeInTheDocument();
    expect(screen.queryByTestId("vendor-auth")).not.toBeInTheDocument();
  });

  it("la raíz también es la entrada de clientes", () => {
    setAuth({});
    renderAccess("/");
    expect(screen.getByTestId("client-auth")).toBeInTheDocument();
    expect(screen.queryByTestId("vendor-auth")).not.toBeInTheDocument();
  });

  it("con sesión de vendedor muestra la app del vendedor", () => {
    setAuth({ user: { uid: "vendor-1" }, role: "vendedor" });
    renderAccess();
    expect(screen.getByTestId("vendor-app")).toBeInTheDocument();
  });

  it("con sesión de cliente muestra su estado de cuenta", () => {
    setAuth({ user: { uid: "cli-1" }, role: "cliente" });
    renderAccess();
    expect(screen.getByTestId("client-app")).toBeInTheDocument();
  });

  it("una cuenta sin registro asociado ve el aviso de cuenta huérfana", () => {
    setAuth({ user: { uid: "huerfano" }, role: null });
    renderAccess();
    expect(screen.getByText(/no tiene un registro activo/)).toBeInTheDocument();
  });
});
