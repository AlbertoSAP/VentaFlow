/* ============ Pantalla de acceso del VENDEDOR (/vendedor) ============ */

import { Button } from "@/components/ui/button";
import { ErrorMsg } from "@/components/shared/Errorhelper";
import { Input } from "@/components/ui/input";
import { ShowPwButton } from "@/components/shared/ShowPwButton";
import { FormEvent, useState } from "react";
import { mapAuthError } from "@/hooks/useAuth";
import { Topbar } from "@/components/shared/Topbar";
import { Wrap } from "@/components/shared/Wrap";
import { Card } from "@/components/ui/card";
import { Seg } from "@/components/shared/Seg";
import { segBtnCls } from "@/components/shared/SegBtnCls";

interface VendorAuthProps {
  onLoginVendor: (email: string, password: string) => Promise<void>;
  onRegisterVendor: (
    name: string,
    email: string,
    password: string,
  ) => Promise<void>;
}

export function VendorAuthScreen({
  onLoginVendor,
  onRegisterVendor,
}: VendorAuthProps) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      if (mode === "register") {
        await onRegisterVendor(name, email, password);
      } else {
        await onLoginVendor(email, password);
      }
    } catch (err) {
      setError(mapAuthError(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen">
      <Topbar />

      <Wrap narrow>
        <div className="pt-2 text-center">
          <h2 className="text-2xl font-bold tracking-tight">
            Lleva tus fiados sin papel 📒
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Apunta quién te debe, cuánto te debe y qué ya te pagó. Tu cliente
            puede ver su cuenta entrando con su número de teléfono.
          </p>
        </div>

        <Card className="gap-5 p-6">
          <Seg>
            <button
              type="button"
              className={segBtnCls(mode === "login")}
              onClick={() => setMode("login")}
            >
              Iniciar sesión
            </button>
            <button
              type="button"
              className={segBtnCls(mode === "register")}
              onClick={() => setMode("register")}
            >
              Crear cuenta de vendedor
            </button>
          </Seg>

          <form className="flex flex-col gap-4" onSubmit={submit}>
            {mode === "register" && (
              <Input
                placeholder="Tu nombre *"
                autoComplete="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            )}
            <Input
              type="email"
              placeholder="Tu correo *"
              autoComplete="email"
              inputMode="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <Input
              type={showPw ? "text" : "password"}
              placeholder={
                mode === "register"
                  ? "Contraseña (mín. 6 caracteres) *"
                  : "Contraseña *"
              }
              autoComplete={
                mode === "register" ? "new-password" : "current-password"
              }
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <ShowPwButton show={showPw} onToggle={() => setShowPw(!showPw)} />
            {mode === "register" && (
              <p className="text-xs leading-relaxed text-muted-foreground">
                El registro es solo para vendedores. Las cuentas de cliente las
                crea su vendedor desde la app.
              </p>
            )}

            {error && <ErrorMsg>{error}</ErrorMsg>}

            <Button className="w-full" type="submit" disabled={busy}>
              {busy
                ? "Espera…"
                : mode === "register"
                  ? "Crear mi cuenta"
                  : "Entrar"}
            </Button>
          </form>
        </Card>
      </Wrap>
    </div>
  );
}
