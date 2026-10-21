import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App, { ConfirmModal } from "../src/App.tsx";
import { useAuth } from "../src/hooks/useAuth.ts";
import { useClient } from "../src/hooks/useClient.tsx";
import { __fakeDb } from "./fakes/firebaseDatabase";
import { makeClient, makeClientSinRegistros } from "./fixtures";

jest.mock("../src/hooks/useAuth.ts", () => ({
  useAuth: jest.fn(),
  mapAuthError: () => "Error de prueba",
}));

jest.mock("../src/hooks/useClient.tsx", () => ({
  useClient: jest.fn(),
}));

const useAuthMock = useAuth as unknown as jest.Mock;
const useClientMock = useClient as unknown as jest.Mock;

function setAuth(partial: Record<string, unknown>) {
  useAuthMock.mockReturnValue({
    user: null,
    role: null,
    resolving: false,
    registerVendor: jest.fn(async () => {}),
    loginVendor: jest.fn(async () => {}),
    loginClient: jest.fn(async () => {}),
    logout: jest.fn(async () => {}),
    ...partial,
  });
}

function setClientsHook(partial: Record<string, unknown>) {
  useClientMock.mockReturnValue({
    clients: [],
    loading: false,
    createClient: jest.fn(async () => ({ ok: false, error: "error" })),
    deleteClient: jest.fn(async () => null),
    saveClient: jest.fn(async () => {}),
    ...partial,
  });
}

const VENDOR = { user: { uid: "vendor-1" }, role: "vendedor" };

beforeEach(() => {
  jest.clearAllMocks();
  __fakeDb.reset();
});

describe("puerta de acceso (App)", () => {
  it("muestra pantalla de carga mientras resuelve la sesión", () => {
    setAuth({ resolving: true });
    render(<App />);
    expect(screen.getByText("Conectando…")).toBeInTheDocument();
  });

  it("sin sesión muestra el login de vendedor y permite entrar", async () => {
    const user = userEvent.setup();
    const loginVendor = jest.fn(async () => {});
    setAuth({ loginVendor });
    render(<App />);

    await user.type(screen.getByPlaceholderText("Tu correo *"), "juan@x.com");
    await user.type(screen.getByPlaceholderText("Contraseña *"), "secreto");
    await user.click(screen.getByRole("button", { name: "Entrar" }));

    expect(loginVendor).toHaveBeenCalledWith("juan@x.com", "secreto");
  });

  it("el cliente entra con su teléfono", async () => {
    const user = userEvent.setup();
    const loginClient = jest.fn(async () => {});
    setAuth({ loginClient });
    render(<App />);

    await user.click(screen.getByRole("button", { name: "Soy cliente" }));
    await user.type(
      screen.getByPlaceholderText("Tu número de teléfono *"),
      "88887777",
    );
    await user.type(screen.getByPlaceholderText("Contraseña *"), "temporal");
    await user.click(screen.getByRole("button", { name: "Entrar" }));

    expect(loginClient).toHaveBeenCalledWith("88887777", "temporal");
  });

  it("el registro crea la cuenta de vendedor", async () => {
    const user = userEvent.setup();
    const registerVendor = jest.fn(async () => {});
    setAuth({ registerVendor });
    render(<App />);

    await user.click(
      screen.getByRole("button", { name: "Crear cuenta de vendedor" }),
    );
    await user.type(screen.getByPlaceholderText("Tu nombre *"), "Juan");
    await user.type(screen.getByPlaceholderText("Tu correo *"), "juan@x.com");
    await user.type(
      screen.getByPlaceholderText("Contraseña (mín. 6 caracteres) *"),
      "123456",
    );
    await user.click(screen.getByRole("button", { name: "Crear mi cuenta" }));

    expect(registerVendor).toHaveBeenCalledWith("Juan", "juan@x.com", "123456");
  });

  it("una cuenta sin registro asociado ve el aviso de cuenta huérfana", () => {
    setAuth({ user: { uid: "huerfano" }, role: null });
    render(<App />);
    expect(screen.getByText(/no tiene un registro activo/)).toBeInTheDocument();
  });
});

