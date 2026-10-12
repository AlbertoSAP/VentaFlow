import { useEffect, useMemo, useState, type FormEvent } from 'react'
import {
  subscribeDB, writeDB, uid, fmtMoney, fmtFecha,
  totalItems, totalPagos, deuda,
  type DB, type Cliente,
} from './storage.ts'

type Vista = { tipo: 'lista' } | { tipo: 'detalle'; id: string }

function App() {
  const [db, setDb] = useState<DB | null>(null) // null = cargando
  const [vista, setVista] = useState<Vista>({ tipo: 'lista' })
  const [busqueda, setBusqueda] = useState('')

  useEffect(() => subscribeDB(setDb), [])

  const upsert = (fn: (d: DB) => DB) => {
    setDb((prev) => {
      if (!prev) return prev
      const next = fn(structuredClone(prev))
      writeDB(next)
      return next
    })
  }

  const clientesFiltrados = useMemo(() => {
    if (!db) return []
    const q = busqueda.trim().toLowerCase()
    return db.clientes.filter((c) => !q || c.nombre.toLowerCase().includes(q))
  }, [db, busqueda])

  const totalPorCobrar = db ? db.clientes.reduce((s, c) => s + deuda(c), 0) : 0

  if (!db) {
    return (
      <div className="page">
        <header className="topbar"><span className="logo">📒 Fiados</span></header>
        <main className="wrap"><p className="mut center">Conectando con Firebase…</p></main>
      </div>
    )
  }

  return (
    <div className="page">
      <header className="topbar">
        <span className="logo">📒 Fiados</span>
        {vista.tipo === 'detalle' && (
          <button className="btn btn-ghost" onClick={() => setVista({ tipo: 'lista' })}>← Volver</button>
        )}
      </header>

      {vista.tipo === 'lista' ? (
        <ListaClientes
          db={db} upsert={upsert}
          busqueda={busqueda} setBusqueda={setBusqueda}
          clientes={clientesFiltrados} totalPorCobrar={totalPorCobrar}
          onAbrir={(id: string) => setVista({ tipo: 'detalle', id })}
        />
      ) : (
        <DetalleCliente
          upsert={upsert}
          cliente={db.clientes.find((c) => c.id === vista.id)}
          onVolver={() => setVista({ tipo: 'lista' })}
        />
      )}
    </div>
  )
}

interface ListaProps {
  db: DB
  upsert: (fn: (d: DB) => DB) => void
  busqueda: string
  setBusqueda: (v: string) => void
  clientes: Cliente[]
  totalPorCobrar: number
  onAbrir: (id: string) => void
}

function ListaClientes({ db, upsert, busqueda, setBusqueda, clientes, totalPorCobrar, onAbrir }: ListaProps) {
  const [nombre, setNombre] = useState('')
  const [telefono, setTelefono] = useState('')

  const agregar = (e: FormEvent) => {
    e.preventDefault()
    if (!nombre.trim()) return
    upsert((d) => {
      d.clientes.unshift({ id: uid(), nombre: nombre.trim(), telefono: telefono.trim(), creado: Date.now(), items: [], pagos: [] })
      return d
    })
    setNombre(''); setTelefono('')
  }

  const eliminar = (id: string, nom: string) => {
    if (!confirm(`¿Eliminar a ${nom} y todo su registro?`)) return
    upsert((d) => { d.clientes = d.clientes.filter((c) => c.id !== id); return d })
  }

  return (
    <main className="wrap">
      <div className="resumen">
        <div><span>Total por cobrar</span><strong className="deuda">{fmtMoney(totalPorCobrar)}</strong></div>
        <div><span>Clientes con deuda</span><strong>{db.clientes.filter((c) => deuda(c) > 0).length}</strong></div>
      </div>

      <form className="form-card" onSubmit={agregar}>
        <h3>Agregar cliente</h3>
        <div className="row">
          <input placeholder="Nombre del cliente *" value={nombre} onChange={(e) => setNombre(e.target.value)} />
          <input placeholder="Teléfono (opcional)" value={telefono} onChange={(e) => setTelefono(e.target.value)} />
          <button className="btn btn-primary" type="submit">Agregar</button>
        </div>
      </form>

      <input className="search" placeholder="🔍 Buscar cliente..." value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />

      <div className="list">
        {clientes.map((c) => {
          const d = deuda(c)
          return (
            <div className="cliente-card" key={c.id} onClick={() => onAbrir(c.id)}>
              <div>
                <strong>{c.nombre}</strong>
                {c.telefono && <span className="mut"> · {c.telefono}</span>}
                <div className="mut small">{c.items?.length || 0} productos fiados</div>
              </div>
              <div className="right">
                <strong className={d > 0 ? 'deuda' : 'pagado'}>{fmtMoney(d)}</strong>
                <button className="link danger" onClick={(e) => { e.stopPropagation(); eliminar(c.id, c.nombre) }}>eliminar</button>
              </div>
            </div>
          )
        })}
        {clientes.length === 0 && <p className="mut center">No hay clientes. Agrega el primero arriba.</p>}
      </div>
    </main>
  )
}

interface DetalleProps {
  upsert: (fn: (d: DB) => DB) => void
  cliente: Cliente | undefined
  onVolver: () => void
}

