import { useMemo } from "react";
import {
  fmtMoney,
  fmtFecha,
  totalItems,
  totalPagos,
  deuda,
  type DB,
} from "./storage.ts";

interface Actividad {
  id: string;
  tipo: "pago" | "fiado";
  monto: number;
  fecha: number;
  cliente: string;
  desc?: string;
}

export function metricas(db: DB) {
  const totalPorCobrar = db.clientes.reduce((s, c) => s + deuda(c), 0);
  const clientesConDeuda = db.clientes.filter((c) => deuda(c) > 0).length;
  const totalAbonado = db.clientes.reduce((s, c) => s + totalPagos(c), 0);
  const totalFiado = db.clientes.reduce((s, c) => s + totalItems(c), 0);
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

function actividadReciente(db: DB, limite = 8): Actividad[] {
  const acts: Actividad[] = [];
  for (const c of db.clientes) {
    for (const p of c.pagos || [])
      acts.push({
        id: p.id,
        tipo: "pago",
        monto: p.monto,
        fecha: p.fecha,
        cliente: c.nombre,
      });
    for (const it of c.items || [])
      acts.push({
        id: it.id,
        tipo: "fiado",
        monto: it.precio * (it.cantidad || 1),
        fecha: it.fecha,
        cliente: c.nombre,
        desc: it.descripcion,
      });
  }
  return acts.sort((a, b) => b.fecha - a.fecha).slice(0, limite);
}

interface Props {
  db: DB;
}

export default function Dashboard({ db }: Props) {
  const m = useMemo(() => metricas(db), [db]);
  const topDeudores = useMemo(
    () =>
      [...db.clientes]
        .filter((c) => deuda(c) > 0)
        .sort((a, b) => deuda(b) - deuda(a))
        .slice(0, 5),
    [db],
  );
  const acts = useMemo(() => actividadReciente(db), [db]);

  return (
    <main className="wrap">
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
                    #{i + 1} {c.nombre}
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
            <div className="item-row" key={a.id}>
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
