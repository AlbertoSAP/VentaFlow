import { useEffect, useState } from "react";
import {
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  type User,
} from "firebase/auth";
import { auth } from "../firebase.ts";
import {
  getUserRole,
  writeVendorProfile,
  generateEmailAlias,
  type Rol,
} from "../storage.ts";

export function mapAuthError(e: unknown): string {
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

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<Rol | null>(null);
  const [resolving, setResolving] = useState(true);

  useEffect(() => {
    let cancelled = false;
    return onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (!u) {
        setRole(null);
        setResolving(false);
        return;
      }
      setResolving(true);
      let r = await getUserRole(u.uid);
      // Al registrarse, el perfil puede tardar un instante en escribirse:
      // se reintenta una vez antes de concluir que no hay rol.
      if (!r && !cancelled) {
        await new Promise((res) => setTimeout(res, 900));
        r = await getUserRole(u.uid);
      }
      if (!cancelled) {
        setRole(r);
        setResolving(false);
      }
    });
  }, []);

  /** Registro de vendedor: crea la cuenta Auth y su perfil en `vendedores/{uid}` */
  const registerVendor = async (
    name: string,
    email: string,
    password: string,
  ) => {
    const cred = await createUserWithEmailAndPassword(
      auth,
      email.trim(),
      password,
    );
    await writeVendorProfile({
      id: cred.user.uid,
      name: name.trim(),
      email: email.trim(),
      created: Date.now(),
    });
    setRole("vendedor");
  };

  const loginVendor = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email.trim(), password);
  };

  /** El cliente entra con su número de teléfono y su contraseña */
  const loginClient = async (telephone: string, password: string) => {
    await signInWithEmailAndPassword(auth, generateEmailAlias(telephone), password);
  };

  const logout = async () => {
    await signOut(auth);
  };

  return { user, role, resolving, registerVendor, loginVendor, loginClient, logout };
};
