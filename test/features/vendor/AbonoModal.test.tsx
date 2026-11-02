import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AbonoModal } from "../../../src/features/vendor/AbonoModal.tsx";

const BASE_PROPS = {
  deuda: 100,
  onConfirm: jest.fn(),
  onSaldar: jest.fn(),
  onCancel: jest.fn(),
};

function renderModal(props: Partial<typeof BASE_PROPS> = {}) {
  return render(<AbonoModal {...BASE_PROPS} {...props} />);
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe("AbonoModal", () => {
  it("Abonar empieza deshabilitado y se habilita con un monto válido", async () => {
    const user = userEvent.setup();
    const onConfirm = jest.fn();
    renderModal({ onConfirm });

    const boton = screen.getByRole("button", { name: "Abonar" });
    const monto = screen.getByPlaceholderText("Monto del abono");
    expect(boton).toBeDisabled();

    await user.type(monto, "0");
    expect(boton).toBeDisabled();

    await user.clear(monto);
    await user.type(monto, "50");
    expect(boton).toBeEnabled();

    await user.click(boton);
    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onConfirm).toHaveBeenCalledWith(50);
  });

  it("Enter con un monto válido confirma el abono", async () => {
    const user = userEvent.setup();
    const onConfirm = jest.fn();
    renderModal({ onConfirm });

    await user.type(screen.getByPlaceholderText("Monto del abono"), "75{Enter}");

    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onConfirm).toHaveBeenCalledWith(75);
  });

  it("los chips de montos rápidos llenan el abono y lo registran", async () => {
    const user = userEvent.setup();
    const onConfirm = jest.fn();
    renderModal({ onConfirm });

    await user.click(screen.getByRole("button", { name: "C$ 100" }));

    const monto = screen.getByPlaceholderText(
      "Monto del abono",
    ) as HTMLInputElement;
    expect(monto.value).toBe("100");

    await user.click(screen.getByRole("button", { name: "Abonar" }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onConfirm).toHaveBeenCalledWith(100);
  });

  it("el input del monto recibe foco al abrir el modal", () => {
    renderModal();

    expect(screen.getByPlaceholderText("Monto del abono")).toHaveFocus();
  });

  it("Saldar todo pide saldar sin registrar un abono", async () => {
    const user = userEvent.setup();
    const onConfirm = jest.fn();
    const onSaldar = jest.fn();
    renderModal({ onConfirm, onSaldar });

    await user.click(screen.getByRole("button", { name: "Saldar todo" }));

    expect(onSaldar).toHaveBeenCalledTimes(1);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it("Saldar todo queda deshabilitado sin deuda", () => {
    renderModal({ deuda: 0 });

    expect(
      screen.getByRole("button", { name: "Saldar todo" }),
    ).toBeDisabled();
  });

  it("Cancelar cierra el modal", async () => {
    const user = userEvent.setup();
    const onCancel = jest.fn();
    renderModal({ onCancel });

    await user.click(screen.getByRole("button", { name: "Cancelar" }));

    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it("Escape cierra el modal", () => {
    const onCancel = jest.fn();
    renderModal({ onCancel });

    fireEvent.keyDown(document, { key: "Escape" });

    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it("clic fuera del modal lo cierra", async () => {
    const user = userEvent.setup();
    const onCancel = jest.fn();
    renderModal({ onCancel });

    const overlay = document.querySelector(
      '[data-slot="dialog-overlay"]',
    ) as HTMLElement;
    await user.click(overlay);

    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it("la X del diálogo cierra el modal", async () => {
    const user = userEvent.setup();
    const onCancel = jest.fn();
    renderModal({ onCancel });

    await user.click(screen.getByRole("button", { name: "Cerrar" }));

    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});
