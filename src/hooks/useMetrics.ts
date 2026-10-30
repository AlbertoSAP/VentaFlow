/* Agregados del panel del vendedor, memoizados. Los usan Dashboard
 * y VendorApp (total por cobrar, clientes con deuda, % recuperado). */

import { useMemo } from "react";
import { metricas } from "../domain/calculations";
import type { Client } from "../domain/models";

export function useMetrics(clientes: Client[]) {
  return useMemo(() => metricas(clientes), [clientes]);
}
