import { useMemo } from "react";
import {
  CircleDollarSign,
  Percent,
  Users,
  Wallet,
} from "lucide-react";
import type { Client } from "@/domain/models";
import { useClientCalculations } from "@/hooks/useClientCalculations";
import { useFormat } from "@/hooks/useFormat";
import { useMetrics } from "@/hooks/useMetrics";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface Actividad {
  id: string;
  tipo: "pago" | "fiado";
  monto: number;
  fecha: number;
  cliente: string;
  desc?: string;
}

// metricas vive en domain/calculations y se alcanza con useMetrics.
function actividadReciente(
  clientes: Client[],
  fullName: (c: Client) => string,
  limite = 8,
): Actividad[] {
  const acts: Actividad[] = [];
  for (const c of clientes) {
    for (const p of c.pagos || [])
      acts.push({
        id: p.id,
        tipo: "pago",
        monto: p.monto,
        fecha: p.fecha,
        cliente: fullName(c),
      });
    for (const it of c.items || [])
      acts.push({
        id: it.id,
        tipo: "fiado",
        monto: it.precio * (it.cantidad || 1),
        fecha: it.fecha,
        cliente: fullName(c),
        desc: it.descripcion,
      });
  }
  return acts.sort((a, b) => b.fecha - a.fecha).slice(0, limite);
}

interface Props {
  clientes: Client[];
}

function MetricCard({
  icon,
  iconCls,
  label,
  children,
}: {
  icon: React.ReactNode;
  iconCls: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="gap-1 p-5">
      <span
        className={cn(
          "mb-2 grid size-9 place-items-center rounded-lg [&_svg]:size-4.5",
          iconCls,
        )}
      >
        {icon}
      </span>
      <span className="text-sm text-muted-foreground">{label}</span>
      <strong className="text-2xl font-bold tabular-nums">{children}</strong>
    </Card>
  );
}

export default function Dashboard({ clientes }: Props) {
  const m = useMetrics(clientes);
  const { deuda, fullName, totalPagos } = useClientCalculations();
  const { fmtFecha, fmtMoney } = useFormat();
  const topDeudores = useMemo(
    () =>
      [...clientes]
        .filter((c) => deuda(c) > 0)
        .sort((a, b) => deuda(b) - deuda(a))
        .slice(0, 5),
    [clientes, deuda],
  );
  const acts = useMemo(
    () => actividadReciente(clientes, fullName),
    [clientes, fullName],
  );

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-5 px-4 pt-6 pb-16">
      {clientes.length === 0 && (
        <Card className="gap-2 p-6">
          <h3 className="text-base font-semibold tracking-tight">
            👋 ¡Bienvenido a VentaFlow!
          </h3>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Todavía no tienes clientes registrados. Toca la pestaña{" "}
            <strong>Clientes</strong>, agrega el primero con su nombre y
            su número de teléfono, y después podrás registrarle productos
            fiados y abonos. Aquí verás cuánto te deben en total.
          </p>
        </Card>
      )}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <MetricCard
          icon={<Wallet />}
          iconCls="bg-red-50 text-red-600"
          label="Total por cobrar"
        >
          <span className="text-red-600">{fmtMoney(m.totalPorCobrar)}</span>
        </MetricCard>
        <MetricCard
          icon={<Users />}
          iconCls="bg-amber-50 text-amber-600"
          label="Clientes con deuda"
        >
          {m.clientesConDeuda}
        </MetricCard>
        <MetricCard
          icon={<CircleDollarSign />}
          iconCls="bg-emerald-50 text-emerald-600"
          label="Total abonado"
        >
          <span className="text-emerald-600">
            − {fmtMoney(m.totalAbonado)}
          </span>
        </MetricCard>
        <MetricCard
          icon={<Percent />}
          iconCls="bg-blue-50 text-primary"
          label="% recuperado"
        >
          <span
            className={
              m.tasaRecuperacion >= 50 ? "text-emerald-600" : "text-red-600"
            }
          >
            {m.tasaRecuperacion.toFixed(0)}%
          </span>
        </MetricCard>
      </div>

      <Card className="gap-1 p-6">
        <h3 className="mb-2 text-base font-semibold tracking-tight">
          Top 5 clientes deudores
        </h3>
        {topDeudores.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            ¡Sin deudas! Todos están al corriente.
          </p>
        ) : (
          topDeudores.map((c, i) => {
            const d = deuda(c);
            const max = deuda(topDeudores[0]) || 1;
            return (
              <div className="flex flex-col gap-1.5 py-2.5" key={c.id}>
                <div className="flex items-baseline justify-between gap-4">
                  <div className="flex min-w-0 flex-col">
                    <strong className="truncate text-sm">
                      #{i + 1} {fullName(c)}
                    </strong>
                    <span className="text-xs text-muted-foreground">
                      {(c.items || []).length} productos ·{" "}
                      {fmtMoney(totalPagos(c))} abonados
                    </span>
                  </div>
                  <strong className="shrink-0 tabular-nums text-red-600">
                    {fmtMoney(d)}
                  </strong>
                </div>
                <div className="h-2.5 overflow-hidden rounded-full bg-slate-200">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-blue-600 to-blue-400 transition-all duration-500"
                    style={{ width: `${(d / max) * 100}%` }}
                  />
                </div>
              </div>
            );
          })
        )}
      </Card>

      <Card className="gap-1 p-6">
        <h3 className="mb-1 text-base font-semibold tracking-tight">
          Actividad reciente
        </h3>
        {acts.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            Sin actividad aún.
          </p>
        ) : (
          acts.map((a) => (
            <div
              className="flex items-center justify-between gap-3 border-b border-slate-100 py-3 last:border-0"
              key={`${a.tipo}-${a.id}`}
            >
              <div className="min-w-0">
                <strong>{a.cliente}</strong>
                {a.desc && (
                  <span className="text-sm text-muted-foreground">
                    {" "}
                    · {a.desc}
                  </span>
                )}
                <div className="text-xs text-muted-foreground">
                  {fmtFecha(a.fecha)}
                </div>
              </div>
              <strong
                className={cn(
                  "shrink-0 tabular-nums",
                  a.tipo === "pago" ? "text-emerald-600" : "text-red-600",
                )}
              >
                {a.tipo === "pago" ? "−" : "+"}
                {fmtMoney(a.monto)}
              </strong>
            </div>
          ))
        )}
      </Card>
    </main>
  );
}
