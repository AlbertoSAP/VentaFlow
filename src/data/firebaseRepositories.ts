/* Única implementación de los repositorios (Firebase Realtime
 * Database). Es el único archivo de src/ —fuera de firebase.ts—
 * que importa firebase/database, y el único que conoce los nodos:
 * vendedores, clientes, clienteIndex, aprobaciones, admins y el
 * catálogo bajo vendedores/{uid}/catalogo. */

import {
  ref,
  onValue,
  set,
  get,
  remove,
  query,
  orderByChild,
  equalTo,
} from "firebase/database";
import { database } from "../firebase.ts";
import type { Client, EstadoVendedor } from "@/domain/models";
import type {
  AprobacionesRepository,
  CatalogoRepository,
  ClientesRepository,
  VendedoresRepository,
} from "./repositories";

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

export const clientsRepository: ClientesRepository = {
  /** Clientes de UN vendedor (consulta por idAuthVendedor) en tiempo real */
  subscribeVendorClients(vendorUid, cb) {
    const q = query(
      ref(database, "clientes"),
      orderByChild("idAuthVendedor"),
      equalTo(vendorUid),
    );
    return onValue(q, (snap) => {
      const val =
        (snap.val() as Record<string, Partial<ClientRecord>> | null) ?? {};
      cb(Object.entries(val).map(([id, r]) => toClient(id, r)));
    });
  },

  /** El registro de UN cliente (para su vista de solo lectura) en tiempo real */
  subscribeOwnClient(clientUid, cb) {
    return onValue(ref(database, `clientes/${clientUid}`), (snap) => {
      if (!snap.exists()) return cb(null);
      cb(toClient(clientUid, snap.val() as Partial<ClientRecord>));
    });
  },

  /** Crea o actualiza el registro completo de un cliente */
  writeClient(client) {
    const { id, ...record } = client;
    return set(ref(database, `clientes/${id}`), record);
  },

  /** Índice cliente -> vendedor, para ubicar el registro tras el login */
  writeClientIndex(clientUid, vendorUid) {
    return set(ref(database, `clienteIndex/${clientUid}`), vendorUid);
  },

  /** Elimina el registro del cliente y su índice (la cuenta Auth no se puede borrar sin Admin SDK) */
  async deleteClientRecord(clientUid) {
    await remove(ref(database, `clientes/${clientUid}`));
    await remove(ref(database, `clienteIndex/${clientUid}`));
  },
};

export const vendorsRepository: VendedoresRepository = {
  writeVendorProfile(v) {
    const { id, ...profile } = v;
    return set(ref(database, `vendedores/${id}`), profile);
  },

  /** Determina el rol de un UID: primero vendedor, si no, cliente */
  async getUserRole(uidAuth) {
    const vend = await get(ref(database, `vendedores/${uidAuth}`));
    if (vend.exists()) return "vendedor";
    const cli = await get(ref(database, `clientes/${uidAuth}`));
    if (cli.exists()) return "cliente";
    return null;
  },

  /**
   * ¿Este usuario es administrador? El nodo `admins/{uid}` solo se
   * puede crear desde la consola de Firebase (las reglas bloquean
   * su escritura desde la app): es la llave maestra de aprobación.
   */
  async getEsAdmin(uidAuth) {
    const snap = await get(ref(database, `admins/${uidAuth}`));
    return snap.val() === true;
  },
};

export const approvalsRepository: AprobacionesRepository = {
  /**
   * Nadie entra a usar la app solo por registrarse: un administrador
   * debe aprobar su cuenta. El estado vive en un nodo APARTE
   * (`aprobaciones/{uid}`) que, según las reglas, solo un admin
   * puede escribir — así un vendedor no puede aprobarse a sí mismo
   * editando su propio perfil. Sin registro en ese nodo = pendiente.
   */
  subscribeEstadoVendedor(vendorUid, cb) {
    return onValue(ref(database, `aprobaciones/${vendorUid}`), (snap) => {
      const val = snap.val() as { estado?: EstadoVendedor } | null;
      cb(val?.estado ?? "pendiente");
    });
  },

  /** Todos los vendedores con su estado (solo lo puede leer un admin) */
  subscribeVendedoresAdmin(cb) {
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
  },

  /** Aprueba, rechaza o revoca a un vendedor (solo lo permite un admin) */
  setEstadoVendedor(vendorUid, estado) {
    return set(ref(database, `aprobaciones/${vendorUid}`), {
      estado,
      actualizado: Date.now(),
    });
  },
};

export const catalogRepository: CatalogoRepository = {
  /**
   * Productos que el vendedor fía seguido, para llenar el formulario
   * de fiado con un toque. Vive bajo el nodo del propio vendedor
   * (vendedores/{uid}/catalogo), así las reglas ya publicadas lo
   * cubren sin cambios: cada quien solo toca su propio nodo.
   */
  subscribeCatalog(vendorUid, cb) {
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
  },

  /** Crea o actualiza un producto del catálogo */
  writeCatalogProduct(vendorUid, p) {
    return set(ref(database, `vendedores/${vendorUid}/catalogo/${p.id}`), {
      descripcion: p.descripcion,
      precio: p.precio,
    });
  },

  /** Quita un producto del catálogo (los fiados ya registrados no se tocan) */
  deleteCatalogProduct(vendorUid, productId) {
    return remove(
      ref(database, `vendedores/${vendorUid}/catalogo/${productId}`),
    );
  },
};
