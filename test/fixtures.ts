import type { Client } from "../src/storage.ts";

let seq = 0;

/** Cliente de prueba con valores coherentes; ajusta con overrides */
export function makeClient(overrides: Partial<Client> = {}): Client {
  seq += 1;
  return {
    id: `client-${seq}`,
    idAuthVendedor: "vendor-1",
    name: "Ana",
    lastName: "López",
    email: "flowventas13+88887777@gmail.com",
    telephone: "88887777",
    created: 1791845068683,
    items: [
      {
        id: `item-${seq}`,
        descripcion: "2 libras de arroz",
        precio: 120,
        cantidad: 1,
        fecha: 1791845068683,
      },
    ],
    pagos: [{ id: `pago-${seq}`, monto: 20, fecha: 1791845068683 }],
    ...overrides,
  };
}

/** Cliente sin ningún registro: se puede eliminar */
export function makeClientSinRegistros(
  overrides: Partial<Client> = {},
): Client {
  return makeClient({ items: [], pagos: [], ...overrides });
}

/** Cliente al día: fiado == abonado */
export function makeClientSinDeuda(overrides: Partial<Client> = {}): Client {
  return makeClient({
    items: [
      {
        id: "item-sin-deuda",
        descripcion: "Aceite 1L",
        precio: 100,
        cantidad: 1,
        fecha: 1791845068683,
      },
    ],
    pagos: [{ id: "pago-sin-deuda", monto: 100, fecha: 1791845068683 }],
    ...overrides,
  });
}
