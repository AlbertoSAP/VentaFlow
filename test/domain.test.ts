/* Pruebas puras: no montan Firebase falso, solo dominio, formato,
 * identidad y WhatsApp. */

import { fmtMoney, fmtFecha } from "../src/lib/format";
import {
  generateEmailAlias,
  generateTempPassword,
} from "../src/services/identity";
import {
  whatsAppPhone,
  whatsAppUrl,
  mensajeEstadoCuenta,
  mensajeDatosAcceso,
} from "../src/services/whatsapp";
import {
  ultimosMovimientos,
  fullName,
  totalItems,
  totalPagos,
  deuda,
  saldoAFavor,
} from "../src/domain/calculations";
import { makeClient } from "./fixtures";

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
