/* Mensajes de WhatsApp. Arma enlaces y textos a partir del dominio
 * y del formato; no toca la base de datos. */

import {
  deuda,
  saldoAFavor,
  totalItems,
  totalPagos,
  ultimosMovimientos,
} from "@/domain/calculations";
import { fmtFecha, fmtMoney } from "@/lib/format";
import type { Client } from "@/domain/models";

/** Teléfono en formato internacional para wa.me (Nicaragua: 505) */
export function whatsAppPhone(telephone: string): string {
  const digits = telephone.replace(/\D/g, "");
  return digits.length === 8 ? `505${digits}` : digits;
}

/** Enlace wa.me con el mensaje ya codificado */
export function whatsAppUrl(telephone: string, texto: string): string {
  return `https://wa.me/${whatsAppPhone(telephone)}?text=${encodeURIComponent(texto)}`;
}

/** Resumen de la cuenta, listo para enviar al cliente por WhatsApp */
export function mensajeEstadoCuenta(c: Client): string {
  const lines = [
    `Hola ${c.name}, te comparto tu estado de cuenta en VentaFlow:`,
    "",
    `Total fiado: ${fmtMoney(totalItems(c))}`,
    `Total abonado: ${fmtMoney(totalPagos(c))}`,
  ];
  if (saldoAFavor(c) > 0)
    lines.push(`Saldo a favor: ${fmtMoney(saldoAFavor(c))}`);
  lines.push(`Deuda actual: ${fmtMoney(deuda(c))}`);
  const movs = ultimosMovimientos(c);
  if (movs.length > 0) {
    lines.push("", "Últimos movimientos:");
    for (const m of movs)
      lines.push(
        m.tipo === "pago"
          ? `• ${fmtFecha(m.fecha)} — Abono: ${fmtMoney(m.monto)}`
          : `• ${fmtFecha(m.fecha)} — ${m.desc}: ${fmtMoney(m.monto)}`,
      );
  }
  return lines.join("\n");
}

/** Datos de acceso de un cliente recién creado, para enviárselos */
export function mensajeDatosAcceso(
  nombre: string,
  telephone: string,
  tempPassword: string,
): string {
  return [
    `Hola ${nombre}, ya tienes tu cuenta en VentaFlow para ver tu estado de cuenta:`,
    `Usuario: tu número de teléfono (${telephone})`,
    `Contraseña temporal: ${tempPassword}`,
    "Entrá con esos datos en la app. ¡Gracias!",
  ].join("\n");
}
