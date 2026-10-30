import type { EstadoVendedor, VendorConEstado } from "@/domain/models";
import { Button } from "../ui/button";
import { useFormat } from "@/hooks/useFormat";
import { Row } from "./Row";

export default function RequestCard({
  mapValue,
  onClick,
  state,
}: {
  mapValue: VendorConEstado[];
  onClick: (uid: string, estado: EstadoVendedor) => void;
  state: EstadoVendedor;
}) {
  const { fmtFecha } = useFormat();
  // Transiciones con el mismo significado que tenía el panel antes
  // de la extracción: pendiente → aprobar/rechazar, aprobado →
  // revocar (vuelve a pendiente, no a rechazado), rechazado → aprobar.
  return (
    <div className="flex flex-col gap-3">
      {mapValue.map((vendor) =>
        Row(
          vendor,
          <>
            {state === "pendiente" && (
              <>
                <Button
                  variant="success"
                  size="sm"
                  onClick={() => onClick(vendor.id, "aprobado")}
                >
                  Aprobar
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-red-600 hover:text-red-700"
                  onClick={() => onClick(vendor.id, "rechazado")}
                >
                  Rechazar
                </Button>
              </>
            )}
            {state === "aprobado" && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onClick(vendor.id, "pendiente")}
              >
                Revocar acceso
              </Button>
            )}
            {state === "rechazado" && (
              <Button
                variant="success"
                size="sm"
                onClick={() => onClick(vendor.id, "aprobado")}
              >
                Aprobar
              </Button>
            )}
          </>,
          fmtFecha,
        ),
      )}
    </div>
  );
}
