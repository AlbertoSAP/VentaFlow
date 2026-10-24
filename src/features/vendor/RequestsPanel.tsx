/* ======== Panel del administrador: solicitudes de vendedores ======== */

import RequestCard from "@/components/shared/RequestCard";
import { Wrap } from "@/components/shared/Wrap";
import { Button } from "@/components/ui/button";
import { filterForIdAndState } from "@/lib/filterForIdAndState";
import { EstadoVendedor, fmtFecha, VendorConEstado } from "@/storage";
import { iniciales } from "@/util/Initiales";
import { ReactNode } from "react";

export function RequestsPanel({
  vendedores,
  miUid,
  onSetEstado,
}: {
  vendedores: VendorConEstado[];
  miUid: string;
  onSetEstado: (uid: string, estado: EstadoVendedor) => void;
}) {
  const [pendientes, aprobados, rechazados] = (
    ["pendiente", "aprobado", "rechazado"] as EstadoVendedor[]
  ).map((state) =>
    filterForIdAndState({
      miUid,
      Salespeople: vendedores,
      state,
    }),
  );

  const fila = (
    { id, name, email, created }: VendorConEstado,
    acciones: ReactNode,
  ) => (
    <div
      key={id}
      className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card p-4 shadow-sm"
    >
      <div className="flex min-w-0 items-center gap-3.5">
        <span className="grid size-11 shrink-0 place-items-center rounded-full bg-blue-50 text-sm font-bold text-primary">
          {iniciales(name || email)}
        </span>
        <div className="min-w-0">
          <strong className="block truncate">{name || "(sin nombre)"}</strong>
          <div className="truncate text-xs text-muted-foreground">
            {email}
            {!!created ? ` · Registrado: ${fmtFecha(created)}` : ""}
          </div>
        </div>
      </div>
      <div className="flex shrink-0 gap-2">{acciones}</div>
    </div>
  );

  return (
    <Wrap wide>
      <div>
        <h2 className="text-2xl font-bold tracking-tight">
          Solicitudes de vendedores
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Solo los vendedores que aprobés aquí pueden comenzar a usar la
          aplicación. El resto ve una pantalla de espera.
        </p>
      </div>

      <h3 className="text-base font-semibold tracking-tight">
        Pendientes ({pendientes.length})
      </h3>
      {pendientes.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No hay solicitudes pendientes.
        </p>
      ) : (
        <RequestCard
          mapValue={pendientes}
          onClick={onSetEstado}
          state="pendiente"
        />
      )}

      <h3 className="text-base font-semibold tracking-tight">
        Aprobados ({aprobados.length})
      </h3>
      {aprobados.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Todavía no aprobaste a ningún vendedor.
        </p>
      ) : (
        <RequestCard
          mapValue={aprobados}
          onClick={onSetEstado}
          state="aprobado"
        />
      )}

      {!!rechazados.length && (
        <>
          <h3 className="text-base font-semibold tracking-tight">
            Rechazados ({rechazados.length})
          </h3>
          <RequestCard
            mapValue={rechazados}
            onClick={onSetEstado}
            state="rechazado"
          />
        </>
      )}
    </Wrap>
  );
}
