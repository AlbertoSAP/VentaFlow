/* Pruebas de los repositorios Firebase con la RTDB simulada.
 * Ejercen la implementación por defecto (la que usan los hooks
 * cuando no se les inyecta otra). */

import {
  approvalsRepository,
  clientsRepository,
  vendorsRepository,
} from "../src/data/firebaseRepositories";
import type { Client } from "../src/domain/models";
import { __fakeDb } from "./fakes/firebaseDatabase";
import { makeClient } from "./fixtures";

beforeEach(() => {
  __fakeDb.reset();
});

describe("aprobación (RTDB simulada)", () => {
  it("el estado de aprobación por defecto es pendiente y cambia con setEstadoVendedor", async () => {
    const vistos: string[] = [];
    const off = approvalsRepository.subscribeEstadoVendedor("vendor-9", (e) =>
      vistos.push(e),
    );
    expect(vistos).toEqual(["pendiente"]);
    off();
    await approvalsRepository.setEstadoVendedor("vendor-9", "aprobado");
    const data = __fakeDb.getData() as any;
    expect(data.aprobaciones["vendor-9"].estado).toBe("aprobado");
  });

  it("getEsAdmin solo es true si el nodo admins lo marca", async () => {
    __fakeDb.setData({ admins: { root1: true } });
    await expect(vendorsRepository.getEsAdmin("root1")).resolves.toBe(true);
    await expect(vendorsRepository.getEsAdmin("vendor-9")).resolves.toBe(
      false,
    );
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
    const off = approvalsRepository.subscribeVendedoresAdmin((l) => (lista = l));
    off();
    expect(lista.map((v) => v.id)).toEqual(["v2", "v1"]); // más reciente primero
    expect(lista.find((v) => v.id === "v1").estado).toBe("aprobado");
    expect(lista.find((v) => v.id === "v2").estado).toBe("pendiente");
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
    await expect(vendorsRepository.getUserRole("uid-v")).resolves.toBe(
      "vendedor",
    );
    await expect(vendorsRepository.getUserRole("uid-c")).resolves.toBe(
      "cliente",
    );
    await expect(vendorsRepository.getUserRole("uid-x")).resolves.toBeNull();
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
    clientsRepository.subscribeVendorClients("vendor-1", cb);
    const clients: Client[] = cb.mock.calls[0][0];
    expect(clients.map((c) => c.id).sort()).toEqual(["c1", "c3"]);
    expect(clients.every((c) => c.idAuthVendedor === "vendor-1")).toBe(true);
  });

  it("writeClient guarda el registro bajo el UID del cliente, sin duplicar el id adentro", async () => {
    const client = makeClient({ id: "uid-cliente-1" });
    await clientsRepository.writeClient(client);
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
    clientsRepository.subscribeOwnClient("uid-c", cb);
    expect(cb.mock.calls[0][0]).toMatchObject({ id: "uid-c", name: "Ana" });

    const cb2 = jest.fn();
    clientsRepository.subscribeOwnClient("uid-inexistente", cb2);
    expect(cb2.mock.calls[0][0]).toBeNull();
  });

  it("deleteClientRecord elimina el registro y su índice", async () => {
    __fakeDb.setData({
      clientes: { "uid-c": { idAuthVendedor: "v", name: "Ana" } },
      clienteIndex: { "uid-c": "v" },
    });
    await clientsRepository.deleteClientRecord("uid-c");
    expect(__fakeDb.getData().clientes["uid-c"]).toBeUndefined();
    expect(__fakeDb.getData().clienteIndex["uid-c"]).toBeUndefined();
  });
});
