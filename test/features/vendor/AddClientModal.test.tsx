import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AddClientModal } from "../../../src/features/vendor/AddClientModal.tsx";
import { makeClient } from "../../fixtures";

const BASE_PROPS: React.ComponentProps<typeof AddClientModal> = {
  onCreate: jest.fn(async () => ({
    ok: false as const,
    error: "error",
  })),
  onCancel: jest.fn(),
};

function renderModal(props: Partial<typeof BASE_PROPS> = {}) {
  return render(<AddClientModal {...BASE_PROPS} {...props} />);
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe("AddClientModal", () => {
  it("crear cliente válido llama a onCreate y muestra usuario + contraseña temporal", async () => {
    const user = userEvent.setup();
    const nuevo = makeClient({
      id: "nuevo-1",
      name: "Luis",
      lastName: "Pérez",
      telephone: "99998888",
    });
    const onCreate = jest.fn(async () => ({
      ok: true as const,
      client: nuevo,
      tempPassword: "Temp123XYZ",
    }));
    renderModal({ onCreate });

    await user.type(screen.getByPlaceholderText("Nombre *"), "Luis");
    await user.type(screen.getByPlaceholderText("Apellido"), "Pérez");
    await user.type(
      screen.getByPlaceholderText(/Teléfono \(será su usuario/),
      "99998888",
    );
    await user.click(screen.getByRole("button", { name: "Agregar" }));

    expect(onCreate).toHaveBeenCalledWith({
      name: "Luis",
      lastName: "Pérez",
      telephone: "99998888",
    });
    expect(
      await screen.findByText(/Cuenta creada para Luis Pérez/),
    ).toBeInTheDocument();
    expect(screen.getByText(/Temp123XYZ/)).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Enviar datos por WhatsApp" }),
    ).toBeInTheDocument();
    // Tras crear, el formulario queda limpio para otro alta.
    expect(
      screen.getByPlaceholderText("Nombre *") as HTMLInputElement,
    ).toHaveValue("");
  });

  it("un error al crear muestra el mensaje en el modal", async () => {
    const user = userEvent.setup();
    const onCreate = jest.fn(async () => ({
      ok: false as const,
      error: "Ese teléfono ya está registrado",
    }));
    renderModal({ onCreate });

    await user.type(screen.getByPlaceholderText("Nombre *"), "Luis");
    await user.type(
      screen.getByPlaceholderText(/Teléfono \(será su usuario/),
      "99998888",
    );
    await user.click(screen.getByRole("button", { name: "Agregar" }));

    expect(
      await screen.findByText("Ese teléfono ya está registrado"),
    ).toBeInTheDocument();
  });

  it("el botón Agregar está deshabilitado hasta que el teléfono tenga formato válido", async () => {
    const user = userEvent.setup();
    renderModal();

    const boton = screen.getByRole("button", { name: "Agregar" });
    const telefono = screen.getByPlaceholderText(
      /Teléfono \(será su usuario/,
    );
    expect(boton).toBeDisabled();

    await user.type(telefono, "123");
    expect(boton).toBeDisabled();

    await user.clear(telefono);
    await user.type(telefono, "8888**7777");
    expect(boton).toBeDisabled();

    await user.clear(telefono);
    await user.type(telefono, "8888 7777");
    expect(boton).toBeEnabled();
  });

  it("mientras crea muestra Creando… y siempre lo cierra", async () => {
    const user = userEvent.setup();
    const nuevo = makeClient({
      id: "nuevo-1",
      name: "Luis",
      lastName: "Pérez",
      telephone: "99998888",
    });
    let resolveCreate!: (result: {
      ok: true;
      client: typeof nuevo;
      tempPassword: string;
    }) => void;
    const pending = new Promise<{
      ok: true;
      client: typeof nuevo;
      tempPassword: string;
    }>((resolve) => {
      resolveCreate = resolve;
    });
    const onCreate = jest.fn(() => pending);
    renderModal({ onCreate });

    await user.type(screen.getByPlaceholderText("Nombre *"), "Luis");
    await user.type(
      screen.getByPlaceholderText(/Teléfono \(será su usuario/),
      "99998888",
    );
    await user.click(screen.getByRole("button", { name: "Agregar" }));

    expect(
      screen.getByRole("button", { name: "Creando…" }),
    ).toBeInTheDocument();

    await act(async () => {
      resolveCreate({
        ok: true,
        client: nuevo,
        tempPassword: "Temp123XYZ",
      });
    });

    expect(
      await screen.findByText(/Cuenta creada para Luis Pérez/),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Agregar" }),
    ).toBeInTheDocument();
  });

  it("el input del nombre recibe foco al abrir el modal", () => {
    renderModal();

    expect(screen.getByPlaceholderText("Nombre *")).toHaveFocus();
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
