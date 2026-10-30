import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { makeClient } from "../../fixtures.ts";
import ClientApp from "../../../src/features/client/ClientApp.tsx";

// Hijos mockeados: cada uno tiene sus propias pruebas. La suscripción
// al registro se controla por prueba (nunca responde, responde null o
// responde con el cliente).
const mockSubscribe = jest.fn(
  (_uid: string, _cb: (c: unknown) => void) => () => {},
);

jest.mock("@/storage", () => {
  const actual = jest.requireActual("@/storage");
  return {
    ...actual,
    subscribeOwnClient: (...args: unknown[]) =>
      (mockSubscribe as (...a: unknown[]) => unknown)(...args),
  };
});

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
  mockSubscribe.mockImplementation(() => () => {});
});

describe("ClientApp (vista del cliente, solo lectura)", () => {
  it("mientras no responde la suscripción muestra que está cargando", () => {
    renderClientApp();
    expect(screen.getByText("Cargando tu registro…")).toBeInTheDocument();
  });

  it("sin registro muestra que no fue encontrado", () => {
    mockSubscribe.mockImplementation((_uid, cb) => {
      (cb as (c: null) => void)(null);
      return () => {};
    });
    renderClientApp();
    expect(
      screen.getByText("Tu registro no fue encontrado."),
    ).toBeInTheDocument();
  });

  it("muestra su estado de cuenta sin controles de edición", () => {
    mockSubscribe.mockImplementation((_uid, cb) => {
      (cb as (c: typeof CLIENTE) => void)(CLIENTE);
      return () => {};
    });
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
    mockSubscribe.mockImplementation((_uid, cb) => {
      (cb as (c: typeof CLIENTE) => void)({
        ...CLIENTE,
        pagos: [],
      });
      return () => {};
    });
    renderClientApp();
    expect(screen.queryByText("Mis abonos")).not.toBeInTheDocument();
  });

  it("sin productos muestra que aún no tiene fiados", () => {
    mockSubscribe.mockImplementation((_uid, cb) => {
      (cb as (c: typeof CLIENTE) => void)({
        ...CLIENTE,
        items: [],
        pagos: [],
      });
      return () => {};
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
