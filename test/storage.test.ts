import {
  fmtMoney,
  fmtFecha,
  generateEmailAlias,
  generateTempPassword,
  subscribeEstadoVendedor,
  getEsAdmin,
  setEstadoVendedor,
  subscribeVendedoresAdmin,
  whatsAppPhone,
  whatsAppUrl,
  mensajeEstadoCuenta,
  mensajeDatosAcceso,
  ultimosMovimientos,
  fullName,
  totalItems,
  totalPagos,
  deuda,
  saldoAFavor,
  getUserRole,
  writeClient,
  deleteClientRecord,
  subscribeVendorClients,
  subscribeOwnClient,
  type Client,
} from "../src/storage.ts";
import { __fakeDb } from "./fakes/firebaseDatabase";
import { makeClient } from "./fixtures";

beforeEach(() => {
  __fakeDb.reset();
});

describe("utilidades de formato", () => {
  it("fmtMoney formatea córdobas con 2 decimales", () => {
    expect(fmtMoney(100)).toBe("C$ 100.00");
    expect(fmtMoney(0)).toBe("C$ 0.00");
    expect(fmtMoney(99.9)).toBe("C$ 99.90");
  });

  it("fmtFecha devuelve fecha dd/mm/yyyy", () => {
    expect(fmtFecha(1791845068683)).toMatch(/^\d{2}\/\d{2}\/2026$/);
  });

  it("generateEmailAlias genera el alias del buzón único desde el teléfono", () => {
    expect(generateEmailAlias("8888 7777")).toBe(
      "flowventas13+88887777@gmail.com",
    );
    // con o sin código de país, el alias es el mismo
    expect(generateEmailAlias("+505 8888-7777")).toBe(
      "flowventas13+88887777@gmail.com",
    );
    expect(generateEmailAlias("50588887777")).toBe(
      "flowventas13+88887777@gmail.com",
    );
  });

  it("el estado de aprobación por defecto es pendiente y cambia con setEstadoVendedor", async () => {
    const vistos: string[] = [];
    const off = subscribeEstadoVendedor("vendor-9", (e) => vistos.push(e));
    expect(vistos).toEqual(["pendiente"]);
    off();
    await setEstadoVendedor("vendor-9", "aprobado");
    const data = __fakeDb.getData() as any;
    expect(data.aprobaciones["vendor-9"].estado).toBe("aprobado");
  });

  it("getEsAdmin solo es true si el nodo admins lo marca", async () => {
    __fakeDb.setData({ admins: { root1: true } });
    await expect(getEsAdmin("root1")).resolves.toBe(true);
    await expect(getEsAdmin("vendor-9")).resolves.toBe(false);
  });

  it("subscribeVendedoresAdmin combina perfiles con su estado", () => {
    __fakeDb.setData({
      vendedores: {
        v1: { name: "Uno", email: "uno@x.com", created: 100 },
        v2: { name: "Dos", email: "dos@x.com", created: 200 },
      },
      aprobaciones: { v1: { estado: "aprobado" } },
    });
    let lista: any[] = [];
    const off = subscribeVendedoresAdmin((l) => (lista = l));
    off();
    expect(lista.map((v) => v.id)).toEqual(["v2", "v1"]); // más reciente primero
    expect(lista.find((v) => v.id === "v1").estado).toBe("aprobado");
    expect(lista.find((v) => v.id === "v2").estado).toBe("pendiente");
  });

  it("whatsAppPhone normaliza al formato internacional de Nicaragua", () => {
    expect(whatsAppPhone("8888 7777")).toBe("50588887777");
    expect(whatsAppPhone("+505 8888-7777")).toBe("50588887777");
    expect(whatsAppPhone("50588887777")).toBe("50588887777");
  });

  it("whatsAppUrl arma el enlace wa.me con el mensaje codificado", () => {
    const url = whatsAppUrl("88887777", "Hola Ana: debes C$ 100.00");
    expect(url.startsWith("https://wa.me/50588887777?text=")).toBe(true);
    expect(url).toContain(encodeURIComponent("Hola Ana: debes C$ 100.00"));
  });

  it("mensajeEstadoCuenta resume totales, deuda y últimos movimientos", () => {
    const msg = mensajeEstadoCuenta(makeClient());
    expect(msg).toContain("Hola Ana, te comparto tu estado de cuenta");
    expect(msg).toContain("Total fiado: C$ 120.00");
    expect(msg).toContain("Total abonado: C$ 20.00");
    expect(msg).toContain("Deuda actual: C$ 100.00");
    expect(msg).toContain("2 libras de arroz");
    expect(msg).toContain("Abono: C$ 20.00");
    expect(msg).not.toContain("Saldo a favor");
  });

  it("mensajeEstadoCuenta incluye el saldo a favor cuando existe", () => {
    const msg = mensajeEstadoCuenta(
      makeClient({
        items: [
          { id: "i1", descripcion: "Arroz", precio: 100, cantidad: 1, fecha: 1 },
        ],
        pagos: [{ id: "p1", monto: 150, fecha: 2 }],
      }),
    );
    expect(msg).toContain("Saldo a favor: C$ 50.00");
    expect(msg).toContain("Deuda actual: C$ 0.00");
  });

  it("mensajeDatosAcceso incluye usuario y contraseña temporal", () => {
    const msg = mensajeDatosAcceso("Luis Pérez", "99998888", "Temp123XYZ");
    expect(msg).toContain("Hola Luis Pérez");
    expect(msg).toContain("99998888");
    expect(msg).toContain("Temp123XYZ");
  });

  it("ultimosMovimientos mezcla fiados y abonos del más reciente al más antiguo", () => {
    const movs = ultimosMovimientos(
      makeClient({
        items: [
          { id: "i1", descripcion: "Arroz", precio: 100, cantidad: 1, fecha: 100 },
          { id: "i2", descripcion: "Aceite", precio: 80, cantidad: 1, fecha: 300 },
        ],
        pagos: [{ id: "p1", monto: 50, fecha: 200 }],
      }),
    );
    expect(movs.map((m) => m.tipo)).toEqual(["fiado", "pago", "fiado"]);
    expect(movs[0].desc).toBe("Aceite");
  });

  it("generateTempPassword genera claves de 10 caracteres seguras", () => {
    const a = generateTempPassword();
    const b = generateTempPassword();
    expect(a).toMatch(/^[A-Za-z0-9]{10}$/);
    expect(b).toMatch(/^[A-Za-z0-9]{10}$/);
    expect(a).not.toBe(b);
  });

  it("fullName une nombre y apellido sin espacios sobrantes", () => {
    expect(fullName(makeClient())).toBe("Ana López");
    expect(fullName(makeClient({ lastName: "" }))).toBe("Ana");
  });
});

