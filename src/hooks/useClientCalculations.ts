/* Cálculos de la cuenta de un cliente, como paquete. Los componentes
 * toman de acá solo lo que usan (ISP) y así ningún componente importa
 * funciones planas del dominio: las listas pueden llamarlas dentro de
 * un map o un filtro sin romper las reglas de los hooks, porque lo
 * que devuelve el hook son funciones, no valores por cliente. */

import { useMemo } from "react";
import {
  deuda,
  fullName,
  saldoAFavor,
  totalItems,
  totalPagos,
  ultimosMovimientos,
} from "../domain/calculations";

export function useClientCalculations() {
  return useMemo(
    () => ({
      fullName,
      totalItems,
      totalPagos,
      deuda,
      saldoAFavor,
      ultimosMovimientos,
    }),
    [],
  );
}
