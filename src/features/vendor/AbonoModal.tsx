/* =============== Modal para registrar un abono =============== */

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormEvent, useEffect, useState } from "react";

interface AbonoModalProps {
  deuda: number;
  onConfirm: (monto: number) => void;
  /** Pide saldar: el padre cierra este modal y abre el de confirmación. */
  onSaldar: () => void;
  onCancel: () => void;
}

const MONTOS_RAPIDOS = [50, 100, 200, 500];

export function AbonoModal({
  deuda,
  onConfirm,
  onSaldar,
  onCancel,
}: AbonoModalProps) {
  const [monto, setMonto] = useState("");

  // Escape cierra el modal, igual que ConfirmModal.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel]);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const m = parseFloat(monto);
    if (isNaN(m) || m <= 0) return;
    onConfirm(m);
  };

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-slate-950/60 p-4 backdrop-blur-sm"
      onClick={onCancel}
    >
      <div
        className="animate-in fade-in zoom-in-95 w-full max-w-md rounded-2xl border bg-card p-6 shadow-xl duration-150"
        role="dialog"
        aria-modal="true"
        aria-label="Registrar abono"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-semibold tracking-tight">
          Registrar abono
        </h3>
        <form onSubmit={submit}>
          <div className="mt-4 flex flex-wrap gap-3">
            <Input
              className="w-[150px] flex-none"
              type="number"
              min="0"
              step="0.01"
              placeholder="Monto del abono"
              value={monto}
              onChange={(e) => setMonto(e.target.value)}
              autoFocus
            />
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="text-xs text-muted-foreground">
              Montos rápidos:
            </span>
            {MONTOS_RAPIDOS.map((v) => (
              <Button
                key={v}
                type="button"
                variant="outline"
                size="sm"
                className="rounded-full px-4"
                onClick={() => setMonto(String(v))}
              >
                C$ {v}
              </Button>
            ))}
          </div>
          <div className="mt-5 flex flex-wrap items-center justify-between gap-2.5">
            <Button
              variant="outline"
              type="button"
              disabled={deuda <= 0}
              onClick={onSaldar}
            >
              Saldar todo
            </Button>
            <div className="flex gap-2.5">
              <Button variant="outline" type="button" onClick={onCancel}>
                Cancelar
              </Button>
              <Button
                variant="success"
                type="submit"
                disabled={!(parseFloat(monto) > 0)}
              >
                Abonar
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
