import { cn } from "@/lib/utils";
import { Card } from "../ui/card";
import { useFormat } from "@/hooks/useFormat";

export const deudaCls = "text-red-600";
export const pagadoCls = "text-emerald-600";
export const moneyCls = "tabular-nums";

export function TotalBox({ monto }: { monto: number }) {
  const { fmtMoney } = useFormat();
  return (
    <Card className="flex flex-col gap-0.5 px-5 py-3.5 text-right shadow-sm">
      <span className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
        Deuda actual
      </span>
      <strong
        className={cn(
          "text-2xl font-bold",
          moneyCls,
          monto > 0 ? deudaCls : pagadoCls,
        )}
      >
        {fmtMoney(monto)}
      </strong>
    </Card>
  );
}
