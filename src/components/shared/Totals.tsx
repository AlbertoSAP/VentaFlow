/* ===== Piezas visuales compartidas (Tailwind + shadcn/ui) ===== */

import type { Client } from "@/domain/models";
import { useClientCalculations } from "@/hooks/useClientCalculations";
import { useFormat } from "@/hooks/useFormat";
import { deudaCls, moneyCls, pagadoCls } from "./TotalBox";
import { cn } from "@/lib/utils";

export function Totals({ cliente }: { cliente: Client }) {
  const { deuda, saldoAFavor, totalItems, totalPagos } =
    useClientCalculations();
  const { fmtMoney } = useFormat();
  const d = deuda(cliente);
  const sf = saldoAFavor(cliente);
  return (
    <div className="mt-4 flex flex-col gap-2 border-t border-slate-100 pt-4 text-sm">
      <div className="flex items-center justify-between">
        <span className="text-muted-foreground">Total fiado:</span>
        <strong className={moneyCls}>{fmtMoney(totalItems(cliente))}</strong>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-muted-foreground">Total abonado:</span>
        <strong className={cn(moneyCls, pagadoCls)}>
          − {fmtMoney(totalPagos(cliente))}
        </strong>
      </div>
      {sf > 0 && (
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Saldo a favor:</span>
          <strong className={cn(moneyCls, pagadoCls)}>+ {fmtMoney(sf)}</strong>
        </div>
      )}
      <div className="mt-1 flex items-center justify-between border-t-2 border-slate-200 pt-3 text-lg font-bold">
        <span>Deuda actual:</span>
        <strong className={cn(moneyCls, deudaCls)}>{fmtMoney(d)}</strong>
      </div>
    </div>
  );
}
