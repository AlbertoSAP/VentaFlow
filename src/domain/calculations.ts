/* Matemática pura del negocio. Funciones sin Firebase ni React:
 * reciben datos y devuelven valores. Los componentes las alcanzan
 * a través de hooks (useClientCalculations, useMetrics), nunca con
 * un import directo. */

import type { Client, Movimiento } from "./models";

export const fullName = (c: Client): string =>
  `${c.name} ${c.lastName}`.trim();

export function totalItems(c: Client): number {
  return (c.items || []).reduce(
    (s, it) => s + it.precio * (it.cantidad || 1),
    0,
  );
}

export function totalPagos(c: Client): number {
  return (c.pagos || []).reduce((s, p) => s + p.monto, 0);
}

export function deuda(c: Client): number {
  return Math.max(0, totalItems(c) - totalPagos(c));
}

/**
 * Dinero abonado por encima del total fiado: queda a favor del
 * cliente (pasa, por ejemplo, si se quitan productos ya abonados).
 */
export function saldoAFavor(c: Client): number {
  return Math.max(0, totalPagos(c) - totalItems(c));
}

/** Fiados y abonos mezclados, del más reciente al más antiguo */
export function ultimosMovimientos(c: Client, limite = 5): Movimiento[] {
  const movs: Movimiento[] = [
    ...(c.pagos || []).map((p) => ({
      tipo: "pago" as const,
      monto: p.monto,
      fecha: p.fecha,
    })),
    ...(c.items || []).map((it) => ({
      tipo: "fiado" as const,
      monto: it.precio * (it.cantidad || 1),
      fecha: it.fecha,
      desc: it.descripcion,
    })),
  ];
  return movs.sort((a, b) => b.fecha - a.fecha).slice(0, limite);
}

/** Agregados del panel del vendedor (Dashboard y pestaña Clientes) */
export function metricas(clientes: Client[]) {
  const totalPorCobrar = clientes.reduce((s, c) => s + deuda(c), 0);
  const clientesConDeuda = clientes.filter((c) => deuda(c) > 0).length;
  const totalAbonado = clientes.reduce((s, c) => s + totalPagos(c), 0);
  const totalFiado = clientes.reduce((s, c) => s + totalItems(c), 0);
  const tasaRecuperacion =
    totalFiado > 0 ? (totalAbonado / totalFiado) * 100 : 0;
  return {
    totalPorCobrar,
    clientesConDeuda,
    totalAbonado,
    totalFiado,
    tasaRecuperacion,
  };
}
