/* Formato de presentación, como paquete. Los componentes toman de
 * acá fmtMoney y fmtFecha en vez de importarlos planos. */

import { useMemo } from "react";
import { fmtFecha, fmtMoney } from "../lib/format";

export function useFormat() {
  return useMemo(() => ({ fmtMoney, fmtFecha }), []);
}
