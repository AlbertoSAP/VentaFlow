import { EstadoVendedor, VendorConEstado } from "@/storage";

export const filterForIdAndState = ({
  state,
  Salespeople,
  miUid,
}: {
  state: EstadoVendedor;
  Salespeople: VendorConEstado[];
  miUid: string;
}) => {
  return Salespeople.filter(
    ({ id, estado }) => estado === state && id !== miUid,
  );
};
