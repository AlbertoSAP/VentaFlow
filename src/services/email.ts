import { fmtFecha } from "../lib/format";
import emailjs from "@emailjs/browser";

export interface EmailNotificationConfig {
  serviceId: string;
  templateId: string;
  publicKey: string;
}

export interface NewVendorNotice {
  name: string;
  email: string;
  created: number;
}

type EmailSend = (
  serviceId: string,
  templateId: string,
  params: Record<string, string>,
  publicKey: string,
) => Promise<unknown>;

/* Avisa al admin que un vendedor nuevo quedó pendiente de aprobación.
 * El destinatario es fijo en la plantilla de EmailJS. Nunca falla: sin
 * configuración no envía, y si el envío falla solo lo registra, para
 * no romper el registro del vendedor. */
export async function sendNewVendorNotification(
  vendor: NewVendorNotice,
  config: EmailNotificationConfig,
  sendFn?: EmailSend,
): Promise<void> {
  if (!config.serviceId || !config.templateId || !config.publicKey) return;
  try {
    const send: EmailSend = sendFn ?? emailjs.send;
    await send(
      config.serviceId,
      config.templateId,
      {
        vendor_name: vendor.name,
        vendor_email: vendor.email,
        vendor_date: fmtFecha(vendor.created),
      },
      config.publicKey,
    );
  } catch (error) {
    console.error("No se pudo enviar el aviso al admin por EmailJS.", error);
  }
}
