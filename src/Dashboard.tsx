import { useMemo } from "react";
import {
  fmtMoney,
  fmtFecha,
  totalItems,
  totalPagos,
  deuda,
  fullName,
  type Client,
} from "./storage.ts";

interface Actividad {
  id: string;
  tipo: "pago" | "fiado";
  monto: number;
  fecha: number;
  cliente: string;
  desc?: string;
}

export function metricas(clientes: Client[]) {
  const totalPorCobrar = clientes.reduce((s, c) => s + deuda(c), 0);
  const clientesConDeuda = clientes.filter((c) => deuda(c) > 0).length;
  const totalAbonado = clientes.reduce((s, c) => s + totalPagos(c), 0);
  const totalFiado = clientes.reduce((s, c) => s + totalItems(c), 0);
  const tasaRecuperacion =
    totalFiado > 0 ? (totalAbonado / totalFiado) * 100 : 0;
  return {
    totalPorCobrar,
    clientesConDeuda,
    totalAbonado,
    totalFiado,
    tasaRecuperacion,
  };
}

function actividadReciente(clientes: Client[], limite = 8): Actividad[] {
  const acts: Actividad[] = [];
  for (const c of clientes) {
    for (const p of c.pagos || [])
      acts.push({
        id: p.id,
        tipo: "pago",
        monto: p.monto,
        fecha: p.fecha,
        cliente: fullName(c),
      });
    for (const it of c.items || [])
      acts.push({
        id: it.id,
        tipo: "fiado",
        monto: it.precio * (it.cantidad || 1),
        fecha: it.fecha,
        cliente: fullName(c),
        desc: it.descripcion,
      });
  }
  return acts.sort((a, b) => b.fecha - a.fecha).slice(0, limite);
}

interface Props {
  clientes: Client[];
}

export default function Dashboard({ clientes }: Props) {
  const m = useMemo(() => metricas(clientes), [clientes]);
  const topDeudores = useMemo(
    () =>
      [...clientes]
        .filter((c) => deuda(c) > 0)
        .sort((a, b) => deuda(b) - deuda(a))
        .slice(0, 5),
    [clientes],
  );
  const acts = useMemo(() => actividadReciente(clientes), [clientes]);

  return (
    <main className="wrap">
      {clientes.length === 0 && (
        <div className="card">
          <h3>👋 ¡Bienvenido a VentaFlow!</h3>
          <p className="mut">
            Todavía no tienes clientes registrados. Toca la pestaña{" "}
            <strong>Clientes</strong>, agrega el primero con su nombre y
            su número de teléfono, y después podrás registrarle productos
            fiados y abonos. Aquí verás cuánto te deben en total.
          </p>
        </div>
      )}
      <div
        className="resumen"
        style={{ gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))" }}
      >
        <div className="metric">
          <span>Total por cobrar</span>
          <strong className="deuda">{fmtMoney(m.totalPorCobrar)}</strong>
        </div>
        <div className="metric">
          <span> Clientes con deuda</span>
          <strong>{m.clientesConDeuda}</strong>
        </div>
        <div className="metric">
          <span>Total abonado</span>
          <strong className="pagado">− {fmtMoney(m.totalAbonado)}</strong>
        </div>
        <div className="metric">
          <span>% recuperado</span>
          <strong
            style={{
              color: m.tasaRecuperacion >= 50 ? "var(--ok)" : "var(--deuda)",
            }}
          >
            {m.tasaRecuperacion.toFixed(0)}%
          </strong>
        </div>
      </div>

      <div className="card">
        <h3>Top 5 clientes deudores</h3>
        {topDeudores.length === 0 ? (
          <p className="mut center">¡Sin deudas! Todos están al corriente.</p>
        ) : (
          topDeudores.map((c, i) => {
            const d = deuda(c);
            const max = deuda(topDeudores[0]) || 1;
            return (
              <div className="bar-row" key={c.id}>
                <div className="bar-meta">
                  <strong>
                    #{i + 1} {fullName(c)}
                  </strong>
                  <span className="mut small">
                    {(c.items || []).length} productos ·{" "}
                    {fmtMoney(totalPagos(c))} abonados
                  </span>
                </div>
                <div className="bar-track">
                  <div
                    className="bar-fill"
                    style={{ width: `${(d / max) * 100}%` }}
                  />
                </div>
                <div className="bar-val">
                  <strong className="deuda">{fmtMoney(d)}</strong>
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="card">
        <h3>Actividad reciente</h3>
        {acts.length === 0 ? (
          <p className="mut center">Sin actividad aún.</p>
        ) : (
          acts.map((a) => (
            <div className="item-row" key={`${a.tipo}-${a.id}`}>
              <div>
                <strong>{a.cliente}</strong>
                {a.desc && <span className="mut small"> · {a.desc}</span>}
                <div className="mut small">{fmtFecha(a.fecha)}</div>
              </div>
              <div className="right">
                <strong className={a.tipo === "pago" ? "pagado" : "deuda"}>
                  {a.tipo === "pago" ? "−" : "+"}
                  {fmtMoney(a.monto)}
                </strong>
              </div>
            </div>
          ))
        )}
      </div>
    </main>
  );
}
