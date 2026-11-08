import { mapAuthErrors, mapCreateClientError, mapErrors } from "@/lib/mapErros";

export const useError = () => {
  const getError = ({
    variant,
    error,
    name,
    value,
  }: {
    variant: "AuthErrors" | "CreateClientErrors" | "RemoveClientErrors";
    name?: string;
    error?: unknown;
    value?: "noRemove" | "faildRemove";
  }): string => {
    switch (variant) {
      case "AuthErrors":
        return mapAuthErrors(error);
      case "CreateClientErrors":
        return mapCreateClientError(error);
      default:
        return mapErrors({ value: value ?? "faildRemove", name });
    }
  };

  return { getError };
};
