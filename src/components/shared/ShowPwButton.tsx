import { Button } from "../ui/button";

export function ShowPwButton({
  show,
  onToggle,
}: {
  show: boolean;
  onToggle: () => void;
}) {
  return (
    <Button
      type="button"
      variant="link"
      size="sm"
      className="h-auto self-end px-0 py-0.5"
      onClick={onToggle}
    >
      {show ? "Ocultar contraseña" : "Mostrar contraseña"}
    </Button>
  );
}
