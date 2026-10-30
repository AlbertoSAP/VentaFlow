/* Modelos del negocio. Sin lógica y sin imports: ninguna capa
 * inferior depende de este archivo y ninguna superior lo evita. */

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

export type EstadoVendedor = "pendiente" | "aprobado" | "rechazado";

export interface VendorConEstado extends Vendor {
  estado: EstadoVendedor;
}

export interface CatalogProduct {
  id: string;
  descripcion: string;
  precio: number;
}

export interface Movimiento {
  tipo: "pago" | "fiado";
  monto: number;
  fecha: number;
  desc?: string;
}
