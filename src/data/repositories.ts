/* Puertos de datos (DIP). Los hooks dependen de estas interfaces,
 * no del SDK de Firebase: la única implementación vive en
 * firebaseRepositories.ts y las pruebas pueden inyectar otra.
 * Las firmas conservan los tipos y retornos que tenía storage.ts,
 * incluidas las funciones de cancelación de las suscripciones. */

import type {
  CatalogProduct,
  Client,
  EstadoVendedor,
  Rol,
  Vendor,
  VendorConEstado,
} from "@/domain/models";

export interface ClientesRepository {
  subscribeVendorClients(
    vendorUid: string,
    cb: (clients: Client[]) => void,
  ): () => void;
  subscribeOwnClient(
    clientUid: string,
    cb: (client: Client | null) => void,
  ): () => void;
  writeClient(client: Client): Promise<void>;
  writeClientIndex(clientUid: string, vendorUid: string): Promise<void>;
  deleteClientRecord(clientUid: string): Promise<void>;
}

export interface VendedoresRepository {
  writeVendorProfile(vendor: Vendor): Promise<void>;
  getUserRole(uidAuth: string): Promise<Rol | null>;
  getEsAdmin(uidAuth: string): Promise<boolean>;
}

export interface AprobacionesRepository {
  subscribeEstadoVendedor(
    vendorUid: string,
    cb: (estado: EstadoVendedor) => void,
  ): () => void;
  subscribeVendedoresAdmin(
    cb: (vendedores: VendorConEstado[]) => void,
  ): () => void;
  setEstadoVendedor(
    vendorUid: string,
    estado: EstadoVendedor,
  ): Promise<void>;
}

export interface CatalogoRepository {
  subscribeCatalog(
    vendorUid: string,
    cb: (products: CatalogProduct[]) => void,
  ): () => void;
  writeCatalogProduct(
    vendorUid: string,
    product: CatalogProduct,
  ): Promise<void>;
  deleteCatalogProduct(vendorUid: string, productId: string): Promise<void>;
}
