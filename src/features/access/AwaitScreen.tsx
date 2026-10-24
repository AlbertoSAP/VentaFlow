/* ======== Pantalla de espera: vendedor aún no aprobado ======== */

import { Topbar } from "@/components/shared/Topbar";
import { Wrap } from "@/components/shared/Wrap";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EstadoVendedor } from "@/storage";
import { Clock, UserCheck } from "lucide-react";

export function AwaitScreen({
  estado,
  onLogout,
}: {
  estado: EstadoVendedor;
  onLogout: () => Promise<void>;
}) {
  const rechazado = estado === "rechazado";
  return (
    <div className="min-h-screen">
      <Topbar>
        <Button variant="outline" size="sm" onClick={() => void onLogout()}>
          Salir
        </Button>
      </Topbar>
      <Wrap narrow>
        <Card className="items-center gap-3 p-8 text-center">
          <span className="grid size-14 place-items-center rounded-full bg-amber-50 text-amber-600 [&_svg]:size-7">
            {rechazado ? <UserCheck /> : <Clock />}
          </span>
          <h2 className="text-xl font-bold tracking-tight">
            {rechazado
              ? "Tu cuenta no fue aprobada"
              : "Tu cuenta está en revisión"}
          </h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            {rechazado
              ? "Tu solicitud de acceso a VentaFlow no fue aprobada. Si creés que se trata de un error, contactá al administrador de la aplicación."
              : "Por favor espere, su cuenta será validada y posteriormente podrá comenzar a hacer uso de ella. Cuando sea aprobada, entrá de nuevo con tu correo y contraseña: el acceso se libera automáticamente."}
          </p>
        </Card>
      </Wrap>
    </div>
  );
}
