import {
  ref,
  onValue,
  set,
  get,
  remove,
  query,
  orderByChild,
  equalTo,
  type Unsubscribe,
} from "firebase/database";
import { database } from "./firebase.ts";

// ---------- Tipos ----------
export interface FiadoItem {
  id: string;
  descripcion: string;
  precio: number;
  cantidad: number;
  fecha: number;
}

export interface Pago {
  id: string;
  monto: number;
  fecha: number;
}

export interface Vendor {
  id: string; // UID de Firebase Auth
  name: string;
  email: string;
  created: number;
}

export interface Client {
  id: string; // UID de Firebase Auth del cliente (es la clave del registro)
  idAuthVendedor: string; // UID del vendedor dueño de este cliente
  name: string;
  lastName: string;
  email: string; // email de login (generado desde el teléfono)
  telephone: string;
  created: number;
  items: FiadoItem[];
  pagos: Pago[];
}

export type Rol = "vendedor" | "cliente";

// ---------- Utilidades ----------
export const uid = (): string => Math.random().toString(36).slice(2, 10);

export const fullName = (c: Client): string =>
  `${c.name} ${c.lastName}`.trim();

/**
 * El cliente entra con su teléfono: internamente su cuenta de
 * Firebase Auth usa un email generado con ese número.
 * Ej: "8888 7777" -> "88887777@ventaflow.app"
 */
export const phoneToEmail = (telephone: string): string =>
  `${telephone.replace(/\D/g, "")}@ventaflow.app`;

/** Contraseña temporal para un cliente nuevo: se muestra una sola vez */
export function generateTempPassword(): string {
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  let out = "";
  for (let i = 0; i < 10; i++)
    out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

export const fmtMoney = (n: number): string =>
  "C$ " +
  Number(n || 0).toLocaleString("es-NI", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

export const fmtFecha = (ts: number): string =>
  new Date(ts).toLocaleDateString("es-NI", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

export function totalItems(c: Client): number {
  return (c.items || []).reduce(
    (s, it) => s + it.precio * (it.cantidad || 1),
    0,
  );
}

export function totalPagos(c: Client): number {
  return (c.pagos || []).reduce((s, p) => s + p.monto, 0);
}

export function deuda(c: Client): number {
  return Math.max(0, totalItems(c) - totalPagos(c));
}

// ---------- Vendedores ----------
export function writeVendorProfile(v: Vendor): Promise<void> {
  const { id, ...profile } = v;
  return set(ref(database, `vendedores/${id}`), profile);
}

// ---------- Roles ----------
/** Determina el rol de un UID: primero vendedor, si no, cliente */
export async function getUserRole(uidAuth: string): Promise<Rol | null> {
  const vend = await get(ref(database, `vendedores/${uidAuth}`));
  if (vend.exists()) return "vendedor";
  const cli = await get(ref(database, `clientes/${uidAuth}`));
  if (cli.exists()) return "cliente";
  return null;
}

// ---------- Clientes ----------
type ClientRecord = Omit<Client, "id">;

function toClient(id: string, r: Partial<ClientRecord>): Client {
  return {
    id,
    idAuthVendedor: r.idAuthVendedor ?? "",
    name: r.name ?? "",
    lastName: r.lastName ?? "",
    email: r.email ?? "",
    telephone: r.telephone ?? "",
    created: r.created ?? Date.now(),
    items: r.items ?? [],
    pagos: r.pagos ?? [],
  };
}

/** Clientes de UN vendedor (consulta por idAuthVendedor) en tiempo real */
export function subscribeVendorClients(
  vendorUid: string,
  cb: (clients: Client[]) => void,
): Unsubscribe {
  const q = query(
    ref(database, "clientes"),
    orderByChild("idAuthVendedor"),
    equalTo(vendorUid),
  );
  return onValue(q, (snap) => {
    const val = (snap.val() as Record<string, Partial<ClientRecord>> | null) ?? {};
    cb(Object.entries(val).map(([id, r]) => toClient(id, r)));
  });
}

/** El registro de UN cliente (para su vista de solo lectura) en tiempo real */
export function subscribeOwnClient(
  clientUid: string,
  cb: (client: Client | null) => void,
): Unsubscribe {
  return onValue(ref(database, `clientes/${clientUid}`), (snap) => {
    if (!snap.exists()) return cb(null);
    cb(toClient(clientUid, snap.val() as Partial<ClientRecord>));
  });
}

/** Crea o actualiza el registro completo de un cliente */
export function writeClient(client: Client): Promise<void> {
  const { id, ...record } = client;
  return set(ref(database, `clientes/${id}`), record);
}

/** Índice cliente -> vendedor, para ubicar el registro tras el login */
export function writeClientIndex(
  clientUid: string,
  vendorUid: string,
): Promise<void> {
  return set(ref(database, `clienteIndex/${clientUid}`), vendorUid);
}

/** Elimina el registro del cliente y su índice (la cuenta Auth no se puede borrar sin Admin SDK) */
export async function deleteClientRecord(clientUid: string): Promise<void> {
  await remove(ref(database, `clientes/${clientUid}`));
  await remove(ref(database, `clienteIndex/${clientUid}`));
}
