import { useEffect, useState } from "react";
import { initializeApp, deleteApp } from "firebase/app";
import {
  getAuth,
  createUserWithEmailAndPassword,
  deleteUser,
  signOut,
} from "firebase/auth";
import { firebaseConfig } from "../firebase.ts";
import {
  subscribeVendorClients,
  writeClient,
  writeClientIndex,
  deleteClientRecord,
  phoneToEmail,
  generateTempPassword,
  type Client,
} from "../storage.ts";

export type CreateClientResult =
  | { ok: true; client: Client; tempPassword: string }
  | { ok: false; error: string };

function mapCreateError(e: unknown): string {
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

/**
 * Clientes de un vendedor.
 * Al crear un cliente también se le crea su cuenta en Firebase Auth
 * usando una APP SECUNDARIA: así la sesión del vendedor no se cierra
 * (createUserWithEmailAndPassword inicia sesión como el usuario nuevo
 * en la app donde se llama).
 */
export const useClient = (vendorUid: string) => {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!vendorUid) return;
    setLoading(true);
    return subscribeVendorClients(vendorUid, (list) => {
      setClients(list);
      setLoading(false);
    });
  }, [vendorUid]);

  const createClient = async ({
    name,
    lastName,
    telephone,
  }: {
    name: string;
    lastName: string;
    telephone: string;
  }): Promise<CreateClientResult> => {
    if (!name.trim()) return { ok: false, error: "El nombre es obligatorio." };
    if (telephone.replace(/\D/g, "").length < 8)
      return {
        ok: false,
        error: "El teléfono debe tener al menos 8 dígitos: será el usuario del cliente para entrar.",
      };

    const email = phoneToEmail(telephone);
    const tempPassword = generateTempPassword();

    const secondaryApp = initializeApp(firebaseConfig, "Secondary");
    const secondaryAuth = getAuth(secondaryApp);

    try {
      const cred = await createUserWithEmailAndPassword(
        secondaryAuth,
        email,
        tempPassword,
      );

      const client: Client = {
        id: cred.user.uid,
        idAuthVendedor: vendorUid,
        name: name.trim(),
        lastName: lastName.trim(),
        email,
        telephone: telephone.trim(),
        created: Date.now(),
        items: [],
        pagos: [],
      };

      try {
        await writeClient(client);
        await writeClientIndex(client.id, vendorUid);
      } catch (dbError) {
        // Compensación: si el registro no se pudo guardar, se borra la
        // cuenta Auth recién creada para no dejar cuentas huérfanas.
        try {
          await deleteUser(cred.user);
        } catch {
          // si también falla, la cuenta queda sin registro y sin acceso útil
        }
        throw dbError;
      }

      return { ok: true, client, tempPassword };
    } catch (e) {
      return { ok: false, error: mapCreateError(e) };
    } finally {
      try {
        await signOut(secondaryAuth);
      } catch {
        // la sesión secundaria puede ya no existir
      }
      await deleteApp(secondaryApp);
    }
  };

  const deleteClient = async (
    id: string,
    name: string,
  ): Promise<string | null> => {
    // Antes de la confirmación se verifica si tiene registros:
    // un cliente con registros NO puede ser eliminado,
    // un cliente sin registros sí puede ser eliminado.
    const client = clients.find((c) => c.id === id);
    if (!client) return "Cliente no encontrado.";

    const hasRecords =
      (client.items?.length ?? 0) > 0 || (client.pagos?.length ?? 0) > 0;

    if (hasRecords)
      return `No se puede eliminar a ${name}: tiene productos fiados o abonos registrados.`;

    if (!confirm(`¿Eliminar a ${name}?`)) return null;

    try {
      await deleteClientRecord(id);
      return null;
    } catch {
      return "No se pudo eliminar. Inténtalo de nuevo.";
    }
  };

  /** Guarda el registro completo de un cliente (fiados, abonos, etc.) */
  const saveClient = async (client: Client): Promise<void> => {
    await writeClient(client);
  };

  return { clients, loading, createClient, deleteClient, saveClient };
};
