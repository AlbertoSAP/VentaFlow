import { AvisoOk } from "@/components/shared/AvisoOk";
import { ConfirmModal } from "@/components/shared/ConfirmModal";
import { ErrorMsg } from "@/components/shared/Errorhelper";
import { deudaCls, moneyCls, pagadoCls } from "@/components/shared/TotalBox";
import { Wrap } from "@/components/shared/Wrap";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  Client,
  deuda,
  fmtMoney,
  fullName,
  mensajeDatosAcceso,
  whatsAppUrl,
} from "@/storage";
import { iniciales } from "@/util/Initiales";
import { MessageCircle, Search } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";

interface CreadoInfo {
  nombre: string;
  telephone: string;
  tempPassword: string;
}

interface ListaProps {
  allClients: Client[];
  createClient: (input: {
    name: string;
    lastName: string;
    telephone: string;
  }) => Promise<
    | { ok: true; client: Client; tempPassword: string }
    | { ok: false; error: string }
  >;
  deleteClient: (id: string, name: string) => Promise<string | null>;
  busqueda: string;
  setBusqueda: (v: string) => void;
  clientes: Client[];
  totalPorCobrar: number;
  onAbrir: (id: string) => void;
}

export function ClientList({
  allClients,
  createClient,
  deleteClient,
  busqueda,
  setBusqueda,
  clientes,
  totalPorCobrar,
  onAbrir,
}: ListaProps) {
  const [name, setName] = useState("");
  const [lastName, setLastName] = useState("");
  const [telephone, setTelephone] = useState("");
  const [formError, setFormError] = useState("");
  const [busy, setBusy] = useState(false);
  const [creado, setCreado] = useState<CreadoInfo | null>(null);
  const [clienteAEliminar, setClienteAEliminar] = useState<Client | null>(null);
  const [avisoEliminar, setAvisoEliminar] = useState<Client | null>(null);
  const [aviso, setAviso] = useState("");

  useEffect(() => {
    if (!aviso) return;
    const t = setTimeout(() => setAviso(""), 4000);
    return () => clearTimeout(t);
  }, [aviso]);

  const agregar = async (e: FormEvent) => {
    e.preventDefault();
    setFormError("");
    setCreado(null);
    setBusy(true);
    const result = await createClient({ name, lastName, telephone });
    setBusy(false);
    if (!result.ok) {
      setFormError(result.error);
      return;
    }
    setCreado({
      nombre: fullName(result.client),
      telephone: result.client.telephone,
      tempPassword: result.tempPassword,
    });
    setName("");
    setLastName("");
    setTelephone("");
  };

  // Eliminar exige pasar por el modal: si el cliente tiene registros
  // se muestra el aviso de bloqueo; si no, la confirmación de borrado.
  const eliminar = (c: Client) => {
    const hasRecords = (c.items?.length ?? 0) > 0 || (c.pagos?.length ?? 0) > 0;
    if (hasRecords) setAvisoEliminar(c);
    else setClienteAEliminar(c);
  };

  const confirmarEliminar = async () => {
    if (!clienteAEliminar) return;
    const target = clienteAEliminar;
    setClienteAEliminar(null);
    const msg = await deleteClient(target.id, fullName(target));
    if (msg) alert(msg);
    else setAviso(`Cliente eliminado: ${fullName(target)}.`);
  };

  return (
    <Wrap>
      <div className="grid grid-cols-2 gap-4">
        <Card className="gap-1 p-5">
          <span className="text-sm text-muted-foreground">
            Total por cobrar
          </span>
          <strong className={cn("text-2xl font-bold", moneyCls, deudaCls)}>
            {fmtMoney(totalPorCobrar)}
          </strong>
        </Card>
        <Card className="gap-1 p-5">
          <span className="text-sm text-muted-foreground">
            Clientes con deuda
          </span>
          <strong className={cn("text-2xl font-bold", moneyCls)}>
            {allClients.filter((c) => deuda(c) > 0).length}
          </strong>
        </Card>
      </div>

      {aviso && <AvisoOk>{aviso}</AvisoOk>}

      <Card className="gap-4 p-6">
        <h3 className="text-base font-semibold tracking-tight">
          Agregar cliente
        </h3>
        <form className="flex flex-col gap-4" onSubmit={agregar}>
          <div className="flex flex-wrap gap-3">
            <Input
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
            <Button type="submit" disabled={busy}>
              {busy ? "Creando…" : "Agregar"}
            </Button>
          </div>
          <p className="text-xs leading-relaxed text-muted-foreground">
            Al agregarlo se crea también su cuenta: entrará con su teléfono y la
            contraseña temporal que se genera aquí.
          </p>
          {formError && <ErrorMsg>{formError}</ErrorMsg>}
          {creado && (
            <div className="flex flex-col gap-1 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3.5 text-sm text-emerald-900">
              <strong>✅ Cuenta creada para {creado.nombre}</strong>
              <span>
                Usuario: <b>{creado.telephone}</b> · Contraseña temporal:{" "}
                <b>{creado.tempPassword}</b>
              </span>
              <span className="text-xs">
                Entrégale estos datos ahora: la contraseña no se guarda y no se
                puede volver a ver.
              </span>
              <Button
                asChild
                variant="success"
                size="sm"
                className="mt-2 self-start"
              >
                <a
                  href={whatsAppUrl(
                    creado.telephone,
                    mensajeDatosAcceso(
                      creado.nombre,
                      creado.telephone,
                      creado.tempPassword,
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
        </form>
      </Card>

      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4.5 -translate-y-1/2 text-slate-400" />
        <Input
          className="bg-card pl-10.5"
          placeholder="Buscar cliente..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
        />
      </div>

      <div className="flex flex-col gap-3">
        {clientes.map((c) => {
          const d = deuda(c);
          return (
            <div
              className="group flex cursor-pointer items-center justify-between gap-3 rounded-xl border bg-card p-4 shadow-sm transition hover:border-primary/50 hover:shadow-md"
              key={c.id}
              onClick={() => onAbrir(c.id)}
            >
              <div className="flex min-w-0 items-center gap-3.5">
                <span className="grid size-11 shrink-0 place-items-center rounded-full bg-blue-50 text-sm font-bold text-primary">
                  {iniciales(fullName(c))}
                </span>
                <div className="min-w-0">
                  <strong className="block truncate">{fullName(c)}</strong>
                  <div className="text-xs text-muted-foreground">
                    {c.telephone ? `${c.telephone} · ` : ""}
                    {c.items?.length || 0} productos fiados
                  </div>
                </div>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1">
                <strong
                  className={cn(
                    "text-base font-bold",
                    moneyCls,
                    d > 0 ? deudaCls : pagadoCls,
                  )}
                >
                  {fmtMoney(d)}
                </strong>
                <span className="flex items-center gap-2">
                  <Badge variant={d > 0 ? "danger" : "success"}>
                    {d > 0 ? "Con deuda" : "Al día"}
                  </Badge>
                  <button
                    className="py-0.5 text-xs font-medium text-red-600 underline-offset-2 hover:underline"
                    onClick={(e) => {
                      e.stopPropagation();
                      eliminar(c);
                    }}
                  >
                    eliminar
                  </button>
                </span>
              </div>
            </div>
          );
        })}
        {clientes.length === 0 && (
          <p className="py-10 text-center text-sm text-muted-foreground">
            {allClients.length === 0
              ? "Todavía no tienes clientes. Agrega el primero con el formulario de arriba: solo necesitas su nombre y su número de teléfono."
              : "Ningún cliente coincide con tu búsqueda. Prueba con otro nombre."}
          </p>
        )}
      </div>

      {avisoEliminar && (
        <ConfirmModal
          title="No se puede eliminar"
          message={`${fullName(avisoEliminar)} tiene productos fiados o abonos registrados. Un cliente con registros no puede ser eliminado.`}
          confirmLabel="Entendido"
          cancelLabel={null}
          confirmTone="primary"
          onConfirm={() => setAvisoEliminar(null)}
          onCancel={() => setAvisoEliminar(null)}
        />
      )}

      {clienteAEliminar && (
        <ConfirmModal
          title={`¿Eliminar a ${fullName(clienteAEliminar)}?`}
          message="Se eliminará su registro y su cuenta quedará sin acceso a la app. Esta acción no se puede deshacer."
          confirmLabel="Sí, eliminar"
          onConfirm={() => void confirmarEliminar()}
          onCancel={() => setClienteAEliminar(null)}
        />
      )}
    </Wrap>
  );
}
