import { fmtFecha, VendorConEstado } from "@/storage";
import { iniciales } from "@/util/Initiales";
import { ReactNode } from "react";

export const Row = (
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