describe("vista del vendedor", () => {
  it("busca clientes por nombre en la lista", async () => {
    const user = userEvent.setup();
    setAuth(VENDOR);
    setClientsHook({
      clients: [
        makeClient({ id: "a1" }),
        makeClientSinRegistros({ id: "l1", name: "Luis", lastName: "Pérez" }),
      ],
    });
    render(<App />);

    await user.click(screen.getByRole("button", { name: /Clientes/ }));
    expect(screen.getByText("Ana López")).toBeInTheDocument();
    expect(screen.getByText("Luis Pérez")).toBeInTheDocument();

    await user.type(screen.getByPlaceholderText(/Buscar cliente/), "Luis");
    expect(screen.queryByText("Ana López")).not.toBeInTheDocument();
    expect(screen.getByText("Luis Pérez")).toBeInTheDocument();
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
      ok: true,
      client: nuevo,
      tempPassword: "Temp123XYZ",
    }));
    setAuth(VENDOR);
    setClientsHook({ clients: [], createClient });
    render(<App />);

    await user.click(screen.getByRole("button", { name: /Clientes/ }));
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

  it("eliminar cliente con registros muestra el modal de bloqueo y no borra", async () => {
    const user = userEvent.setup();
    const deleteClient = jest.fn(async () => null);
    setAuth(VENDOR);
    setClientsHook({ clients: [makeClient({ id: "a1" })], deleteClient });
    render(<App />);

    await user.click(screen.getByRole("button", { name: /Clientes/ }));
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
    setAuth(VENDOR);
    setClientsHook({ clients: [sinReg], deleteClient });
    render(<App />);

    await user.click(screen.getByRole("button", { name: /Clientes/ }));
    await user.click(screen.getByRole("button", { name: "eliminar" }));
    expect(screen.getByText("¿Eliminar a Ana López?")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Sí, eliminar" }));
    expect(deleteClient).toHaveBeenCalledWith("s1", "Ana López");
  });

  it("quitar un producto exige confirmación y solo guarda al confirmar", async () => {
    const user = userEvent.setup();
    const saveClient = jest.fn(async () => {});
    setAuth(VENDOR);
    setClientsHook({ clients: [makeClient({ id: "a1" })], saveClient });
    render(<App />);

    await user.click(screen.getByRole("button", { name: /Clientes/ }));
    await user.click(screen.getByText("Ana López"));
    await user.click(screen.getByRole("button", { name: "quitar" }));

    expect(screen.getByText("¿Quitar este producto?")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(saveClient).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "quitar" }));
    await user.click(screen.getByRole("button", { name: "Sí, quitar" }));
    expect(saveClient).toHaveBeenCalledTimes(1);
    const guardado = (saveClient.mock.calls[0] as any[])[0];
    expect(guardado.items).toHaveLength(0);
  });

  it("agregar un fiado guarda el producto en el registro del cliente", async () => {
    const user = userEvent.setup();
    const saveClient = jest.fn(async () => {});
    setAuth(VENDOR);
    setClientsHook({ clients: [makeClient({ id: "a1" })], saveClient });
    render(<App />);

    await user.click(screen.getByRole("button", { name: /Clientes/ }));
    await user.click(screen.getByText("Ana López"));
    await user.type(
      screen.getByPlaceholderText(/Descripción \(ej: 2 libras de arroz\)/),
      "Pan dulce",
    );
    await user.type(screen.getByPlaceholderText("Precio *"), "50");
    await user.click(screen.getByRole("button", { name: "Añadir" }));

    expect(saveClient).toHaveBeenCalledTimes(1);
    const guardado = (saveClient.mock.calls[0] as any[])[0];
    expect(guardado.items[0]).toMatchObject({
      descripcion: "Pan dulce",
      precio: 50,
    });
  });

  it("saldar todo confirma en el modal y registra el abono por la deuda", async () => {
    const user = userEvent.setup();
    const saveClient = jest.fn(async () => {});
    setAuth(VENDOR);
    setClientsHook({ clients: [makeClient({ id: "a1" })], saveClient });
    render(<App />);

    await user.click(screen.getByRole("button", { name: /Clientes/ }));
    await user.click(screen.getByText("Ana López"));
    await user.click(screen.getByRole("button", { name: "Saldar todo" }));

    expect(screen.getByText("¿Saldar toda la deuda?")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Sí, saldar" }));

    expect(saveClient).toHaveBeenCalledTimes(1);
    const guardado = (saveClient.mock.calls[0] as any[])[0];
    expect(guardado.pagos[0].monto).toBe(100); // deuda de la fixture
  });
});

describe("vista del cliente (solo lectura)", () => {
  it("muestra su estado de cuenta sin controles de edición", async () => {
    __fakeDb.setData({
      clientes: {
        "cli-1": {
          idAuthVendedor: "vendor-1",
          name: "Ana",
          lastName: "López",
          email: "88887777@ventaflow.app",
          telephone: "88887777",
          created: 1,
          items: [
            {
              id: "i1",
              descripcion: "Arroz",
              precio: 80,
              cantidad: 1,
              fecha: 1791845068683,
            },
          ],
          pagos: [{ id: "p1", monto: 30, fecha: 1791845068683 }],
        },
      },
    });
    setAuth({ user: { uid: "cli-1" }, role: "cliente" });
    render(<App />);

    expect(await screen.findByText(/Hola, Ana/)).toBeInTheDocument();
    expect(screen.getByText("Arroz")).toBeInTheDocument();
    expect(screen.getAllByText("C$ 50.00").length).toBeGreaterThan(0);
    expect(screen.queryByText("Agregar fiado")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Añadir" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "quitar" }),
    ).not.toBeInTheDocument();
  });
});

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
});
