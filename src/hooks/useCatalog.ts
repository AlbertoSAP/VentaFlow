import { useEffect, useState } from "react";
import type { CatalogProduct } from "../domain/models";
import { catalogRepository } from "../data/firebaseRepositories";
import type { CatalogoRepository } from "../data/repositories";
import { uid } from "../services/identity";

/**
 * Catálogo de productos frecuentes del vendedor: lo que fía seguido,
 * para registrar un fiado con un toque en vez de escribirlo todo.
 */
export function useCatalog(
  vendorUid: string,
  repo: CatalogoRepository = catalogRepository,
) {
  const [products, setProducts] = useState<CatalogProduct[]>([]);

  useEffect(() => repo.subscribeCatalog(vendorUid, setProducts), [
    vendorUid,
    repo,
  ]);

  const addProduct = async (
    descripcion: string,
    precio: number,
  ): Promise<void> => {
    await repo.writeCatalogProduct(vendorUid, {
      id: uid(),
      descripcion,
      precio,
    });
  };

  const deleteProduct = async (productId: string): Promise<void> => {
    await repo.deleteCatalogProduct(vendorUid, productId);
  };

  return { products, addProduct, deleteProduct };
}
