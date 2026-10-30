import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ClientDetails } from "../../../src/features/vendor/ClientDetails.tsx";
import { makeClient, makeClientSinRegistros } from "../../fixtures";

// Hijos mockeados: cada uno tiene sus propias pruebas. TotalBox y
// Totals se mockean (su render real se prueba en shared.test); el
// resto del detalle (formularios, modales, enlaces) es propio.
jest.mock("@/components/shared/ConfirmModal", () => ({
  ConfirmModal: ({
    title,
    message,
    confirmLabel,
    cancelLabel = "Cancelar",
    onConfirm,
    onCancel,
  }: {
    title: string;
    message: string;
    confirmLabel: string;
    cancelLabel?: string | null;
    onConfirm: () => void;
    onCancel: () => void;
  }) => (
    <div role="dialog">
      <h3>{title}</h3>
      <p>{message}</p>
      {cancelLabel !== null && (
        <button onClick={onCancel}>{cancelLabel}</button>
      )}
      <button onClick={onConfirm}>{confirmLabel}</button>
    </div>
  ),
}));

jest.mock("@/components/shared/Wrap", () => ({
  Wrap: ({ children }: { children?: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

jest.mock("@/components/shared/SuccessNotice", () => ({
  SuccessNotice: ({ children }: { children?: React.ReactNode }) => (
    <div>{children}</div>
  ),
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
  Totals: () => <div data-testid="totals" />,
}));

const BASE_PROPS = {
  onSave: jest.fn(async () => {}),
  cliente: makeClient({ id: "a1" }),
  onVolver: jest.fn(),
  catalogo: [] as { id: string; descripcion: string; precio: number }[],
  onAddFrecuente: jest.fn(async () => {}),
  onDeleteFrecuente: jest.fn(async () => {}),
};

function renderDetails(props: Partial<typeof BASE_PROPS> = {}) {
  return render(<ClientDetails {...BASE_PROPS} {...props} />);
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe("ClientDetails", () => {
  it("agregar un fiado guarda el producto en el registro del cliente", async () => {
    const user = userEvent.setup();
    const onSave = jest.fn(async () => {});
    renderDetails({ onSave });

    await user.type(
      screen.getByPlaceholderText(/Descripción \(ej: 2 libras de arroz\)/),
      "Pan dulce",
    );
    await user.type(screen.getByPlaceholderText("Precio *"), "50");
    await user.click(screen.getByRole("button", { name: "Añadir" }));

    expect(onSave).toHaveBeenCalledTimes(1);
    const guardado = (onSave.mock.calls[0] as any[])[0];
    expect(guardado.items[0]).toMatchObject({
      descripcion: "Pan dulce",
      precio: 50,
    });
  });

  it("quitar un producto exige confirmación y solo guarda al confirmar", async () => {
    const user = userEvent.setup();
    const onSave = jest.fn(async () => {});
    renderDetails({ onSave });

    await user.click(screen.getByRole("button", { name: "quitar" }));
    expect(screen.getByText("¿Quitar este producto?")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(onSave).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "quitar" }));
    await user.click(screen.getByRole("button", { name: "Sí, quitar" }));
    expect(onSave).toHaveBeenCalledTimes(1);
    const guardado = (onSave.mock.calls[0] as any[])[0];
    expect(guardado.items).toHaveLength(0);
  });

  it("el modal de quitar advierte cuando quedará saldo a favor", async () => {
    const user = userEvent.setup();
    renderDetails();

    await user.click(screen.getByRole("button", { name: "quitar" }));

    // fixture: fiado 120 (un producto), abonado 20 → al quitarlo
    // quedan C$ 20.00 abonados sin producto que los respalde
    expect(
      screen.getByText(/quedará un saldo a favor del cliente de C\$ 20\.00/),
    ).toBeInTheDocument();
  });

  it("Abonar está deshabilitado hasta que escriban el monto", async () => {
    const user = userEvent.setup();
    const onSave = jest.fn(async () => {});
    renderDetails({ onSave });

    const boton = screen.getByRole("button", { name: "Abonar" });
    const monto = screen.getByPlaceholderText("Monto del abono");
    expect(boton).toBeDisabled();

    await user.type(monto, "0");
    expect(boton).toBeDisabled();

    await user.clear(monto);
    await user.type(monto, "50");
    expect(boton).toBeEnabled();

    await user.click(boton);
    expect(onSave).toHaveBeenCalledTimes(1);
  });

  it("los chips de montos rápidos llenan el abono y lo registran", async () => {
    const user = userEvent.setup();
    const onSave = jest.fn(async () => {});
    renderDetails({ onSave });

    await user.click(screen.getByRole("button", { name: "C$ 100" }));

    const monto = screen.getByPlaceholderText(
      "Monto del abono",
    ) as HTMLInputElement;
    expect(monto.value).toBe("100");

    await user.click(screen.getByRole("button", { name: "Abonar" }));
    expect(onSave).toHaveBeenCalledTimes(1);
    const guardado = (onSave.mock.calls[0] as any[])[0];
    expect(guardado.pagos[0].monto).toBe(100);
    expect(
      await screen.findByText(/Abono de C\$ 100\.00 registrado/),
    ).toBeInTheDocument();
  });

  it("saldar todo confirma en el modal y registra el abono por la deuda", async () => {
    const user = userEvent.setup();
    const onSave = jest.fn(async () => {});
    renderDetails({ onSave });

    await user.click(screen.getByRole("button", { name: "Saldar todo" }));
    expect(screen.getByText("¿Saldar toda la deuda?")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Sí, saldar" }));

    expect(onSave).toHaveBeenCalledTimes(1);
    const guardado = (onSave.mock.calls[0] as any[])[0];
    expect(guardado.pagos[0].monto).toBe(100); // deuda de la fixture
  });

  it("un producto frecuente llena el formulario de fiado con un toque", async () => {
    const user = userEvent.setup();
    renderDetails({
      catalogo: [{ id: "p1", descripcion: "Arroz 1 lb", precio: 25 }],
    });

    await user.click(
      screen.getByRole("button", { name: /Arroz 1 lb · C\$ 25\.00/ }),
    );

    expect(
      screen.getByPlaceholderText(/Descripción \(ej: 2 libras de arroz\)/),
    ).toHaveValue("Arroz 1 lb");
    expect(screen.getByPlaceholderText("Precio *")).toHaveValue(25);
  });

  it("el editor de frecuentes guarda y quita productos", async () => {
    const user = userEvent.setup();
    const onAddFrecuente = jest.fn(async () => {});
    const onDeleteFrecuente = jest.fn(async () => {});
    renderDetails({
      cliente: makeClientSinRegistros({ id: "a1" }),
      catalogo: [{ id: "p1", descripcion: "Arroz 1 lb", precio: 25 }],
      onAddFrecuente,
      onDeleteFrecuente,
    });

    await user.click(
      screen.getByRole("button", { name: "Editar productos frecuentes" }),
    );
    await user.type(
      screen.getByPlaceholderText(/Producto frecuente/),
      "Aceite 1 lt",
    );
    await user.type(screen.getByPlaceholderText("Precio"), "120");
    await user.click(
      screen.getByRole("button", { name: "Agregar frecuente" }),
    );
    expect(onAddFrecuente).toHaveBeenCalledWith("Aceite 1 lt", 120);
    expect(
      await screen.findByText(/agregado a tus productos frecuentes/),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "quitar" }));
    expect(
      screen.getByText("¿Quitar este producto frecuente?"),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Sí, quitar" }));
    expect(onDeleteFrecuente).toHaveBeenCalledWith("p1");
  });

  it("ofrece enviar el estado de cuenta por WhatsApp", () => {
    renderDetails();

    const link = screen.getByRole("link", {
      name: /Enviar estado por WhatsApp/,
    });
    const href = link.getAttribute("href") ?? "";
    expect(href.startsWith("https://wa.me/50588887777?text=")).toBe(true);
    expect(decodeURIComponent(href)).toContain("Deuda actual: C$ 100.00");
  });

  it("sin cliente muestra que no fue encontrado", () => {
    renderDetails({ cliente: undefined });
    expect(screen.getByText("Cliente no encontrado.")).toBeInTheDocument();
  });

  it("agregar un fiado muestra el aviso de guardado", async () => {
    const user = userEvent.setup();
    renderDetails();

    await user.type(
      screen.getByPlaceholderText(/Descripción \(ej: 2 libras de arroz\)/),
      "Pan dulce",
    );
    await user.type(screen.getByPlaceholderText("Precio *"), "50");
    await user.click(screen.getByRole("button", { name: "Añadir" }));

    expect(
      await screen.findByText(/Fiado agregado a la cuenta de Ana López/),
    ).toBeInTheDocument();
  });
});
