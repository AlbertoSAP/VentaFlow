import { render, screen, fireEvent } from "@testing-library/react";
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
    estado: "aprobado",
    esAdmin: false,
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
  window.history.pushState({}, "", "/");
});

/** La puerta de acceso depende de la ruta: /vendedor o /cliente */
function irA(ruta: string) {
  window.history.pushState({}, "", ruta);
}

describe("puerta de acceso (App)", () => {
  it("muestra pantalla de carga mientras resuelve la sesión", () => {
    setAuth({ resolving: true });
    render(<App />);
    expect(screen.getByText("Conectando…")).toBeInTheDocument();
  });

  it("sin sesión, la ruta /vendedor muestra el login de vendedor y permite entrar", async () => {
    const user = userEvent.setup();
    const loginVendor = jest.fn(async () => {});
    setAuth({ loginVendor });
    irA("/vendedor");
    render(<App />);

    await user.type(screen.getByPlaceholderText("Tu correo *"), "juan@x.com");
    await user.type(screen.getByPlaceholderText("Contraseña *"), "secreto");
    await user.click(screen.getByRole("button", { name: "Entrar" }));

    expect(loginVendor).toHaveBeenCalledWith("juan@x.com", "secreto");
  });

  it("en la ruta de clientes, el cliente entra con su teléfono y NO ve nada de vendedores", async () => {
    const user = userEvent.setup();
    const loginClient = jest.fn(async () => {});
    setAuth({ loginClient });
    irA("/cliente");
    render(<App />);

    // Ni registro, ni login de vendedor, ni su formulario de correo:
    expect(
      screen.queryByRole("button", { name: "Crear cuenta de vendedor" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByPlaceholderText("Tu correo *"),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByPlaceholderText("Tu nombre *"),
    ).not.toBeInTheDocument();

    await user.type(
      screen.getByPlaceholderText("Tu número de teléfono *"),
      "88887777",
    );
    await user.type(screen.getByPlaceholderText("Contraseña *"), "temporal");
    await user.click(screen.getByRole("button", { name: "Entrar" }));

    expect(loginClient).toHaveBeenCalledWith("88887777", "temporal");
  });

  it("la raíz de la app también es la entrada de clientes", () => {
    setAuth({});
    render(<App />);
    expect(
      screen.getByPlaceholderText("Tu número de teléfono *"),
    ).toBeInTheDocument();
    expect(
      screen.queryByPlaceholderText("Tu correo *"),
    ).not.toBeInTheDocument();
  });

  it("el registro crea la cuenta de vendedor", async () => {
    const user = userEvent.setup();
    const registerVendor = jest.fn(async () => {});
    setAuth({ registerVendor });
    irA("/vendedor");
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

  it("si los abonos superan el fiado, el detalle muestra el saldo a favor", async () => {
    const user = userEvent.setup();
    setAuth(VENDOR);
    setClientsHook({
      clients: [
        makeClient({
          id: "a1",
          pagos: [{ id: "p1", monto: 200, fecha: 1791845068683 }],
        }),
      ],
    });
    render(<App />);

    await user.click(screen.getByRole("button", { name: /Clientes/ }));
    await user.click(screen.getByText("Ana López"));

    expect(screen.getByText("Saldo a favor:")).toBeInTheDocument();
    expect(screen.getByText("+ C$ 80.00")).toBeInTheDocument();
  });

  it("el modal de quitar advierte cuando quedará saldo a favor", async () => {
    const user = userEvent.setup();
    setAuth(VENDOR);
    setClientsHook({ clients: [makeClient({ id: "a1" })] });
    render(<App />);

    await user.click(screen.getByRole("button", { name: /Clientes/ }));
    await user.click(screen.getByText("Ana López"));
    await user.click(screen.getByRole("button", { name: "quitar" }));

    // fixture: fiado 120 (un producto), abonado 20 → al quitarlo
    // quedan C$ 20.00 abonados sin producto que los respalde
    expect(
      screen.getByText(/quedará un saldo a favor del cliente de C\$ 20\.00/),
    ).toBeInTheDocument();
  });

  it("un producto frecuente llena el formulario de fiado con un toque", async () => {
    const user = userEvent.setup();
    __fakeDb.setData({
      vendedores: {
        "vendor-1": {
          catalogo: { p1: { descripcion: "Arroz 1 lb", precio: 25 } },
        },
      },
    });
    setAuth(VENDOR);
    setClientsHook({ clients: [makeClient({ id: "a1" })] });
    render(<App />);

    await user.click(screen.getByRole("button", { name: /Clientes/ }));
    await user.click(screen.getByText("Ana López"));
    await user.click(
      screen.getByRole("button", { name: /Arroz 1 lb · C\$ 25\.00/ }),
    );

    expect(
      screen.getByPlaceholderText(/Descripción \(ej: 2 libras de arroz\)/),
    ).toHaveValue("Arroz 1 lb");
    expect(screen.getByPlaceholderText("Precio *")).toHaveValue(25);
  });

  it("el editor de frecuentes guarda el producto en el catálogo del vendedor", async () => {
    const user = userEvent.setup();
    setAuth(VENDOR);
    setClientsHook({ clients: [makeClient({ id: "a1" })] });
    render(<App />);

    await user.click(screen.getByRole("button", { name: /Clientes/ }));
    await user.click(screen.getByText("Ana López"));
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

    // El guardado se verifica en la base (el fake de onValue emite
    // una sola vez; en producción el chip aparece al instante).
    const data = __fakeDb.getData() as any;
    const entries = Object.values(
      data.vendedores["vendor-1"].catalogo ?? {},
    );
    expect(entries).toEqual([
      { descripcion: "Aceite 1 lt", precio: 120 },
    ]);
    expect(
      await screen.findByText(/agregado a tus productos frecuentes/),
    ).toBeInTheDocument();
  });

  it("el detalle ofrece enviar el estado de cuenta por WhatsApp", async () => {
    const user = userEvent.setup();
    setAuth(VENDOR);
    setClientsHook({ clients: [makeClient({ id: "a1" })] });
    render(<App />);

    await user.click(screen.getByRole("button", { name: /Clientes/ }));
    await user.click(screen.getByText("Ana López"));

    const link = screen.getByRole("link", {
      name: /Enviar estado por WhatsApp/,
    });
    const href = link.getAttribute("href") ?? "";
    expect(href.startsWith("https://wa.me/50588887777?text=")).toBe(true);
    expect(decodeURIComponent(href)).toContain("Deuda actual: C$ 100.00");
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

describe("aprobación de vendedores", () => {
  it("un vendedor pendiente solo ve la pantalla de espera", () => {
    setAuth({ ...VENDOR, estado: "pendiente" });
    setClientsHook({ clients: [] });
    render(<App />);

    expect(screen.getByText(/Por favor espere/)).toBeInTheDocument();
    expect(
      screen.getByText(/su cuenta será validada/),
    ).toBeInTheDocument();
    // Nada de la app: ni navegación ni paneles
    expect(
      screen.queryByRole("button", { name: /Clientes/ }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /Dashboard/ }),
    ).not.toBeInTheDocument();
  });

  it("un vendedor rechazado ve el aviso de no aprobado", () => {
    setAuth({ ...VENDOR, estado: "rechazado" });
    setClientsHook({ clients: [] });
    render(<App />);
    expect(
      screen.getByText("Tu cuenta no fue aprobada"),
    ).toBeInTheDocument();
  });

  it("el admin entra aunque esté pendiente y aprueba solicitudes desde el panel", async () => {
    const user = userEvent.setup();
    __fakeDb.setData({
      vendedores: {
        "vendor-1": { name: "Admin", email: "admin@x.com", created: 1 },
        v2: { name: "Nuevo Vendedor", email: "nuevo@x.com", created: 2 },
      },
      aprobaciones: { "vendor-1": { estado: "aprobado" } },
    });
    setAuth({ ...VENDOR, estado: "pendiente", esAdmin: true });
    setClientsHook({ clients: [] });
    render(<App />);

    await user.click(
      screen.getByRole("button", { name: /Solicitudes \(1\)/ }),
    );
    expect(screen.getByText("Nuevo Vendedor")).toBeInTheDocument();
    expect(screen.getByText(/nuevo@x\.com/)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Aprobar" }));
    const data = __fakeDb.getData() as any;
    expect(data.aprobaciones.v2.estado).toBe("aprobado");
  });

  it("sin ser admin no aparece la pestaña Solicitudes", () => {
    setAuth({ ...VENDOR, estado: "aprobado", esAdmin: false });
    setClientsHook({ clients: [] });
    render(<App />);
    expect(
      screen.queryByRole("button", { name: /Solicitudes/ }),
    ).not.toBeInTheDocument();
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
          email: "flowventas13+88887777@gmail.com",
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

  it("la vista del cliente también muestra su saldo a favor", async () => {
    __fakeDb.setData({
      clientes: {
        "cli-2": {
          idAuthVendedor: "vendor-1",
          name: "Luis",
          lastName: "Pérez",
          email: "flowventas13+99998888@gmail.com",
          telephone: "99998888",
          created: 1,
          items: [
            {
              id: "i1",
              descripcion: "Arroz",
              precio: 50,
              cantidad: 1,
              fecha: 1791845068683,
            },
          ],
          pagos: [{ id: "p1", monto: 80, fecha: 1791845068683 }],
        },
      },
    });
    setAuth({ user: { uid: "cli-2" }, role: "cliente" });
    render(<App />);

    expect(await screen.findByText(/Hola, Luis/)).toBeInTheDocument();
    expect(screen.getByText("Saldo a favor:")).toBeInTheDocument();
    expect(screen.getByText("+ C$ 30.00")).toBeInTheDocument();
  });
});

describe("usabilidad", () => {
  it("el botón Mostrar contraseña revela y oculta la clave", async () => {
    const user = userEvent.setup();
    setAuth({});
    render(<App />);

    const input = screen.getByPlaceholderText(
      "Contraseña *",
    ) as HTMLInputElement;
    expect(input.type).toBe("password");
    await user.click(
      screen.getByRole("button", { name: "Mostrar contraseña" }),
    );
    expect(input.type).toBe("text");
    await user.click(screen.getByRole("button", { name: "Ocultar contraseña" }));
    expect(input.type).toBe("password");
  });

  it("la pantalla de acceso del vendedor explica para qué sirve la app", () => {
    setAuth({});
    irA("/vendedor");
    render(<App />);
    expect(screen.getByText(/Lleva tus fiados sin papel/)).toBeInTheDocument();
  });

  it("sin clientes, la lista explica cómo agregar el primero", async () => {
    const user = userEvent.setup();
    setAuth(VENDOR);
    setClientsHook({ clients: [] });
    render(<App />);

    await user.click(screen.getByRole("button", { name: /Clientes/ }));
    expect(
      screen.getByText(/Todavía no tienes clientes\. Agrega el primero/),
    ).toBeInTheDocument();
  });

  it("una búsqueda sin resultados lo dice claramente", async () => {
    const user = userEvent.setup();
    setAuth(VENDOR);
    setClientsHook({ clients: [makeClient({ id: "a1" })] });
    render(<App />);

    await user.click(screen.getByRole("button", { name: /Clientes/ }));
    await user.type(screen.getByPlaceholderText(/Buscar cliente/), "zzz");
    expect(
      screen.getByText(/Ningún cliente coincide con tu búsqueda/),
    ).toBeInTheDocument();
  });

  it("agregar un fiado muestra el aviso de guardado", async () => {
    const user = userEvent.setup();
    setAuth(VENDOR);
    setClientsHook({ clients: [makeClient({ id: "a1" })] });
    render(<App />);

    await user.click(screen.getByRole("button", { name: /Clientes/ }));
    await user.click(screen.getByText("Ana López"));
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

  it("los chips de montos rápidos llenan el abono y lo registran", async () => {
    const user = userEvent.setup();
    const saveClient = jest.fn(async () => {});
    setAuth(VENDOR);
    setClientsHook({ clients: [makeClient({ id: "a1" })], saveClient });
    render(<App />);

    await user.click(screen.getByRole("button", { name: /Clientes/ }));
    await user.click(screen.getByText("Ana López"));
    await user.click(screen.getByRole("button", { name: "C$ 100" }));

    const monto = screen.getByPlaceholderText(
      "Monto del abono",
    ) as HTMLInputElement;
    expect(monto.value).toBe("100");

    await user.click(screen.getByRole("button", { name: "Abonar" }));
    expect(saveClient).toHaveBeenCalledTimes(1);
    const guardado = (saveClient.mock.calls[0] as any[])[0];
    expect(guardado.pagos[0].monto).toBe(100);
    expect(
      await screen.findByText(/Abono de C\$ 100\.00 registrado/),
    ).toBeInTheDocument();
  });

  it("Escape cierra el modal de confirmación sin ejecutar la acción", async () => {
    const user = userEvent.setup();
    const saveClient = jest.fn(async () => {});
    setAuth(VENDOR);
    setClientsHook({ clients: [makeClient({ id: "a1" })], saveClient });
    render(<App />);

    await user.click(screen.getByRole("button", { name: /Clientes/ }));
    await user.click(screen.getByText("Ana López"));
    await user.click(screen.getByRole("button", { name: "quitar" }));
    expect(screen.getByText("¿Quitar este producto?")).toBeInTheDocument();

    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.queryByText("¿Quitar este producto?")).not.toBeInTheDocument();
    expect(saveClient).not.toHaveBeenCalled();
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
