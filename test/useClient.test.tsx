import { renderHook, act } from "@testing-library/react";
import { useClient } from "../src/hooks/useClient.tsx";
import { __fakeAuth } from "./fakes/firebaseAuth";
import { __fakeDb } from "./fakes/firebaseDatabase";
import { deleteUser, signOut } from "firebase/auth";
import { deleteApp } from "firebase/app";
import { set as dbSet } from "firebase/database";
import { makeClient, makeClientSinRegistros } from "./fixtures";

const record = (vendor: string, name: string) => ({
  idAuthVendedor: vendor,
  name,
  lastName: "Test",
  email: "flowventas13+88887777@gmail.com",
  telephone: "88887777",
  created: 1,
  items: [],
  pagos: [],
});

beforeEach(() => {
  __fakeAuth.reset();
  __fakeDb.reset();
  jest.clearAllMocks();
});

describe("useClient", () => {
  it("carga solo los clientes del vendedor y apaga loading", () => {
    __fakeDb.setData({
      clientes: {
        c1: record("vendor-1", "Uno"),
        c2: record("vendor-2", "Dos"),
        c3: record("vendor-1", "Tres"),
      },
    });
    const { result } = renderHook(() => useClient("vendor-1"));
    expect(result.current.loading).toBe(false);
    expect(result.current.clients.map((c) => c.id).sort()).toEqual(["c1", "c3"]);
  });

  it("createClient crea la cuenta Auth, guarda el registro con idAuthVendedor y devuelve la temporal", async () => {
    const { result } = renderHook(() => useClient("vendor-1"));
    let res: any;
    await act(async () => {
      res = await result.current.createClient({
        name: "Ana",
        lastName: "López",
        telephone: "8888 7777",
      });
    });
    expect(res.ok).toBe(true);
    expect(res.tempPassword).toMatch(/^[A-Za-z0-9]{10}$/);

    const clientes = __fakeDb.getData().clientes;
    const ids = Object.keys(clientes);
    expect(ids).toHaveLength(1);
    expect(clientes[ids[0]]).toMatchObject({
      idAuthVendedor: "vendor-1",
      name: "Ana",
      lastName: "López",
      email: "flowventas13+88887777@gmail.com",
    });
    expect(__fakeDb.getData().clienteIndex[ids[0]]).toBe("vendor-1");
    // la app secundaria se limpia: sesión cerrada y app borrada
    expect(signOut).toHaveBeenCalled();
    expect(deleteApp).toHaveBeenCalled();
  });

  it("createClient valida nombre y teléfono antes de tocar Firebase", async () => {
    const { result } = renderHook(() => useClient("vendor-1"));
    let r1: any;
    let r2: any;
    await act(async () => {
      r1 = await result.current.createClient({
        name: " ",
        lastName: "",
        telephone: "88887777",
      });
      r2 = await result.current.createClient({
        name: "Ana",
        lastName: "",
        telephone: "123",
      });
    });
    expect(r1).toMatchObject({ ok: false });
    expect(r2).toMatchObject({ ok: false });
    expect(__fakeDb.getData().clientes).toBeUndefined();
  });

  it("createClient mapea el error de teléfono duplicado", async () => {
    __fakeAuth.createUserImpl.mockRejectedValueOnce({
      code: "auth/email-already-in-use",
    });
    const { result } = renderHook(() => useClient("vendor-1"));
    let res: any;
    await act(async () => {
      res = await result.current.createClient({
        name: "Ana",
        lastName: "",
        telephone: "88887777",
      });
    });
    expect(res.ok).toBe(false);
    expect(res.error).toMatch(/Ya existe un cliente/);
    expect(__fakeDb.getData().clientes).toBeUndefined();
  });

  it("createClient compensa borrando la cuenta si falla guardar el registro", async () => {
    (dbSet as jest.Mock).mockRejectedValueOnce(new Error("boom"));
    const { result } = renderHook(() => useClient("vendor-1"));
    let res: any;
    await act(async () => {
      res = await result.current.createClient({
        name: "Ana",
        lastName: "",
        telephone: "88887777",
      });
    });
    expect(res.ok).toBe(false);
    expect(deleteUser).toHaveBeenCalled();
  });

  it("deleteClient bloquea a un cliente con registros", async () => {
    const conRegistros = makeClient({ id: "c1" });
    __fakeDb.setData({
      clientes: {
        c1: { ...record("vendor-1", "Ana"), items: conRegistros.items, pagos: [] },
      },
    });
    const { result } = renderHook(() => useClient("vendor-1"));
    let msg: string | null = "";
    await act(async () => {
      msg = await result.current.deleteClient("c1", "Ana López");
    });
    expect(msg).toMatch(/No se puede eliminar/);
    expect(__fakeDb.getData().clientes.c1).toBeDefined();
  });

  it("deleteClient elimina registro e índice de un cliente sin registros", async () => {
    const sin = makeClientSinRegistros({ id: "c9" });
    __fakeDb.setData({
      clientes: { c9: record("vendor-1", sin.name) },
      clienteIndex: { c9: "vendor-1" },
    });
    const { result } = renderHook(() => useClient("vendor-1"));
    let msg: string | null = "sin-resolver";
    await act(async () => {
      msg = await result.current.deleteClient("c9", "Ana López");
    });
    expect(msg).toBeNull();
    expect(__fakeDb.getData().clientes.c9).toBeUndefined();
    expect(__fakeDb.getData().clienteIndex.c9).toBeUndefined();
  });

  it("saveClient persiste el registro actualizado", async () => {
    __fakeDb.setData({ clientes: { c1: record("vendor-1", "Ana") } });
    const { result } = renderHook(() => useClient("vendor-1"));
    const actualizado = makeClient({ id: "c1", name: "Ana María" });
    await act(async () => {
      await result.current.saveClient(actualizado);
    });
    expect(__fakeDb.getData().clientes.c1.name).toBe("Ana María");
  });
});
