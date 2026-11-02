/* =============== Modal para registrar un abono =============== */

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { FormEvent, useEffect, useRef, useState } from "react";

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
  const inputRef = useRef<HTMLInputElement>(null);

  // El monto recibe foco al abrir, para que el teclado abra de una vez.
  // Va en efecto: corre después del manejo de foco de Radix, así el
  // cursor queda en el monto y no en el contenido del diálogo.
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const m = parseFloat(monto);
    if (isNaN(m) || m <= 0) return;
    onConfirm(m);
  };

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onCancel();
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Registrar abono</DialogTitle>
          <DialogDescription>
            El abono se suma a la cuenta y actualiza la deuda.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit}>
          <div className="flex flex-wrap gap-3">
            <Input
              ref={inputRef}
              className="w-[150px] flex-none"
              type="number"
              min="0"
              step="0.01"
              placeholder="Monto del abono"
              value={monto}
              onChange={(e) => setMonto(e.target.value)}
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
      </DialogContent>
    </Dialog>
  );
}
