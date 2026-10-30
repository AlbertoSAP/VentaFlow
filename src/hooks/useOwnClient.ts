/* El registro del cliente que inició sesión, en vivo. Antes
 * ClientApp importaba subscribeOwnClient directo desde storage;
 * ahora lo hace a través de este hook, como el resto de datos. */

import { useEffect, useState } from "react";
import type { Client } from "../domain/models";
import { clientsRepository } from "../data/firebaseRepositories";
import type { ClientesRepository } from "../data/repositories";

export function useOwnClient(
  clientUid: string,
  repo: ClientesRepository = clientsRepository,
) {
  const [cliente, setCliente] = useState<Client | null | undefined>(undefined);

  useEffect(
    () => repo.subscribeOwnClient(clientUid, setCliente),
    [clientUid, repo],
  );

  return cliente;
}
