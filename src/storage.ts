import { ref, onValue, set, type Unsubscribe } from "firebase/database";
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

export interface Client {
  id: string;
  name: string;
  telephone: string;
  created: number;
  items: FiadoItem[];
  pagos: Pago[];
}

export interface DB {
  clientes: Client[];
}

// ---------- Normalización (datos legacy en español) ----------
// Antes del refactor los clientes se guardaban como
// { nombre, telefono, creado }. Al leerlos se convierten al
// modelo en inglés para no perder ningún dato ya guardado;
// al escribir, ya quedan persistidos con el esquema nuevo.
interface LegacyClient {
  id?: string;
  name?: string;
  nombre?: string;
  telephone?: string;
  telefono?: string;
  created?: number;
  creado?: number;
  items?: FiadoItem[];
  pagos?: Pago[];
}

function normalizeClient(raw: LegacyClient): Client {
  return {
    id: raw.id ?? uid(),
    name: raw.name ?? raw.nombre ?? "",
    telephone: raw.telephone ?? raw.telefono ?? "",
    created: raw.created ?? raw.creado ?? Date.now(),
    items: raw.items ?? [],
    pagos: raw.pagos ?? [],
  };
}

function normalizeDB(raw: { clientes?: LegacyClient[] | Record<string, LegacyClient> } | null): DB {
  if (!raw?.clientes) return { clientes: [] };
  // Firebase puede devolver la lista como arreglo o como objeto.
  const list = Array.isArray(raw.clientes)
    ? raw.clientes
    : Object.values(raw.clientes);
  return { clientes: list.map(normalizeClient) };
}

// ---------- Firebase Realtime Database ----------
const PATH = "fiados";

/** Suscripción en tiempo real: llama a `cb` con los datos cada vez que cambian */
export function subscribeDB(cb: (db: DB) => void): Unsubscribe {
  const r = ref(database, PATH);
  return onValue(r, (snap) => {
    cb(normalizeDB(snap.val() as { clientes?: LegacyClient[] } | null));
  });
}

/** Escribe todo el estado en Firebase */
export function writeDB(db: DB): Promise<void> {
  return set(ref(database, PATH), db);
}

// ---------- Utilidades ----------
export const uid = (): string => Math.random().toString(36).slice(2, 10);

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
