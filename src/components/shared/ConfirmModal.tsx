/* =============== Modal de confirmación reutilizable =============== */

import { useEffect } from "react";
import { Button } from "../ui/button";

interface ConfirmModalProps {
  title: string;
  message: string;
  confirmLabel: string;
  /** null = sin botón de cancelar (modal de solo aviso) */
  cancelLabel?: string | null;
  /** danger = botón rojo (acciones destructivas), primary = azul */
  confirmTone?: "danger" | "primary";
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmModal({
  title,
  message,
  confirmLabel,
  cancelLabel = "Cancelar",
  confirmTone = "danger",
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  // Escape cierra el modal, como espera cualquier usuario.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (cancelLabel === null) onConfirm();
      else onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [cancelLabel, onConfirm, onCancel]);

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-slate-950/60 p-4 backdrop-blur-sm"
      onClick={onCancel}
    >
      <div
        className="animate-in fade-in zoom-in-95 w-full max-w-md rounded-2xl border bg-card p-6 shadow-xl duration-150"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-semibold tracking-tight">{title}</h3>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          {message}
        </p>
        <div className="mt-5 flex justify-end gap-2.5">
          {cancelLabel !== null && (
            <Button variant="outline" type="button" onClick={onCancel}>
              {cancelLabel}
            </Button>
          )}
          <Button
            variant={confirmTone === "danger" ? "destructive" : "default"}
            type="button"
            onClick={onConfirm}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
