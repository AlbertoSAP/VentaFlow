/* ============ Pantalla de acceso del CLIENTE (/cliente) ============ */
/* Solo su formulario: aquí no existe registro ni acceso de vendedor. */

import { ErrorMsg } from "@/components/shared/Errorhelper";
import { ShowPwButton } from "@/components/shared/ShowPwButton";
import { Topbar } from "@/components/shared/Topbar";
import { Wrap } from "@/components/shared/Wrap";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { mapAuthError } from "@/hooks/useAuth";
import { FormEvent, useState } from "react";

interface ClientAuthProps {
  onLoginClient: (telephone: string, password: string) => Promise<void>;
  onIrVendedor: () => void;
}

export function ClientAuthScreen({
  onLoginClient,
  onIrVendedor,
}: ClientAuthProps) {
  const [telephone, setTelephone] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await onLoginClient(telephone, password);
    } catch (err) {
      setError(mapAuthError(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen">
      <Topbar onLogoPress={onIrVendedor} />

      <Wrap narrow>
        <div className="pt-2 text-center">
          <h2 className="text-2xl font-bold tracking-tight">
            Consulta tu estado de cuenta
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Entrá con el número de teléfono que te registró tu vendedor y la
            contraseña que te entregó.
          </p>
        </div>

        <Card className="gap-5 p-6">
          <form className="flex flex-col gap-4" onSubmit={submit}>
            <Input
              placeholder="Tu número de teléfono *"
              inputMode="tel"
              autoComplete="tel"
              value={telephone}
              onChange={(e) => setTelephone(e.target.value)}
            />
            <Input
              type={showPw ? "text" : "password"}
              placeholder="Contraseña *"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <ShowPwButton show={showPw} onToggle={() => setShowPw(!showPw)} />

            {error && <ErrorMsg>{error}</ErrorMsg>}

            <Button className="w-full" type="submit" disabled={busy}>
              {busy ? "Espera…" : "Entrar"}
            </Button>
          </form>
        </Card>
      </Wrap>
    </div>
  );
}
