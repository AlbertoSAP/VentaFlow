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
  email: string; // email de login (alias generado desde el teléfono)
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

/**
 * Dinero abonado por encima del total fiado: queda a favor del
 * cliente (pasa, por ejemplo, si se quitan productos ya abonados).
 */
export function saldoAFavor(c: Client): number {
  return Math.max(0, totalPagos(c) - totalItems(c));
}

// ---------- WhatsApp ----------

export interface Movimiento {
  tipo: "pago" | "fiado";
  monto: number;
  fecha: number;
  desc?: string;
}

/** Fiados y abonos mezclados, del más reciente al más antiguo */
export function ultimosMovimientos(c: Client, limite = 5): Movimiento[] {
  const movs: Movimiento[] = [
    ...(c.pagos || []).map((p) => ({
      tipo: "pago" as const,
      monto: p.monto,
      fecha: p.fecha,
    })),
    ...(c.items || []).map((it) => ({
      tipo: "fiado" as const,
      monto: it.precio * (it.cantidad || 1),
      fecha: it.fecha,
      desc: it.descripcion,
    })),
  ];
  return movs.sort((a, b) => b.fecha - a.fecha).slice(0, limite);
}

/** Teléfono en formato internacional para wa.me (Nicaragua: 505) */
export function whatsAppPhone(telephone: string): string {
  const digits = telephone.replace(/\D/g, "");
  return digits.length === 8 ? `505${digits}` : digits;
}

/** Enlace wa.me con el mensaje ya codificado */
export function whatsAppUrl(telephone: string, texto: string): string {
  return `https://wa.me/${whatsAppPhone(telephone)}?text=${encodeURIComponent(texto)}`;
}

/** Resumen de la cuenta, listo para enviar al cliente por WhatsApp */
export function mensajeEstadoCuenta(c: Client): string {
  const lines = [
    `Hola ${c.name}, te comparto tu estado de cuenta en VentaFlow:`,
    "",
    `Total fiado: ${fmtMoney(totalItems(c))}`,
    `Total abonado: ${fmtMoney(totalPagos(c))}`,
  ];
  if (saldoAFavor(c) > 0)
    lines.push(`Saldo a favor: ${fmtMoney(saldoAFavor(c))}`);
  lines.push(`Deuda actual: ${fmtMoney(deuda(c))}`);
  const movs = ultimosMovimientos(c);
  if (movs.length > 0) {
    lines.push("", "Últimos movimientos:");
    for (const m of movs)
      lines.push(
        m.tipo === "pago"
          ? `• ${fmtFecha(m.fecha)} — Abono: ${fmtMoney(m.monto)}`
          : `• ${fmtFecha(m.fecha)} — ${m.desc}: ${fmtMoney(m.monto)}`,
      );
  }
  return lines.join("\n");
}

/** Datos de acceso de un cliente recién creado, para enviárselos */
export function mensajeDatosAcceso(
  nombre: string,
  telephone: string,
  tempPassword: string,
): string {
  return [
    `Hola ${nombre}, ya tienes tu cuenta en VentaFlow para ver tu estado de cuenta:`,
    `Usuario: tu número de teléfono (${telephone})`,
    `Contraseña temporal: ${tempPassword}`,
    "Entrá con esos datos en la app. ¡Gracias!",
  ].join("\n");
}

// ---------- Vendedores ----------
export function writeVendorProfile(v: Vendor): Promise<void> {
  const { id, ...profile } = v;
  return set(ref(database, `vendedores/${id}`), profile);
}

// ---------- Aprobación de vendedores ----------
/**
 * Nadie entra a usar la app solo por registrarse: un administrador
 * debe aprobar su cuenta. El estado vive en un nodo APARTE
 * (`aprobaciones/{uid}`) que, según las reglas, solo un admin
 * puede escribir — así un vendedor no puede aprobarse a sí mismo
 * editando su propio perfil. Sin registro en ese nodo = pendiente.
 */
export type EstadoVendedor = "pendiente" | "aprobado" | "rechazado";

