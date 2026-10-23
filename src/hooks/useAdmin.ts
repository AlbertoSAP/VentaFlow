import { useEffect, useState } from "react";
import {
  subscribeVendedoresAdmin,
  type VendorConEstado,
} from "../storage.ts";

/**
 * Lista de vendedores con su estado de aprobación para el panel
 * del administrador. Solo se suscribe si el usuario es admin
 * (las reglas de la base deniegan la lectura a los demás).
 */
export function useAdminVendedores(activo: boolean) {
  const [vendedores, setVendedores] = useState<VendorConEstado[]>([]);

  useEffect(() => {
    if (!activo) return;
    return subscribeVendedoresAdmin(setVendedores);
  }, [activo]);

  return vendedores;
}
