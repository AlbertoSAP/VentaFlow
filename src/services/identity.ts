/* Identidad de login. Genera los identificadores que Firebase Auth
 * necesita para una cuenta de cliente; no toca la base de datos. */

export const uid = (): string => Math.random().toString(36).slice(2, 10);

/**
 * El cliente entra con su teléfono: internamente su cuenta de
 * Firebase Auth usa un ALIAS con "+" de un único buzón real del
 * negocio (flowventas13@gmail.com). Firebase ve una dirección
 * distinta por cliente, pero todos los correos —incluido el de
 * restablecer contraseña— llegan a ese mismo buzón.
 * El identificador es el teléfono; si viene con el código de país
 * de Nicaragua (505 + 8 dígitos) se usa solo el número local, para
 * que el login genere siempre el mismo alias escriba como escriba.
 * Ej: "8888 7777" -> "flowventas13+88887777@gmail.com"
 */
export const generateEmailAlias = (telephone: string): string => {
  const digits = telephone.replace(/\D/g, "");
  const userId =
    digits.length === 11 && digits.startsWith("505")
      ? digits.slice(3)
      : digits;
  return `flowventas13+${userId}@gmail.com`;
};

/** Contraseña temporal para un cliente nuevo: se muestra una sola vez */
export function generateTempPassword(): string {
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  let out = "";
  for (let i = 0; i < 10; i++)
    out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

/**
 * Validación del teléfono para crear un cliente. El botón de
 * guardar se deshabilita mientras esto no sea null, y createClient
 * lo usa como segunda barrera. Separadores (espacios, guiones) y
 * el + inicial se toleran; cualquier otro carácter es inválido.
 * Un número corto y uno con caracteres inválidos dan mensajes
 * distintos: el usuario debe saber cuál es su caso.
 */
export function telephoneError(telephone: string): string | null {
  if (/[^0-9\s\-+]/.test(telephone))
    return "El teléfono solo debe contener números.";
  if (telephone.replace(/\D/g, "").length < 8)
    return "El teléfono debe tener al menos 8 dígitos: será el usuario del cliente para entrar.";
  return null;
}