describe("cálculos de la cuenta", () => {
  it("totalItems multiplica precio por cantidad", () => {
    const c = makeClient({
      items: [
        { id: "1", descripcion: "Arroz", precio: 50, cantidad: 3, fecha: 1 },
        { id: "2", descripcion: "Frijoles", precio: 30, cantidad: 1, fecha: 1 },
      ],
      pagos: [],
    });
    expect(totalItems(c)).toBe(180);
  });

  it("totalPagos suma los abonos", () => {
    const c = makeClient({
      pagos: [
        { id: "1", monto: 40, fecha: 1 },
        { id: "2", monto: 25, fecha: 1 },
      ],
    });
    expect(totalPagos(c)).toBe(65);
  });

  it("deuda es fiado menos abonos y nunca baja de cero", () => {
    expect(deuda(makeClient())).toBe(100); // 120 fiado - 20 abonado
    const sobrepagado = makeClient({
      pagos: [{ id: "p", monto: 9999, fecha: 1 }],
    });
    expect(deuda(sobrepagado)).toBe(0);
  });

  it("saldoAFavor es el excedente de abonos sobre el fiado", () => {
    expect(saldoAFavor(makeClient())).toBe(0); // aún debe 100
    const conExcedente = makeClient({
      pagos: [{ id: "p", monto: 200, fecha: 1 }],
    });
    expect(saldoAFavor(conExcedente)).toBe(80); // abonó 200 de 120 fiados
    expect(saldoAFavor(makeClient({ items: [], pagos: [] }))).toBe(0);
  });
});

describe("roles y persistencia (RTDB simulada)", () => {
  it("getUserRole distingue vendedor, cliente y desconocido", async () => {
    __fakeDb.setData({
      vendedores: { "uid-v": { name: "Juan", email: "j@x.com", created: 1 } },
      clientes: {
        "uid-c": {
          idAuthVendedor: "uid-v",
          name: "Ana",
          lastName: "López",
          email: "flowventas13+88887777@gmail.com",
          telephone: "88887777",
          created: 1,
          items: [],
          pagos: [],
        },
      },
    });
    await expect(getUserRole("uid-v")).resolves.toBe("vendedor");
    await expect(getUserRole("uid-c")).resolves.toBe("cliente");
    await expect(getUserRole("uid-x")).resolves.toBeNull();
  });

  it("subscribeVendorClients solo trae los clientes de ese vendedor, con su id", () => {
    __fakeDb.setData({
      clientes: {
        c1: { idAuthVendedor: "vendor-1", name: "Uno", items: [], pagos: [] },
        c2: { idAuthVendedor: "vendor-2", name: "Dos", items: [], pagos: [] },
        c3: { idAuthVendedor: "vendor-1", name: "Tres", items: [], pagos: [] },
      },
    });
    const cb = jest.fn();
    subscribeVendorClients("vendor-1", cb);
    const clients: Client[] = cb.mock.calls[0][0];
    expect(clients.map((c) => c.id).sort()).toEqual(["c1", "c3"]);
    expect(clients.every((c) => c.idAuthVendedor === "vendor-1")).toBe(true);
  });

  it("writeClient guarda el registro bajo el UID del cliente, sin duplicar el id adentro", async () => {
    const client = makeClient({ id: "uid-cliente-1" });
    await writeClient(client);
    const stored = __fakeDb.getData().clientes["uid-cliente-1"];
    expect(stored).toBeDefined();
    expect(stored.id).toBeUndefined();
    expect(stored.idAuthVendedor).toBe("vendor-1");
    expect(stored.name).toBe("Ana");
  });

  it("subscribeOwnClient devuelve el cliente o null si no existe", () => {
    __fakeDb.setData({
      clientes: {
        "uid-c": { idAuthVendedor: "v", name: "Ana", items: [], pagos: [] },
      },
    });
    const cb = jest.fn();
    subscribeOwnClient("uid-c", cb);
    expect(cb.mock.calls[0][0]).toMatchObject({ id: "uid-c", name: "Ana" });

    const cb2 = jest.fn();
    subscribeOwnClient("uid-inexistente", cb2);
    expect(cb2.mock.calls[0][0]).toBeNull();
  });

  it("deleteClientRecord elimina el registro y su índice", async () => {
    __fakeDb.setData({
      clientes: { "uid-c": { idAuthVendedor: "v", name: "Ana" } },
      clienteIndex: { "uid-c": "v" },
    });
    await deleteClientRecord("uid-c");
    expect(__fakeDb.getData().clientes["uid-c"]).toBeUndefined();
    expect(__fakeDb.getData().clienteIndex["uid-c"]).toBeUndefined();
  });
});
