import { EstadoVendedor, VendorConEstado } from "@/storage";
import { Button } from "../ui/button";
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
  const changeValueState = (state: EstadoVendedor) => {
    switch (state) {
      case "aprobado":
        return "rechazado";
      case "pendiente":
        return "aprobado";

      default:
        return "aprobado";
    }
  };

  return (
    <div className="flex flex-col gap-3">
      {mapValue.map((vendor) =>
        Row(
          vendor,
          <>
            {(state === "pendiente" || state === "rechazado") && (
              <Button
                variant="success"
                size="sm"
                onClick={() => onClick(vendor.id, "aprobado")}
              >
                Aprobar
              </Button>
            )}
            {state !== "rechazado" && (
              <Button
                variant="outline"
                size="sm"
                className={
                  state === "pendiente" ? "text-red-600 hover:text-red-700" : ""
                }
                onClick={() => onClick(vendor.id, changeValueState(state))}
              >
                {state === "aprobado" ? "Revocar acceso" : "Rechazar"}
              </Button>
            )}
          </>,
        ),
      )}
    </div>
  );
}
