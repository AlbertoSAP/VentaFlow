/* Formato de presentación. Solo da forma a valores, no calcula. */

export const fmtMoney = (n: number): string =>
  "C$ " +
  Number(n || 0).toLocaleString("es-NI", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

export const fmtFecha = (ts: number): string =>
  new Date(ts).toLocaleDateString("es-NI", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
