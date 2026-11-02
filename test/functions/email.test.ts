import {
  adminEmailsFromSnapshots,
  buildNewVendorEmail,
} from "../../functions/email";

describe("adminEmailsFromSnapshots", () => {
  it("devuelve solo los correos de los uids marcados como admin", () => {
    expect(
      adminEmailsFromSnapshots(
        { "admin-1": true, "admin-2": false, "vendor-9": true },
        {
          "admin-1": "admin@ejemplo.com",
          "vendor-9": "vendedor@ejemplo.com",
        },
      ),
    ).toEqual(["admin@ejemplo.com", "vendedor@ejemplo.com"]);
  });

  it("filtra admins sin correo y devuelve vacío sin admins", () => {
    expect(adminEmailsFromSnapshots({ "admin-1": true }, {})).toEqual([]);
    expect(adminEmailsFromSnapshots(null, {})).toEqual([]);
  });
});

describe("buildNewVendorEmail", () => {
  it("incluye nombre, correo y la pestaña de Solicitudes", () => {
    const { subject, text } = buildNewVendorEmail({
      name: "Ana",
      email: "ana@ejemplo.com",
      created: 1791845068683,
    });
    expect(subject).toContain("Ana");
    expect(text).toContain("Ana");
    expect(text).toContain("ana@ejemplo.com");
    expect(text).toContain("Solicitudes");
  });

  it("no falla sin nombre, correo ni fecha", () => {
    const { subject, text } = buildNewVendorEmail({});
    expect(subject).toContain("Sin nombre");
    expect(text).toContain("Sin correo");
    expect(text).toContain("fecha desconocida");
  });
});
