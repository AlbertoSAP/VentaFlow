import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ClientList } from "../../../src/features/vendor/ClientList.tsx";
import { makeClient, makeClientSinRegistros } from "../../fixtures";

// Hijos mockeados: cada uno tiene sus propias pruebas.
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

jest.mock("@/components/shared/Errorhelper", () => ({
  ErrorMsg: ({ children }: { children?: React.ReactNode }) => (
    <p>{children}</p>
  ),
}));

const BASE_PROPS: React.ComponentProps<typeof ClientList> = {
  allClients: [],
  createClient: jest.fn(async () => ({ ok: false as const, error: "error" })),
  deleteClient: jest.fn(async () => null),
  busqueda: "",
  setBusqueda: jest.fn(),
  clientes: [],
  totalPorCobrar: 0,
  onAbrir: jest.fn(),
};

function renderList(props: Partial<typeof BASE_PROPS> = {}) {
  return render(<ClientList {...BASE_PROPS} {...props} />);
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe("ClientList", () => {
  it("la búsqueda avisa al padre y la lista muestra los clientes dados", async () => {
    const user = userEvent.setup();
    const setBusqueda = jest.fn();
    const onAbrir = jest.fn();
    renderList({
      allClients: [makeClient({ id: "a1" })],
      clientes: [makeClient({ id: "a1" })],
      setBusqueda,
      onAbrir,
    });

    // El input es controlado por el padre: cada tecla avisa por separado.
    await user.type(screen.getByPlaceholderText(/Buscar cliente/), "Lu");
    expect(setBusqueda).toHaveBeenCalledTimes(2);
    expect(setBusqueda).toHaveBeenNthCalledWith(1, "L");
    expect(setBusqueda).toHaveBeenNthCalledWith(2, "u");

    await user.click(screen.getByText("Ana López"));
    expect(onAbrir).toHaveBeenCalledWith("a1");
  });

  it("crear cliente llama al hook y muestra la contraseña temporal una vez", async () => {
    const user = userEvent.setup();
    const nuevo = makeClient({
      id: "nuevo-1",
      name: "Luis",
      lastName: "Pérez",
      telephone: "99998888",
    });
    const createClient = jest.fn(async () => ({
      ok: true as const,
      client: nuevo,
      tempPassword: "Temp123XYZ",
    }));
    renderList({ createClient });

    await user.type(screen.getByPlaceholderText("Nombre *"), "Luis");
    await user.type(screen.getByPlaceholderText("Apellido"), "Pérez");
    await user.type(
      screen.getByPlaceholderText(/Teléfono \(será su usuario/),
      "99998888",
    );
    await user.click(screen.getByRole("button", { name: "Agregar" }));

    expect(createClient).toHaveBeenCalledWith({
      name: "Luis",
      lastName: "Pérez",
      telephone: "99998888",
    });
    expect(
      await screen.findByText(/Cuenta creada para Luis Pérez/),
    ).toBeInTheDocument();
    expect(screen.getByText(/Temp123XYZ/)).toBeInTheDocument();
  });

  it("un error al crear muestra el mensaje en el formulario", async () => {
    const user = userEvent.setup();
    const createClient = jest.fn(async () => ({
      ok: false as const,
      error: "Ese teléfono ya está registrado",
    }));
    renderList({ createClient });

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

  it("eliminar cliente con registros muestra el modal de bloqueo y no borra", async () => {
    const user = userEvent.setup();
    const deleteClient = jest.fn(async () => null);
    renderList({
      allClients: [makeClient({ id: "a1" })],
      clientes: [makeClient({ id: "a1" })],
      deleteClient,
    });

    await user.click(screen.getByRole("button", { name: "eliminar" }));

    expect(screen.getByText("No se puede eliminar")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Entendido" }));
    expect(screen.queryByText("No se puede eliminar")).not.toBeInTheDocument();
    expect(deleteClient).not.toHaveBeenCalled();
  });

  it("eliminar cliente sin registros pide confirmación en el modal", async () => {
    const user = userEvent.setup();
    const deleteClient = jest.fn(async () => null);
    const sinReg = makeClientSinRegistros({ id: "s1" });
    renderList({
      allClients: [sinReg],
      clientes: [sinReg],
      deleteClient,
    });

    await user.click(screen.getByRole("button", { name: "eliminar" }));
    expect(screen.getByText("¿Eliminar a Ana López?")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Sí, eliminar" }));
    expect(deleteClient).toHaveBeenCalledWith("s1", "Ana López");
  });

  it("sin clientes, la lista explica cómo agregar el primero", () => {
    renderList();
    expect(
      screen.getByText(/Todavía no tienes clientes\. Agrega el primero/),
    ).toBeInTheDocument();
  });

  it("una búsqueda sin resultados lo dice claramente", () => {
    renderList({
      allClients: [makeClient({ id: "a1" })],
      clientes: [],
      busqueda: "zzz",
    });
    expect(
      screen.getByText(/Ningún cliente coincide con tu búsqueda/),
    ).toBeInTheDocument();
  });
});
