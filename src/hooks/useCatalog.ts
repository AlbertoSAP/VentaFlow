import { useEffect, useState } from "react";
import {
  uid,
  subscribeCatalog,
  writeCatalogProduct,
  deleteCatalogProduct,
  type CatalogProduct,
} from "../storage.ts";

/**
 * Catálogo de productos frecuentes del vendedor: lo que fía seguido,
 * para registrar un fiado con un toque en vez de escribirlo todo.
 */
export function useCatalog(vendorUid: string) {
  const [products, setProducts] = useState<CatalogProduct[]>([]);

  useEffect(
    () => subscribeCatalog(vendorUid, setProducts),
    [vendorUid],
  );

  const addProduct = async (
    descripcion: string,
    precio: number,
  ): Promise<void> => {
    await writeCatalogProduct(vendorUid, {
      id: uid(),
      descripcion,
      precio,
    });
  };

  const deleteProduct = async (productId: string): Promise<void> => {
    await deleteCatalogProduct(vendorUid, productId);
  };

  return { products, addProduct, deleteProduct };
}
