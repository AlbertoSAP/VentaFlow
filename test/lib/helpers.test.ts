import { filterForIdAndState } from "../../src/lib/filterForIdAndState.ts";
import { iniciales } from "../../src/util/Initiales.ts";

describe("filterForIdAndState", () => {
  const vendedores = [
    { id: "v1", name: "A", email: "a@x.com", created: 1, estado: "pendiente" as const },
    { id: "v2", name: "B", email: "b@x.com", created: 2, estado: "aprobado" as const },
    { id: "v3", name: "C", email: "c@x.com", created: 3, estado: "pendiente" as const },
  ];

  it("filtra por estado y excluye al propio vendedor", () => {
    const pendientes = filterForIdAndState({
      state: "pendiente",
      Salespeople: vendedores,
      miUid: "v1",
    });
    expect(pendientes.map((v) => v.id)).toEqual(["v3"]);

    const aprobados = filterForIdAndState({
      state: "aprobado",
      Salespeople: vendedores,
      miUid: "v1",
    });
    expect(aprobados.map((v) => v.id)).toEqual(["v2"]);
  });

  it("sin coincidencias devuelve vacío", () => {
    expect(
      filterForIdAndState({
        state: "rechazado",
        Salespeople: vendedores,
        miUid: "v1",
      }),
    ).toEqual([]);
  });
});

describe("iniciales", () => {
  it("dos palabras dan dos iniciales en mayúscula", () => {
    expect(iniciales("Ana López")).toBe("AL");
  });

  it("una sola palabra da una inicial", () => {
    expect(iniciales("Juan")).toBe("J");
  });

  it("ignora espacios de más y toma solo las dos primeras", () => {
    expect(iniciales("  Ana   María López ")).toBe("AM");
  });

  it("vacío da vacío", () => {
    expect(iniciales("")).toBe("");
  });
});
