/* =============== Modal to register a payment =============== */

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

interface PaymentModalProps {
  debt: number;
  onConfirm: (amount: number) => void;
  /** Requests settling in full: the parent closes this modal and opens the confirmation one. */
  onSettleAll: () => void;
  onCancel: () => void;
}

const QUICK_AMOUNTS = [50, 100, 200, 500];

export function PaymentModal({
  debt,
  onConfirm,
  onSettleAll,
  onCancel,
}: PaymentModalProps) {
  const [amount, setAmount] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // The amount input gets focus on open, so the keyboard opens at once.
  // It goes in an effect: it runs after Radix's focus handling, so the
  // cursor lands on the amount, not on the dialog content.
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const parsed = parseFloat(amount);
    if (isNaN(parsed) || parsed <= 0) return;
    onConfirm(parsed);
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
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="text-xs text-muted-foreground">
              Montos rápidos:
            </span>
            {QUICK_AMOUNTS.map((v) => (
              <Button
                key={v}
                type="button"
                variant="outline"
                size="sm"
                className="rounded-full px-4"
                onClick={() => setAmount(String(v))}
              >
                C$ {v}
              </Button>
            ))}
          </div>
          <div className="mt-5 flex flex-wrap items-center justify-between gap-2.5">
            <Button
              variant="outline"
              type="button"
              disabled={debt <= 0}
              onClick={onSettleAll}
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
                disabled={!(parseFloat(amount) > 0)}
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
