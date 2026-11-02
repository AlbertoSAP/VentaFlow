/* Lógica pura del aviso de nueva solicitud (sin Firebase ni SMTP):
 * testeable sin desplegar. El trigger vive en index.js. */

function adminEmailsFromSnapshots(admins, vendorEmails) {
  if (!admins) return [];
  return Object.keys(admins)
    .filter((uid) => admins[uid] === true)
    .map((uid) => vendorEmails[uid])
    .filter((email) => typeof email === "string" && email.length > 0);
}

function buildNewVendorEmail(vendor) {
  const name = vendor.name || "Sin nombre";
  const email = vendor.email || "Sin correo";
  const created = vendor.created
    ? new Date(vendor.created).toLocaleString("es-NI", {
        timeZone: "America/Managua",
      })
    : "fecha desconocida";
  return {
    subject: `Nueva solicitud de vendedor en VentaFlow: ${name}`,
    text: [
      "Un vendedor nuevo se registró en VentaFlow y está pendiente de aprobación.",
      "",
      `Nombre: ${name}`,
      `Correo: ${email}`,
      `Fecha: ${created}`,
      "",
      "Revisalo en la pestaña Solicitudes de tu panel de vendedor.",
    ].join("\n"),
  };
}

module.exports = { adminEmailsFromSnapshots, buildNewVendorEmail };