function DetalleCliente({ upsert, cliente }: DetalleProps) {
  const [desc, setDesc] = useState('')
  const [precio, setPrecio] = useState('')
  const [cantidad, setCantidad] = useState('1')
  const [montoPago, setMontoPago] = useState('')

  if (!cliente) return <main className="wrap"><p className="mut center">Cliente no encontrado.</p></main>

  const d = deuda(cliente)

  const agregarItem = (e: FormEvent) => {
    e.preventDefault()
    const p = parseFloat(precio)
    if (!desc.trim() || isNaN(p) || p <= 0) return
    const cid = cliente.id
    upsert((db2) => {
      const c = db2.clientes.find((x) => x.id === cid)!
      c.items.unshift({ id: uid(), descripcion: desc.trim(), precio: p, cantidad: Math.max(1, parseInt(cantidad) || 1), fecha: Date.now() })
      return db2
    })
    setDesc(''); setPrecio(''); setCantidad('1')
  }

  const quitarItem = (itemId: string) => {
    const cid = cliente.id
    upsert((db2) => {
      const c = db2.clientes.find((x) => x.id === cid)!
      c.items = c.items.filter((it) => it.id !== itemId)
      return db2
    })
  }

  const registrarPago = (e: FormEvent) => {
    e.preventDefault()
    const m = parseFloat(montoPago)
    if (isNaN(m) || m <= 0) return
    const cid = cliente.id
    upsert((db2) => {
      const c = db2.clientes.find((x) => x.id === cid)!
      c.pagos.unshift({ id: uid(), monto: m, fecha: Date.now() })
      return db2
    })
    setMontoPago('')
  }

  const saldar = () => {
    if (d <= 0 || !confirm(`¿Registrar pago total de ${fmtMoney(d)}?`)) return
    const cid = cliente.id
    upsert((db2) => {
      const c = db2.clientes.find((x) => x.id === cid)!
      c.pagos.unshift({ id: uid(), monto: d, fecha: Date.now() })
      return db2
    })
  }

  return (
    <main className="wrap">
      <div className="cliente-head">
        <div>
          <h2>{cliente.nombre}</h2>
          {cliente.telefono && <span className="mut">{cliente.telefono}</span>}
        </div>
        <div className="total-box">
          <span>Deuda actual</span>
          <strong className={d > 0 ? 'deuda' : 'pagado'}>{fmtMoney(d)}</strong>
        </div>
      </div>

      <form className="form-card" onSubmit={agregarItem}>
        <h3>Agregar fiado</h3>
        <div className="row wrap-row">
          <input className="grow" placeholder="Descripción (ej: 2 libras de arroz) *" value={desc} onChange={(e) => setDesc(e.target.value)} />
          <input className="num" type="number" min="0" step="0.01" placeholder="Precio *" value={precio} onChange={(e) => setPrecio(e.target.value)} />
          <input className="num" type="number" min="1" step="1" placeholder="Cant." value={cantidad} onChange={(e) => setCantidad(e.target.value)} />
          <button className="btn btn-primary" type="submit">Añadir</button>
        </div>
      </form>

      <div className="table-card">
        <h3>Productos fiados</h3>
        {(cliente.items || []).length === 0 && <p className="mut">Sin productos registrados.</p>}
        {(cliente.items || []).map((it) => (
          <div className="item-row" key={it.id}>
            <div>
              <strong>{it.descripcion}</strong>
              <div className="mut small">{fmtFecha(it.fecha)} · {it.cantidad > 1 ? `${it.cantidad} × ${fmtMoney(it.precio)}` : fmtMoney(it.precio)}</div>
            </div>
            <div className="right">
              <strong>{fmtMoney(it.precio * (it.cantidad || 1))}</strong>
              <button className="link danger" onClick={() => quitarItem(it.id)}>quitar</button>
            </div>
          </div>
        ))}
        <div className="totales">
          <div><span>Total fiado:</span><strong>{fmtMoney(totalItems(cliente))}</strong></div>
          <div><span>Total abonado:</span><strong className="pagado">− {fmtMoney(totalPagos(cliente))}</strong></div>
          <div className="gran-total"><span>Deuda actual:</span><strong className="deuda">{fmtMoney(d)}</strong></div>
        </div>
      </div>

      <form className="form-card" onSubmit={registrarPago}>
        <h3>Registrar abono</h3>
        <div className="row">
          <input className="num" type="number" min="0" step="0.01" placeholder="Monto del abono" value={montoPago} onChange={(e) => setMontoPago(e.target.value)} />
          <button className="btn btn-ok" type="submit">Abonar</button>
          {d > 0 && <button className="btn btn-ghost" type="button" onClick={saldar}>Saldar todo</button>}
        </div>
        {(cliente.pagos || []).length > 0 && (
          <div className="pagos">
            {(cliente.pagos || []).map((p) => (
              <div className="pago-row" key={p.id}>
                <span className="mut small">{fmtFecha(p.fecha)}</span>
                <strong className="pagado">− {fmtMoney(p.monto)}</strong>
              </div>
            ))}
          </div>
        )}
      </form>
    </main>
  )
}

export default App
