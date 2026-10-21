import React, { useState } from "react";
import {
  subscribeDB,
  writeDB,
  uid,
  fmtMoney,
  fmtFecha,
  totalItems,
  totalPagos,
  deuda,
  type DB,
  type Cliente,
} from "./../storage.ts";
export const useClient = () => {
  const [db, setDb] = useState<DB | null>(null);
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
  }) => {
    if (!name.trim()) return;

    upsert((dataBase) => {
      dataBase.clientes.unshift({
        name: name.trim(),
        telephone: telephone.trim(),
        created: Date.now(),
      });
      return dataBase;
    });
  };

  const deleteClient = (id: string, name: string) => {
    // antes de entrar a la confirmacion debe verificar si tiene registros
    // un cliente con registros no puede ser elimindao
    // un cliente sin registros puede ser eliminado
    if (!confirm(`¿Eliminar a ${name} y todo su registro?`)) return;
    upsert((dataBase) => {
      dataBase.clientes = dataBase.clientes.filter((c) => c.id !== id);
      return dataBase;
    });
  };

  return { createClient, deleteClient };
};
