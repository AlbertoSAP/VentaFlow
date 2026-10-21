import { useEffect, useState } from "react";
import { subscribeDB, writeDB, uid, type DB } from "./../storage.ts";

/**
 * Fuente única de estado para clientes.
 * Se suscribe a Firebase, expone `db` y `upsert` para el resto
 * de la app (detalle, dashboard) y las operaciones de cliente:
 * crear y eliminar.
 */
export const useClient = () => {
  const [db, setDb] = useState<DB | null>(null);

  useEffect(() => subscribeDB(setDb), []);

  const upsert = (fn: (d: DB) => DB) => {
    setDb((prev) => {
      if (!prev) return prev;

      const next = fn(structuredClone(prev));
      writeDB(next);

      return next;
    });
  };

  const createClient = ({
    name,
    telephone,
  }: {
    name: string;
    telephone: string;
  }): boolean => {
    if (!name.trim()) return false;

    upsert((dataBase) => {
      dataBase.clientes.unshift({
        id: uid(),
        name: name.trim(),
        telephone: telephone.trim(),
        created: Date.now(),
        items: [],
        pagos: [],
      });
      return dataBase;
    });

    return true;
  };

  const deleteClient = (id: string, name: string) => {
    // Antes de la confirmación se verifica si tiene registros:
    // un cliente con registros NO puede ser eliminado,
    // un cliente sin registros sí puede ser eliminado.
    const client = db?.clientes.find((c) => c.id === id);
    if (!client) return;

    const hasRecords =
      (client.items?.length ?? 0) > 0 || (client.pagos?.length ?? 0) > 0;

    if (hasRecords) {
      alert(
        `No se puede eliminar a ${name}: tiene productos fiados o abonos registrados.`,
      );
      return;
    }

    if (!confirm(`¿Eliminar a ${name}?`)) return;

    upsert((dataBase) => {
      dataBase.clientes = dataBase.clientes.filter((c) => c.id !== id);
      return dataBase;
    });
  };

  return { db, upsert, createClient, deleteClient };
};
