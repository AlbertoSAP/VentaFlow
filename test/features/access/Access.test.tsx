import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { Access } from "../../../src/features/access/Access.tsx";
import { useAuth } from "../../../src/hooks/useAuth.ts";
import ClientApp from "@/features/client/ClientApp.tsx";
import { VendorApp } from "../../../src/features/vendor/VendorApp.tsx";
import { latestMockCall } from "../../testHelpers.ts";
import { act } from "react";

// Hijos mockeados: cada pantalla tiene sus propias pruebas. Access
// solo prueba su puerta (sesión + rol + ruta).
jest.mock("../../../src/hooks/useAuth.ts", () => ({
  useAuth: jest.fn(),
}));
jest.mock("../../../src/lib/mapErros.ts", () => ({
  mapAuthErrors: () => "Error de prueba",
}));

jest.mock("@/components/shared/Topbar", () => ({
  Topbar: ({ children }: { children?: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

jest.mock("@/components/shared/Wrap", () => ({
  Wrap: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
}));

jest.mock("../../../src/features/access/VendorAuthScreen.tsx", () => ({
  VendorAuthScreen: () => <div data-testid="vendor-auth" />,
}));

jest.mock("../../../src/features/access/ClientAuthScreen.tsx", () => ({
  ClientAuthScreen: () => <div data-testid="client-auth" />,
}));

jest.mock("../../../src/features/vendor/VendorApp.tsx");
const mockVendorApp = VendorApp as jest.Mock;

jest.mock("../../../src/features/client/ClientApp.tsx");
const mockClientApp = ClientApp as jest.Mock;
const mockNavigate = jest.fn();

jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useNavigate: () => mockNavigate,
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
    expect(mockVendorApp).toHaveBeenCalled();
  });

  it("retorna /vendedor cuando el vendedor cierra sesion", async () => {
    setAuth({ user: { uid: "vendor-1" }, role: "vendedor" });
    renderAccess();

    const { onLogout } = latestMockCall(mockVendorApp)[0];

    await act(async () => {
      await onLogout();
    });

    expect(mockNavigate).toHaveBeenCalledWith("/vendedor");
  });

  it("con sesión de cliente muestra su estado de cuenta", () => {
    setAuth({ user: { uid: "cli-1" }, role: "cliente" });
    renderAccess();
    expect(mockClientApp).toHaveBeenCalled();
  });

  it("retorna / cuando el cliente cierra sesion", async () => {
    setAuth({ user: { uid: "cli-1" }, role: "cliente" });
    renderAccess();

    const { onLogout } = latestMockCall(mockClientApp)[0];

    await act(async () => {
      await onLogout();
    });

    expect(mockNavigate).toHaveBeenCalledWith("/");
  });

  it("una cuenta sin registro asociado ve el aviso de cuenta huérfana", () => {
    setAuth({ user: { uid: "huerfano" }, role: null });
    renderAccess();
    expect(screen.getByText(/no tiene un registro activo/)).toBeInTheDocument();
  });
});
