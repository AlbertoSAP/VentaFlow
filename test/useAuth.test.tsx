import { renderHook, act, waitFor } from "@testing-library/react";
import { useAuth, mapAuthError } from "../src/hooks/useAuth.ts";
import { __fakeAuth } from "./fakes/firebaseAuth";
import { __fakeDb } from "./fakes/firebaseDatabase";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
} from "firebase/auth";

beforeEach(() => {
  __fakeAuth.reset();
  __fakeDb.reset();
  jest.clearAllMocks();
});

describe("useAuth", () => {
  it("sin sesión: user null, rol null y deja de resolver", async () => {
    const { result } = renderHook(() => useAuth());
    act(() => __fakeAuth.emit(null));
    expect(result.current.user).toBeNull();
    expect(result.current.role).toBeNull();
    expect(result.current.resolving).toBe(false);
  });

  it("resuelve rol vendedor si el uid está en vendedores/", async () => {
    __fakeDb.setData({
      vendedores: { u1: { name: "Juan", email: "j@x.com", created: 1 } },
    });
    const { result } = renderHook(() => useAuth());
    act(() => __fakeAuth.emit({ uid: "u1" }));
    await waitFor(() => expect(result.current.role).toBe("vendedor"));
    expect(result.current.resolving).toBe(false);
  });

  it("resuelve rol cliente si el uid está en clientes/", async () => {
    __fakeDb.setData({
      clientes: { c1: { idAuthVendedor: "u1", name: "Ana" } },
    });
    const { result } = renderHook(() => useAuth());
    act(() => __fakeAuth.emit({ uid: "c1" }));
    await waitFor(() => expect(result.current.role).toBe("cliente"));
  });

  it("loginClient entra con el email generado desde el teléfono", async () => {
    const { result } = renderHook(() => useAuth());
    await act(async () => {
      await result.current.loginClient("8888 7777", "secreto");
    });
    expect(signInWithEmailAndPassword).toHaveBeenCalledWith(
      expect.anything(),
      "88887777@ventaflow.app",
      "secreto",
    );
  });

  it("loginVendor entra con su correo", async () => {
    const { result } = renderHook(() => useAuth());
    await act(async () => {
      await result.current.loginVendor("juan@x.com", "secreto");
    });
    expect(signInWithEmailAndPassword).toHaveBeenCalledWith(
      expect.anything(),
      "juan@x.com",
      "secreto",
    );
  });

  it("registerVendor crea la cuenta y escribe su perfil en vendedores/{uid}", async () => {
    const { result } = renderHook(() => useAuth());
    await act(async () => {
      await result.current.registerVendor("Juan Pérez", "juan@x.com", "123456");
    });
    expect(createUserWithEmailAndPassword).toHaveBeenCalled();
    const perfiles = __fakeDb.getData().vendedores;
    const uid = Object.keys(perfiles)[0];
    expect(perfiles[uid]).toMatchObject({
      name: "Juan Pérez",
      email: "juan@x.com",
    });
    expect(result.current.role).toBe("vendedor");
  });

  it("logout cierra la sesión", async () => {
    const { result } = renderHook(() => useAuth());
    await act(async () => {
      await result.current.logout();
    });
    expect(signOut).toHaveBeenCalled();
  });
});

describe("mapAuthError", () => {
  it("traduce los códigos más comunes a mensajes en español", () => {
    expect(mapAuthError({ code: "auth/invalid-credential" })).toMatch(
      /incorrectas/i,
    );
    expect(mapAuthError({ code: "auth/email-already-in-use" })).toMatch(
      /ya tiene una cuenta/i,
    );
    expect(mapAuthError({ code: "auth/operation-not-allowed" })).toMatch(
      /consola de Firebase/i,
    );
    expect(mapAuthError({ code: "auth/weak-password" })).toMatch(/6 caracteres/);
    expect(mapAuthError(new Error("???"))).toMatch(/Ocurrió un error/);
  });
});
