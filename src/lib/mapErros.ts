export function mapAuthErrors(e: unknown): string {
  const code = (e as { code?: string })?.code ?? "";
  switch (code) {
    case "auth/email-already-in-use":
      return "Ese correo ya tiene una cuenta. Inicia sesión.";
    case "auth/invalid-email":
      return "El correo no es válido.";
    case "auth/weak-password":
      return "La contraseña debe tener al menos 6 caracteres.";
    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found":
      return "Credenciales incorrectas. Revisa los datos e inténtalo de nuevo.";
    case "auth/operation-not-allowed":
      return "Falta habilitar el acceso con correo y contraseña en la consola de Firebase (ver SETUP_AUTH.md).";
    case "auth/network-request-failed":
      return "Sin conexión. Revisa tu internet e inténtalo de nuevo.";
    default:
      return "Ocurrió un error. Inténtalo de nuevo.";
  }
}

export function mapCreateClientError(e: unknown): string {
  const code = (e as { code?: string })?.code ?? "";
  switch (code) {
    case "auth/email-already-in-use":
      return "Ya existe un cliente con ese número de teléfono.";
    case "auth/operation-not-allowed":
      return "Falta habilitar el acceso con correo y contraseña en la consola de Firebase (ver SETUP_AUTH.md).";
    case "auth/network-request-failed":
      return "Sin conexión. Revisa tu internet e inténtalo de nuevo.";
    default:
      return "No se pudo crear el cliente. Inténtalo de nuevo.";
  }
}

export function mapErrors({
  value,
  name,
}: {
  value: "noRemove" | "faildRemove";
  name?: string;
}) {
  switch (value) {
    case "noRemove":
      return `No se puede eliminar a ${name}: tiene productos fiados o abonos registrados.`;

    default:
      return "No se pudo eliminar. Inténtalo de nuevo.";
  }
}
