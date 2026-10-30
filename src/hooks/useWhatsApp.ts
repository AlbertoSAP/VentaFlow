/* Mensajes de WhatsApp, como paquete. Los componentes toman de acá
 * solo los builders que usan, en vez de importarlos planos. */

import { useMemo } from "react";
import {
  mensajeDatosAcceso,
  mensajeEstadoCuenta,
  whatsAppPhone,
  whatsAppUrl,
} from "../services/whatsapp";

export function useWhatsApp() {
  return useMemo(
    () => ({
      whatsAppPhone,
      whatsAppUrl,
      mensajeEstadoCuenta,
      mensajeDatosAcceso,
    }),
    [],
  );
}
