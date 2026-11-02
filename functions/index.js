/* Cloud Functions de VentaFlow.
 *
 * notifyAdminOnNewVendor: cuando se crea un perfil en vendedores/{uid}
 * (un vendedor nuevo, pendiente de aprobación), avisa por correo a los
 * admins. El disparo es la creación del perfil: aprobaciones/{uid} no
 * se crea al registrarse (su ausencia significa "pendiente").
 *
 * La función corre en la misma región que la base de datos
 * (asia-southeast1); un trigger en otra región no vería los cambios.
 */

const { onValueCreated } = require("firebase-functions/v2/database");
const {
  defineSecret,
  defineString,
} = require("firebase-functions/params");
const { initializeApp } = require("firebase-admin/app");
const { getDatabase } = require("firebase-admin/database");
const nodemailer = require("nodemailer");
const {
  adminEmailsFromSnapshots,
  buildNewVendorEmail,
} = require("./email");

initializeApp();

const smtpHost = defineString("SMTP_HOST", { default: "smtp.gmail.com" });
const smtpPort = defineString("SMTP_PORT", { default: "587" });
const smtpUser = defineSecret("SMTP_USER");
const smtpPass = defineSecret("SMTP_PASS");
const smtpFrom = defineString("SMTP_FROM", { default: "" });
// Si se define, el aviso va solo a este correo en vez de a los admins.
const adminEmailOverride = defineString("ADMIN_EMAIL", { default: "" });

exports.notifyAdminOnNewVendor = onValueCreated(
  {
    ref: "vendedores/{uid}",
    region: "asia-southeast1",
    instance: "app-venta-f07d9-default-rtdb",
    secrets: [smtpUser, smtpPass],
  },
  async (event) => {
    const uid = event.params.uid;
    const vendor = event.data.val();
    if (!vendor) return;

    const db = getDatabase();
    const admins = (await db.ref("admins").get()).val();

    // Un admin que se registra no se avisa a sí mismo.
    if (admins && admins[uid] === true) return;

    let recipients = [];
    if (adminEmailOverride.value()) {
      recipients = [adminEmailOverride.value()];
    } else {
      const adminUids = Object.keys(admins || {}).filter(
        (id) => admins[id] === true,
      );
      const vendorEmails = {};
      for (const adminUid of adminUids) {
        vendorEmails[adminUid] = (
          await db.ref(`vendedores/${adminUid}/email`).get()
        ).val();
      }
      recipients = adminEmailsFromSnapshots(admins, vendorEmails);
    }

    if (recipients.length === 0) {
      console.log(
        "notifyAdminOnNewVendor: no hay admins con correo, no se envía aviso.",
      );
      return;
    }

    const { subject, text } = buildNewVendorEmail(vendor);
    const port = Number(smtpPort.value());
    const transporter = nodemailer.createTransport({
      host: smtpHost.value(),
      port,
      secure: port === 465,
      auth: { user: smtpUser.value(), pass: smtpPass.value() },
    });

    try {
      await transporter.sendMail({
        from: smtpFrom.value() || smtpUser.value(),
        to: recipients.join(", "),
        subject,
        text,
      });
      console.log(
        `notifyAdminOnNewVendor: aviso enviado a ${recipients.length} admin(s) por ${vendor.email || uid}.`,
      );
    } catch (error) {
      // No se relanza: reintentar el evento duplicaría el correo.
      console.error(
        "notifyAdminOnNewVendor: no se pudo enviar el aviso.",
        error,
      );
    }
  },
);
