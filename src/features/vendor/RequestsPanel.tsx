/* ======== Panel del administrador: solicitudes de vendedores ======== */

import RequestCard from "@/components/shared/RequestCard";
import { Wrap } from "@/components/shared/Wrap";
import { filterForIdAndState } from "@/lib/filterForIdAndState";
import { EstadoVendedor, VendorConEstado } from "@/domain/models";

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
