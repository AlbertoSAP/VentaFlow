import { SuccessNotice } from "@/components/shared/SuccessNotice";
import { ConfirmModal } from "@/components/shared/ConfirmModal";
import { moneyCls, pagadoCls, TotalBox } from "@/components/shared/TotalBox";
import { Totals } from "@/components/shared/Totals";
import { Wrap } from "@/components/shared/Wrap";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  CatalogProduct,
  Client,
  deuda,
  FiadoItem,
  fmtFecha,
  fmtMoney,
  fullName,
  mensajeEstadoCuenta,
  totalItems,
  totalPagos,
  uid,
  whatsAppUrl,
} from "@/storage";
import { MessageCircle } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";

interface DetalleProps {
  onSave: (c: Client) => Promise<void>;
  cliente: Client | undefined;
  onVolver: () => void;
  catalogo: CatalogProduct[];
  onAddFrecuente: (descripcion: string, precio: number) => Promise<void>;
  onDeleteFrecuente: (productId: string) => Promise<void>;
}

export function ClientDetails({
  onSave,
  cliente,
  catalogo,
  onAddFrecuente,
  onDeleteFrecuente,
}: DetalleProps) {
  const [desc, setDesc] = useState("");
  const [precio, setPrecio] = useState("");
  const [cantidad, setCantidad] = useState("1");
  const [montoPago, setMontoPago] = useState("");
  const [itemAQuitar, setItemAQuitar] = useState<FiadoItem | null>(null);
  const [confirmarSaldar, setConfirmarSaldar] = useState(false);
  const [aviso, setAviso] = useState("");
  const [editandoFrecuentes, setEditandoFrecuentes] = useState(false);
  const [frecDesc, setFrecDesc] = useState("");
  const [frecPrecio, setFrecPrecio] = useState("");
  const [frecuenteAQuitar, setFrecuenteAQuitar] =
    useState<CatalogProduct | null>(null);

  // El aviso de "guardado" se quita solo a los pocos segundos.
  useEffect(() => {
    if (!aviso) return;
    const t = setTimeout(() => setAviso(""), 4000);
    return () => clearTimeout(t);
  }, [aviso]);

  if (!cliente)
    return (
      <Wrap>
        <p className="py-16 text-center text-muted-foreground">
          Cliente no encontrado.
        </p>
      </Wrap>
    );

  const d = deuda(cliente);

  // Si al quitar el producto los abonos superan el fiado restante,
  // queda un saldo a favor: el modal lo advierte antes de confirmar.
  const saldoTrasQuitar = itemAQuitar
    ? totalPagos(cliente) -
      (totalItems(cliente) - itemAQuitar.precio * (itemAQuitar.cantidad || 1))
    : 0;

  const guardar = (mutate: (c: Client) => void) => {
    const next = structuredClone(cliente);
    mutate(next);
    void onSave(next);
  };

  const agregarItem = (e: FormEvent) => {
    e.preventDefault();
    const p = parseFloat(precio);
    if (!desc.trim() || isNaN(p) || p <= 0) return;
    guardar((c) => {
      c.items.unshift({
        id: uid(),
        descripcion: desc.trim(),
        precio: p,
        cantidad: Math.max(1, parseInt(cantidad) || 1),
        fecha: Date.now(),
      });
    });
    setDesc("");
    setPrecio("");
    setCantidad("1");
    setAviso(`✅ Fiado agregado a la cuenta de ${fullName(cliente)}.`);
  };

  // Quitar un producto exige confirmación en el modal: un clic
  // accidental no debe poder alterar la cuenta del cliente.
  const confirmarQuitarItem = () => {
    if (!itemAQuitar) return;
    const itemId = itemAQuitar.id;
    guardar((c) => {
      c.items = c.items.filter((it) => it.id !== itemId);
    });
    setAviso(`Producto "${itemAQuitar.descripcion}" quitado de la cuenta.`);
    setItemAQuitar(null);
  };

  const registrarPago = (e: FormEvent) => {
    e.preventDefault();
    const m = parseFloat(montoPago);
    if (isNaN(m) || m <= 0) return;
    guardar((c) => {
      c.pagos.unshift({ id: uid(), monto: m, fecha: Date.now() });
    });
    setMontoPago("");
    setAviso(`✅ Abono de ${fmtMoney(m)} registrado.`);
  };

  // Un toque en un frecuente llena descripción y precio del fiado.
  const usarFrecuente = (p: CatalogProduct) => {
    setDesc(p.descripcion);
    setPrecio(String(p.precio));
  };

  const agregarFrecuente = async (e: FormEvent) => {
    e.preventDefault();
    const p = parseFloat(frecPrecio);
    if (!frecDesc.trim() || isNaN(p) || p <= 0) return;
    await onAddFrecuente(frecDesc.trim(), p);
    setFrecDesc("");
    setFrecPrecio("");
    setAviso(`✅ "${frecDesc.trim()}" agregado a tus productos frecuentes.`);
  };

  const confirmarQuitarFrecuente = () => {
    if (!frecuenteAQuitar) return;
    void onDeleteFrecuente(frecuenteAQuitar.id);
    setAviso(`Producto frecuente "${frecuenteAQuitar.descripcion}" eliminado.`);
    setFrecuenteAQuitar(null);
  };

  // Saldar también pasa por el modal: registra un abono por el total.
  const confirmarSaldarPago = () => {
    guardar((c) => {
      c.pagos.unshift({ id: uid(), monto: d, fecha: Date.now() });
    });
    setConfirmarSaldar(false);
    setAviso("✅ Deuda saldada por completo. 🎉");
  };

  return (
    <Wrap>
      {aviso && <SuccessNotice>{aviso}</SuccessNotice>}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">
            {fullName(cliente)}
          </h2>
          {cliente.telephone && (
            <span className="text-sm text-muted-foreground">
              {cliente.telephone}
            </span>
          )}
        </div>
        <div className="flex flex-col items-end gap-2.5">
          <TotalBox monto={d} />
          {cliente.telephone && (
            <Button asChild variant="success" size="sm">
              <a
                href={whatsAppUrl(
                  cliente.telephone,
                  mensajeEstadoCuenta(cliente),
                )}
                target="_blank"
                rel="noreferrer"
              >
                <MessageCircle /> Enviar estado por WhatsApp
              </a>
            </Button>
          )}
        </div>
      </div>

      <Card className="gap-4 p-6">
        <h3 className="text-base font-semibold tracking-tight">
          Agregar fiado
        </h3>
        <form className="flex flex-wrap items-end gap-3" onSubmit={agregarItem}>
          <Input
            className="min-w-44 flex-[2]"
            placeholder="Descripción (ej: 2 libras de arroz) *"
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
          />
          <Input
            className="w-[110px] flex-none"
            type="number"
            min="0"
            step="0.01"
            placeholder="Precio *"
            value={precio}
            onChange={(e) => setPrecio(e.target.value)}
          />
          <Input
            className="w-20 flex-none"
            type="number"
            min="1"
            step="1"
            placeholder="Cant."
            value={cantidad}
            onChange={(e) => setCantidad(e.target.value)}
          />
          <Button type="submit">Añadir</Button>
        </form>

        {catalogo.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-muted-foreground">Frecuentes:</span>
            {catalogo.map((p) => (
              <Button
                key={p.id}
                type="button"
                variant="outline"
                size="sm"
                className="rounded-full px-3.5"
                onClick={() => usarFrecuente(p)}
              >
                {p.descripcion} · {fmtMoney(p.precio)}
              </Button>
            ))}
          </div>
        )}

        <div>
          <Button
            type="button"
            variant="link"
            size="sm"
            className="h-auto px-0 py-0.5"
            onClick={() => setEditandoFrecuentes(!editandoFrecuentes)}
          >
            {editandoFrecuentes
              ? "Ocultar productos frecuentes"
              : "Editar productos frecuentes"}
          </Button>
        </div>

        {editandoFrecuentes && (
          <div className="flex flex-col gap-3 border-t border-slate-100 pt-4">
            {catalogo.length === 0 && (
              <p className="text-sm text-muted-foreground">
                Aún no tienes productos frecuentes. Agrega los que fías seguido
                (arroz, aceite, huevos…) y aparecerán como botones para llenar
                el fiado con un toque.
              </p>
            )}
            {catalogo.map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between gap-3 text-sm"
              >
                <span>
                  {p.descripcion}{" "}
                  <span className="text-muted-foreground">
                    · {fmtMoney(p.precio)}
                  </span>
                </span>
                <button
                  type="button"
                  className="py-0.5 text-xs font-medium text-red-600 underline-offset-2 hover:underline"
                  onClick={() => setFrecuenteAQuitar(p)}
                >
                  quitar
                </button>
              </div>
            ))}
            <form
              className="flex flex-wrap gap-2.5"
              onSubmit={agregarFrecuente}
            >
              <Input
                className="h-10 min-w-40 flex-1"
                placeholder="Producto frecuente (ej: Arroz 1 lb)"
                value={frecDesc}
                onChange={(e) => setFrecDesc(e.target.value)}
              />
              <Input
                className="h-10 w-24 flex-none"
                type="number"
                min="0"
                step="0.01"
                placeholder="Precio"
                value={frecPrecio}
                onChange={(e) => setFrecPrecio(e.target.value)}
              />
              <Button type="submit" size="sm" className="h-10">
                Agregar frecuente
              </Button>
            </form>
          </div>
        )}
      </Card>

      <Card className="gap-2 p-6">
        <h3 className="text-base font-semibold tracking-tight">
          Productos fiados
        </h3>
        {(cliente.items || []).length === 0 && (
          <p className="text-sm text-muted-foreground">
            Este cliente aún no tiene productos fiados. Agrega el primero con el
            formulario «Agregar fiado» de arriba.
          </p>
        )}
        {(cliente.items || []).map((it) => (
          <div
            className="flex items-center justify-between gap-3 border-b border-slate-100 py-3 last:border-0"
            key={it.id}
          >
            <div className="min-w-0">
              <strong className="block truncate">{it.descripcion}</strong>
              <div className="text-xs text-muted-foreground">
                {fmtFecha(it.fecha)} ·{" "}
                {it.cantidad > 1
                  ? `${it.cantidad} × ${fmtMoney(it.precio)}`
                  : fmtMoney(it.precio)}
              </div>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-0.5">
              <strong className={moneyCls}>
                {fmtMoney(it.precio * (it.cantidad || 1))}
              </strong>
              <button
                className="py-0.5 text-xs font-medium text-red-600 underline-offset-2 hover:underline"
                onClick={() => setItemAQuitar(it)}
              >
                quitar
              </button>
            </div>
          </div>
        ))}
        <Totals cliente={cliente} />
      </Card>

      <Card className="gap-4 p-6">
        <h3 className="text-base font-semibold tracking-tight">
          Registrar abono
        </h3>
        <form onSubmit={registrarPago}>
          <div className="flex flex-wrap gap-3">
            <Input
              className="w-[150px] flex-none"
              type="number"
              min="0"
              step="0.01"
              placeholder="Monto del abono"
              value={montoPago}
              onChange={(e) => setMontoPago(e.target.value)}
            />
            <Button variant="success" type="submit">
              Abonar
            </Button>
            {d > 0 && (
              <Button
                variant="outline"
                type="button"
                onClick={() => setConfirmarSaldar(true)}
              >
                Saldar todo
              </Button>
            )}
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="text-xs text-muted-foreground">
              Montos rápidos:
            </span>
            {[50, 100, 200, 500].map((v) => (
              <Button
                key={v}
                type="button"
                variant="outline"
                size="sm"
                className="rounded-full px-4"
                onClick={() => setMontoPago(String(v))}
              >
                C$ {v}
              </Button>
            ))}
          </div>
        </form>
        {(cliente.pagos || []).length > 0 && (
          <div className="flex flex-col gap-2">
            {(cliente.pagos || []).map((p) => (
              <div
                className="flex items-center justify-between rounded-lg bg-emerald-50 px-3.5 py-2 text-sm"
                key={p.id}
              >
                <span className="text-xs text-muted-foreground">
                  {fmtFecha(p.fecha)}
                </span>
                <strong className={cn(moneyCls, pagadoCls)}>
                  − {fmtMoney(p.monto)}
                </strong>
              </div>
            ))}
          </div>
        )}
      </Card>

      {itemAQuitar && (
        <ConfirmModal
          title="¿Quitar este producto?"
          message={`Se quitará "${itemAQuitar.descripcion}" (${fmtMoney(itemAQuitar.precio * (itemAQuitar.cantidad || 1))}) de la cuenta de ${fullName(cliente)}.${saldoTrasQuitar > 0 ? ` Ojo: ya abonó ${fmtMoney(totalPagos(cliente))}, así que quedará un saldo a favor del cliente de ${fmtMoney(saldoTrasQuitar)}.` : ""} Esta acción no se puede deshacer.`}
          confirmLabel="Sí, quitar"
          onConfirm={confirmarQuitarItem}
          onCancel={() => setItemAQuitar(null)}
        />
      )}

      {frecuenteAQuitar && (
        <ConfirmModal
          title="¿Quitar este producto frecuente?"
          message={`Se quitará "${frecuenteAQuitar.descripcion}" de tus productos frecuentes. Los fiados ya registrados no se tocan.`}
          confirmLabel="Sí, quitar"
          onConfirm={confirmarQuitarFrecuente}
          onCancel={() => setFrecuenteAQuitar(null)}
        />
      )}

      {confirmarSaldar && (
        <ConfirmModal
          title="¿Saldar toda la deuda?"
          message={`Se registrará un abono de ${fmtMoney(d)} y la cuenta de ${fullName(cliente)} quedará en cero.`}
          confirmLabel="Sí, saldar"
          confirmTone="primary"
          onConfirm={confirmarSaldarPago}
          onCancel={() => setConfirmarSaldar(false)}
        />
      )}
    </Wrap>
  );
}
