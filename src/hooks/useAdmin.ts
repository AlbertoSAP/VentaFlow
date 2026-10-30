import { useEffect, useState } from "react";
import type { EstadoVendedor, VendorConEstado } from "../domain/models";
import { approvalsRepository } from "../data/firebaseRepositories";
import type { AprobacionesRepository } from "../data/repositories";

/**
 * Panel del administrador: lista de vendedores con su estado de
 * aprobación (solo se suscribe si el usuario es admin, porque las
 * reglas de la base deniegan la lectura a los demás) y la acción
 * para aprobar, rechazar o revocar.
 */
export function useAdminVendedores(
  activo: boolean,
  repo: AprobacionesRepository = approvalsRepository,
) {
  const [vendedores, setVendedores] = useState<VendorConEstado[]>([]);

  useEffect(() => {
    if (!activo) return;
    return repo.subscribeVendedoresAdmin(setVendedores);
  }, [activo, repo]);

  const setEstadoVendedor = (uid: string, estado: EstadoVendedor) =>
    repo.setEstadoVendedor(uid, estado);

  return { vendedores, setEstadoVendedor };
}
