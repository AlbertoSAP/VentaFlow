/* ==================== Vista del cliente (solo lectura) ==================== */

import { Topbar } from "@/components/shared/Topbar";
import { moneyCls, pagadoCls, TotalBox } from "@/components/shared/TotalBox";
import { Totals } from "@/components/shared/Totals";
import { Wrap } from "@/components/shared/Wrap";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  Client,
  deuda,
  fmtFecha,
  fmtMoney,
  subscribeOwnClient,
} from "@/storage";
import { useEffect, useState } from "react";

interface ClientProps {
  clientUid: string;
  onLogout: () => Promise<void>;
}

export function ClientApp({ clientUid, onLogout }: ClientProps) {
  const [cliente, setCliente] = useState<Client | null | undefined>(undefined);

  useEffect(() => subscribeOwnClient(clientUid, setCliente), [clientUid]);

  return (
    <div className="min-h-screen">
      <Topbar>
        <Button variant="outline" size="sm" onClick={() => void onLogout()}>
          Salir
        </Button>
      </Topbar>

      {cliente === undefined ? (
        <Wrap>
          <p className="py-16 text-center text-muted-foreground">
            Cargando tu registro…
          </p>
        </Wrap>
      ) : cliente === null ? (
        <Wrap>
          <p className="py-16 text-center text-muted-foreground">
            Tu registro no fue encontrado.
          </p>
        </Wrap>
      ) : (
        <Wrap>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold tracking-tight">
                Hola, {cliente.name}
              </h2>
              <span className="text-sm text-muted-foreground">
                Este es tu estado de cuenta
              </span>
            </div>
            <TotalBox monto={deuda(cliente)} />
          </div>

          <Card className="gap-2 p-6">
            <h3 className="text-base font-semibold tracking-tight">
              Productos fiados
            </h3>
            {(cliente.items || []).length === 0 && (
              <p className="text-sm text-muted-foreground">
                Sin productos registrados.
              </p>
            )}
            {(cliente.items || []).map((it) => (
              <div
                className="flex items-center justify-between gap-3 border-b border-slate-100 py-3 last:border-0"
                key={it.id}
              >
                <div className="min-w-0">
                  <strong className="block truncate">{it.descripcion}</strong>
                  <div className="text-xs text-muted-foreground">
                    {fmtFecha(it.fecha)} ·{" "}
                    {it.cantidad > 1
                      ? `${it.cantidad} × ${fmtMoney(it.precio)}`
                      : fmtMoney(it.precio)}
                  </div>
                </div>
                <strong className={cn("shrink-0", moneyCls)}>
                  {fmtMoney(it.precio * (it.cantidad || 1))}
                </strong>
              </div>
            ))}
            <Totals cliente={cliente} />
          </Card>

          {(cliente.pagos || []).length > 0 && (
            <Card className="gap-3 p-6">
              <h3 className="text-base font-semibold tracking-tight">
                Mis abonos
              </h3>
              <div className="flex flex-col gap-2">
                {(cliente.pagos || []).map((p) => (
                  <div
                    className="flex items-center justify-between rounded-lg bg-emerald-50 px-3.5 py-2 text-sm"
                    key={p.id}
                  >
                    <span className="text-xs text-muted-foreground">
                      {fmtFecha(p.fecha)}
                    </span>
                    <strong className={cn(moneyCls, pagadoCls)}>
                      − {fmtMoney(p.monto)}
                    </strong>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </Wrap>
      )}
    </div>
  );
}
