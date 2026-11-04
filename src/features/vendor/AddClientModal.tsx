/* =============== Modal to add a client =============== */

import { ErrorMsg } from "@/components/shared/Errorhelper";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import type { Client } from "@/domain/models";
import { useClientCalculations } from "@/hooks/useClientCalculations";
import { useIdentity } from "@/hooks/useIdentity";
import { useWhatsApp } from "@/hooks/useWhatsApp";
import { MessageCircle } from "lucide-react";
import { FormEvent, useEffect, useRef, useState } from "react";

interface CreatedInfo {
  nombre: string;
  telephone: string;
  tempPassword: string;
}

export interface CreateClientInput {
  name: string;
  lastName: string;
  telephone: string;
}

export type CreateClientResult =
  | { ok: true; client: Client; tempPassword: string }
  | { ok: false; error: string };

interface AddClientModalProps {
  onCreate: (input: CreateClientInput) => Promise<CreateClientResult>;
  onCancel: () => void;
}

export function AddClientModal({ onCreate, onCancel }: AddClientModalProps) {
  const [name, setName] = useState("");
  const [lastName, setLastName] = useState("");
  const [telephone, setTelephone] = useState("");
  const [formError, setFormError] = useState("");
  const [busy, setBusy] = useState(false);
  const [created, setCreated] = useState<CreatedInfo | null>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const { fullName } = useClientCalculations();
  const { telephoneError } = useIdentity();
  const { mensajeDatosAcceso, whatsAppUrl } = useWhatsApp();

  // The name input gets focus on open, so the keyboard opens at once.
  // It goes in an effect: it runs after Radix's focus handling, so the
  // cursor lands on the name, not on the dialog content.
  useEffect(() => {
    nameRef.current?.focus();
  }, []);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setFormError("");
    setCreated(null);
    setBusy(true);
    try {
      const result = await onCreate({ name, lastName, telephone });
      if (!result.ok) {
        setFormError(result.error);
        return;
      }
      setCreated({
        nombre: fullName(result.client),
        telephone: result.client.telephone,
        tempPassword: result.tempPassword,
      });
      setName("");
      setLastName("");
      setTelephone("");
    } catch {
      // onCreate should not throw, but if it did the button
      // cannot stay stuck on "Creando…" without a message.
      setFormError("No se pudo crear el cliente. Inténtalo de nuevo.");
    } finally {
      setBusy(false);
    }
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
          <DialogTitle>Agregar cliente</DialogTitle>
          <DialogDescription>
            Se crea también su cuenta: entrará con su teléfono y la
            contraseña temporal que se genera aquí.
          </DialogDescription>
        </DialogHeader>
        <form className="flex flex-col gap-4" onSubmit={submit}>
          <div className="flex flex-wrap gap-3">
            <Input
              ref={nameRef}
              className="min-w-36 flex-1"
              placeholder="Nombre *"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <Input
              className="min-w-36 flex-1"
              placeholder="Apellido"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
            />
          </div>
          <div className="flex flex-wrap gap-3">
            <Input
              className="min-w-52 flex-1"
              placeholder="Teléfono (será su usuario para entrar) *"
              inputMode="tel"
              autoComplete="tel"
              value={telephone}
              onChange={(e) => setTelephone(e.target.value)}
            />
          </div>
          {formError && <ErrorMsg>{formError}</ErrorMsg>}
          {created && (
            <div className="flex flex-col gap-1 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3.5 text-sm text-emerald-900">
              <strong>✅ Cuenta creada para {created.nombre}</strong>
              <span>
                Usuario: <b>{created.telephone}</b> · Contraseña temporal:{" "}
                <b>{created.tempPassword}</b>
              </span>
              <span className="text-xs">
                Entrégale estos datos ahora: la contraseña no se guarda y no se
                puede volver a ver.
              </span>
              <Button
                asChild
                variant="outline"
                size="sm"
                className="mt-2 self-start"
              >
                <a
                  href={whatsAppUrl(
                    created.telephone,
                    mensajeDatosAcceso(
                      created.nombre,
                      created.telephone,
                      created.tempPassword,
                    ),
                  )}
                  target="_blank"
                  rel="noreferrer"
                >
                  <MessageCircle /> Enviar datos por WhatsApp
                </a>
              </Button>
            </div>
          )}
          <div className="flex flex-wrap items-center justify-end gap-2.5">
            <Button variant="outline" type="button" onClick={onCancel}>
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={busy || telephoneError(telephone) !== null}
            >
              {busy ? "Creando…" : "Agregar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
