import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ConfirmModal } from "../../../src/components/shared/ConfirmModal.tsx";

describe("ConfirmModal", () => {
  it("confirma y cancela con sus botones", async () => {
    const user = userEvent.setup();
    const onConfirm = jest.fn();
    const onCancel = jest.fn();
    render(
      <ConfirmModal
        title="¿Seguro?"
        message="Mensaje de prueba"
        confirmLabel="Sí, hacer"
        onConfirm={onConfirm}
        onCancel={onCancel}
      />,
    );
    await user.click(screen.getByRole("button", { name: "Sí, hacer" }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
    await user.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it("con cancelLabel null no muestra el botón Cancelar (modal de aviso)", () => {
    render(
      <ConfirmModal
        title="Aviso"
        message="Solo lectura"
        confirmLabel="Entendido"
        cancelLabel={null}
        onConfirm={() => {}}
        onCancel={() => {}}
      />,
    );
    expect(
      screen.queryByRole("button", { name: "Cancelar" }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Entendido" })).toBeInTheDocument();
  });

  it("Escape cancela sin ejecutar la acción", () => {
    const onConfirm = jest.fn();
    const onCancel = jest.fn();
    render(
      <ConfirmModal
        title="¿Seguro?"
        message="Mensaje de prueba"
        confirmLabel="Sí, hacer"
        onConfirm={onConfirm}
        onCancel={onCancel}
      />,
    );
    fireEvent.keyDown(window, { key: "Escape" });
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it("Escape en un modal de aviso ejecuta la confirmación", () => {
    const onConfirm = jest.fn();
    const onCancel = jest.fn();
    render(
      <ConfirmModal
        title="Aviso"
        message="Solo lectura"
        confirmLabel="Entendido"
        cancelLabel={null}
        onConfirm={onConfirm}
        onCancel={onCancel}
      />,
    );
    fireEvent.keyDown(window, { key: "Escape" });
    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onCancel).not.toHaveBeenCalled();
  });

  it("otra tecla no cierra el modal", () => {
    const onCancel = jest.fn();
    render(
      <ConfirmModal
        title="¿Seguro?"
        message="Mensaje de prueba"
        confirmLabel="Sí, hacer"
        onConfirm={() => {}}
        onCancel={onCancel}
      />,
    );
    fireEvent.keyDown(window, { key: "Enter" });
    expect(onCancel).not.toHaveBeenCalled();
  });
});
