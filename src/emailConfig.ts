/* Configuración de EmailJS: los valores viven en el .env del proyecto
 * (variables VITE_EMAILJS_*). Ver .env.example. En producción (Vercel)
 * hay que declarar las mismas variables en el panel del sitio.
 * Los tests usan test/fakes/emailConfig.ts (sin import.meta.env). */
export const emailjsConfig = {
  serviceId: import.meta.env.VITE_EMAILJS_SERVICE_ID ?? "",
  templateId: import.meta.env.VITE_EMAILJS_TEMPLATE_ID ?? "",
  publicKey: import.meta.env.VITE_EMAILJS_PUBLIC_KEY ?? "",
};