/** Estado de aprobación de un vendedor, en tiempo real */
export function subscribeEstadoVendedor(
  vendorUid: string,
  cb: (estado: EstadoVendedor) => void,
): Unsubscribe {
  return onValue(ref(database, `aprobaciones/${vendorUid}`), (snap) => {
    const val = snap.val() as { estado?: EstadoVendedor } | null;
    cb(val?.estado ?? "pendiente");
  });
}

/**
 * ¿Este usuario es administrador? El nodo `admins/{uid}` solo se
 * puede crear desde la consola de Firebase (las reglas bloquean
 * su escritura desde la app): es la llave maestra de aprobación.
 */
export async function getEsAdmin(uidAuth: string): Promise<boolean> {
  const snap = await get(ref(database, `admins/${uidAuth}`));
  return snap.val() === true;
}

export interface VendorConEstado extends Vendor {
  estado: EstadoVendedor;
}

/** Todos los vendedores con su estado (solo lo puede leer un admin) */
export function subscribeVendedoresAdmin(
  cb: (vendedores: VendorConEstado[]) => void,
): Unsubscribe {
  let perfiles: Record<
    string,
    { name?: string; email?: string; created?: number }
  > | null = null;
  let estados: Record<string, { estado?: EstadoVendedor }> | null = null;
  const emitir = () => {
    if (!perfiles || !estados) return;
    const perfilesOk = perfiles;
    const estadosOk = estados;
    cb(
      Object.entries(perfilesOk)
        .map(([id, v]) => ({
          id,
          name: v.name ?? "",
          email: v.email ?? "",
          created: v.created ?? 0,
          estado: estadosOk[id]?.estado ?? ("pendiente" as EstadoVendedor),
        }))
        .sort((a, b) => b.created - a.created),
    );
  };
  const off1 = onValue(ref(database, "vendedores"), (snap) => {
    perfiles =
      (snap.val() as Record<
        string,
        { name?: string; email?: string; created?: number }
      > | null) ?? {};
    emitir();
  });
  const off2 = onValue(ref(database, "aprobaciones"), (snap) => {
    estados =
      (snap.val() as Record<string, { estado?: EstadoVendedor }> | null) ??
      {};
    emitir();
  });
  return () => {
    off1();
    off2();
  };
}

/** Aprueba, rechaza o revoca a un vendedor (solo lo permite un admin) */
export function setEstadoVendedor(
  vendorUid: string,
  estado: EstadoVendedor,
): Promise<void> {
  return set(ref(database, `aprobaciones/${vendorUid}`), {
    estado,
    actualizado: Date.now(),
  });
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

// ---------- Catálogo de productos frecuentes ----------
/**
 * Productos que el vendedor fía seguido, para llenar el formulario
 * de fiado con un toque. Vive bajo el nodo del propio vendedor
 * (vendedores/{uid}/catalogo), así las reglas ya publicadas lo
 * cubren sin cambios: cada quien solo toca su propio nodo.
 */
export interface CatalogProduct {
  id: string;
  descripcion: string;
  precio: number;
}

/** Catálogo del vendedor en tiempo real, ordenado por descripción */
export function subscribeCatalog(
  vendorUid: string,
  cb: (products: CatalogProduct[]) => void,
): Unsubscribe {
  return onValue(ref(database, `vendedores/${vendorUid}/catalogo`), (snap) => {
    const val =
      (snap.val() as Record<
        string,
        { descripcion?: string; precio?: number }
      > | null) ?? {};
    cb(
      Object.entries(val)
        .map(([id, p]) => ({
          id,
          descripcion: p.descripcion ?? "",
          precio: p.precio ?? 0,
        }))
        .sort((a, b) => a.descripcion.localeCompare(b.descripcion)),
    );
  });
}

/** Crea o actualiza un producto del catálogo */
export function writeCatalogProduct(
  vendorUid: string,
  p: CatalogProduct,
): Promise<void> {
  return set(ref(database, `vendedores/${vendorUid}/catalogo/${p.id}`), {
    descripcion: p.descripcion,
    precio: p.precio,
  });
}

/** Quita un producto del catálogo (los fiados ya registrados no se tocan) */
export function deleteCatalogProduct(
  vendorUid: string,
  productId: string,
): Promise<void> {
  return remove(ref(database, `vendedores/${vendorUid}/catalogo/${productId}`));
}
