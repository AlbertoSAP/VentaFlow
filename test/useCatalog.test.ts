import { renderHook, act } from "@testing-library/react";
import { useCatalog } from "../src/hooks/useCatalog.ts";
import { __fakeDb } from "./fakes/firebaseDatabase";

beforeEach(() => {
  __fakeDb.reset();
  jest.clearAllMocks();
});

describe("useCatalog", () => {
  it("carga el catálogo del vendedor ordenado por descripción", () => {
    __fakeDb.setData({
      vendedores: {
        "vendor-1": {
          name: "Juan",
          catalogo: {
            p2: { descripcion: "Huevos", precio: 90 },
            p1: { descripcion: "Arroz 1 lb", precio: 25 },
          },
        },
        "vendor-2": {
          catalogo: { p9: { descripcion: "De otro", precio: 1 } },
        },
      },
    });
    const { result } = renderHook(() => useCatalog("vendor-1"));
    expect(result.current.products.map((p) => p.descripcion)).toEqual([
      "Arroz 1 lb",
      "Huevos",
    ]);
    expect(result.current.products[0]).toEqual({
      id: "p1",
      descripcion: "Arroz 1 lb",
      precio: 25,
    });
  });

  it("sin catálogo devuelve la lista vacía", () => {
    const { result } = renderHook(() => useCatalog("vendor-1"));
    expect(result.current.products).toEqual([]);
  });

  it("addProduct guarda el producto bajo el nodo del vendedor", async () => {
    const { result } = renderHook(() => useCatalog("vendor-1"));
    await act(async () => {
      await result.current.addProduct("Aceite 1 lt", 120);
    });
    const data = __fakeDb.getData() as any;
    const entries = Object.entries(data.vendedores["vendor-1"].catalogo);
    expect(entries).toHaveLength(1);
    expect(entries[0][1]).toEqual({
      descripcion: "Aceite 1 lt",
      precio: 120,
    });
    // (El fake de onValue dispara una sola vez al suscribir; en
    // producción Firebase vuelve a emitir y la lista se refresca.)
  });

  it("deleteProduct quita el producto del catálogo", async () => {
    __fakeDb.setData({
      vendedores: {
        "vendor-1": {
          catalogo: { p1: { descripcion: "Arroz 1 lb", precio: 25 } },
        },
      },
    });
    const { result } = renderHook(() => useCatalog("vendor-1"));
    expect(result.current.products).toHaveLength(1);
    await act(async () => {
      await result.current.deleteProduct("p1");
    });
    const data = __fakeDb.getData() as any;
    expect(
      data.vendedores["vendor-1"].catalogo?.p1,
    ).toBeUndefined();
  });
});
