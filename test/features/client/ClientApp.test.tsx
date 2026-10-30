import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { makeClient } from "../../fixtures.ts";
import type { Client } from "../../../src/domain/models";
import ClientApp from "../../../src/features/client/ClientApp.tsx";

// Hijos mockeados: cada uno tiene sus propias pruebas. El hook del
// registro se controla por prueba (undefined = cargando, null = sin
// registro, o el cliente).
const mockUseOwnClient = jest.fn(
  (_uid: string): Client | null | undefined => undefined,
);

jest.mock("@/hooks/useOwnClient", () => ({
  useOwnClient: (...args: unknown[]) =>
    (mockUseOwnClient as (...a: unknown[]) => unknown)(...args),
}));

jest.mock("@/components/shared/Topbar", () => ({
  Topbar: ({ children }: { children?: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

jest.mock("@/components/shared/Wrap", () => ({
  Wrap: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
}));

jest.mock("@/components/shared/TotalBox", () => ({
  TotalBox: ({ monto }: { monto: number }) => (
    <div data-testid="totalbox">{monto}</div>
  ),
  deudaCls: "text-red-600",
  pagadoCls: "text-emerald-600",
  moneyCls: "tabular-nums",
}));

jest.mock("@/components/shared/Totals", () => ({
  Totals: ({ cliente }: { cliente: { name: string } }) => (
    <div data-testid="totals">{cliente.name}</div>
  ),
}));

const CLIENTE = makeClient({ id: "cli-1" });

function renderClientApp(
  props: Partial<React.ComponentProps<typeof ClientApp>> = {},
) {
  return render(
    <ClientApp
      clientUid="cli-1"
      onLogout={jest.fn(async () => {})}
      {...props}
    />,
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  mockUseOwnClient.mockImplementation(() => undefined);
});

describe("ClientApp (vista del cliente, solo lectura)", () => {
  it("mientras no responde la suscripción muestra que está cargando", () => {
    renderClientApp();
    expect(screen.getByText("Cargando tu registro…")).toBeInTheDocument();
  });

  it("sin registro muestra que no fue encontrado", () => {
    mockUseOwnClient.mockReturnValue(null);
    renderClientApp();
    expect(
      screen.getByText("Tu registro no fue encontrado."),
    ).toBeInTheDocument();
  });

  it("muestra su estado de cuenta sin controles de edición", () => {
    mockUseOwnClient.mockReturnValue(CLIENTE);
    renderClientApp();

    expect(screen.getByText(/Hola, Ana/)).toBeInTheDocument();
    expect(screen.getByText("2 libras de arroz")).toBeInTheDocument();
    // Deuda 100 (fiado 120 − abono 20) llega al TotalBox.
    expect(screen.getByTestId("totalbox")).toHaveTextContent("100");
    // El cliente llega a Totals.
    expect(screen.getByTestId("totals")).toHaveTextContent("Ana");
    expect(screen.getByText("Mis abonos")).toBeInTheDocument();
    expect(screen.queryByText("Agregar fiado")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Añadir" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "quitar" }),
    ).not.toBeInTheDocument();
  });

  it("sin abonos no muestra la tarjeta de abonos", () => {
    mockUseOwnClient.mockReturnValue({
      ...CLIENTE,
      pagos: [],
    });
    renderClientApp();
    expect(screen.queryByText("Mis abonos")).not.toBeInTheDocument();
  });

  it("sin productos muestra que aún no tiene fiados", () => {
    mockUseOwnClient.mockReturnValue({
      ...CLIENTE,
      items: [],
      pagos: [],
    });
    renderClientApp();
    expect(screen.getByText("Sin productos registrados.")).toBeInTheDocument();
  });

  it("el botón Salir cierra la sesión", async () => {
    const user = userEvent.setup();
    const onLogout = jest.fn(async () => {});
    renderClientApp({ onLogout });

    await user.click(screen.getByRole("button", { name: "Salir" }));
    expect(onLogout).toHaveBeenCalledTimes(1);
  });
});
