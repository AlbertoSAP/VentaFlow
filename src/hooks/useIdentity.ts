/* Generadores de identidad, como paquete. Los componentes y hooks
 * que crean ids o credenciales los toman de acá. */

import { useMemo } from "react";
import {
  generateEmailAlias,
  generateTempPassword,
  telephoneError,
  uid,
} from "../services/identity";

export function useIdentity() {
  return useMemo(
    () => ({ uid, generateEmailAlias, generateTempPassword, telephoneError }),
    [],
  );
}
