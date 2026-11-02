import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PaymentModal } from "../../../src/features/vendor/PaymentModal.tsx";

const BASE_PROPS = {
  debt: 100,
  onConfirm: jest.fn(),
  onSettleAll: jest.fn(),
  onCancel: jest.fn(),
};

function renderPaymentModal(props: Partial<typeof BASE_PROPS> = {}) {
  return render(<PaymentModal {...BASE_PROPS} {...props} />);
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe("PaymentModal", () => {
  it("Abonar empieza deshabilitado y se habilita con un monto válido", async () => {
    const user = userEvent.setup();
    const onConfirm = jest.fn();
    renderPaymentModal({ onConfirm });

    const button = screen.getByRole("button", { name: "Abonar" });
    const amount = screen.getByPlaceholderText("Monto del abono");
    expect(button).toBeDisabled();

    await user.type(amount, "0");
    expect(button).toBeDisabled();

    await user.clear(amount);
    await user.type(amount, "50");
    expect(button).toBeEnabled();

    await user.click(button);
    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onConfirm).toHaveBeenCalledWith(50);
  });

  it("Enter con un monto válido confirma el abono", async () => {
    const user = userEvent.setup();
    const onConfirm = jest.fn();
    renderPaymentModal({ onConfirm });

    await user.type(screen.getByPlaceholderText("Monto del abono"), "75{Enter}");

    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onConfirm).toHaveBeenCalledWith(75);
  });

  it("los chips de montos rápidos llenan el abono y lo registran", async () => {
    const user = userEvent.setup();
    const onConfirm = jest.fn();
    renderPaymentModal({ onConfirm });

    await user.click(screen.getByRole("button", { name: "C$ 100" }));

    const amount = screen.getByPlaceholderText(
      "Monto del abono",
    ) as HTMLInputElement;
    expect(amount.value).toBe("100");

    await user.click(screen.getByRole("button", { name: "Abonar" }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onConfirm).toHaveBeenCalledWith(100);
  });

  it("el input del monto recibe foco al abrir el modal", () => {
    renderPaymentModal();

    expect(screen.getByPlaceholderText("Monto del abono")).toHaveFocus();
  });

  it("Saldar todo pide saldar sin registrar un abono", async () => {
    const user = userEvent.setup();
    const onConfirm = jest.fn();
    const onSettleAll = jest.fn();
    renderPaymentModal({ onConfirm, onSettleAll });

    await user.click(screen.getByRole("button", { name: "Saldar todo" }));

    expect(onSettleAll).toHaveBeenCalledTimes(1);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it("Saldar todo queda deshabilitado sin deuda", () => {
    renderPaymentModal({ debt: 0 });

    expect(
      screen.getByRole("button", { name: "Saldar todo" }),
    ).toBeDisabled();
  });

  it("Cancelar cierra el modal", async () => {
    const user = userEvent.setup();
    const onCancel = jest.fn();
    renderPaymentModal({ onCancel });

    await user.click(screen.getByRole("button", { name: "Cancelar" }));

    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it("Escape cierra el modal", () => {
    const onCancel = jest.fn();
    renderPaymentModal({ onCancel });

    fireEvent.keyDown(document, { key: "Escape" });

    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it("clic fuera del modal lo cierra", async () => {
    const user = userEvent.setup();
    const onCancel = jest.fn();
    renderPaymentModal({ onCancel });

    const overlay = document.querySelector(
      '[data-slot="dialog-overlay"]',
    ) as HTMLElement;
    await user.click(overlay);

    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it("la X del diálogo cierra el modal", async () => {
    const user = userEvent.setup();
    const onCancel = jest.fn();
    renderPaymentModal({ onCancel });

    await user.click(screen.getByRole("button", { name: "Cerrar" }));

    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});
