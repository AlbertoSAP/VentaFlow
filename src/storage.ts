import { ref, onValue, set, type Unsubscribe } from 'firebase/database'
import { database } from './firebase.ts'

// ---------- Tipos ----------
export interface FiadoItem {
  id: string
  descripcion: string
  precio: number
  cantidad: number
  fecha: number
}

export interface Pago {
  id: string
  monto: number
  fecha: number
}

export interface Cliente {
  id: string
  nombre: string
  telefono: string
  creado: number
  items: FiadoItem[]
  pagos: Pago[]
}

export interface DB {
  clientes: Cliente[]
}

// ---------- Firebase Realtime Database ----------
const PATH = 'fiados'

/** Suscripción en tiempo real: llama a `cb` con los datos cada vez que cambian */
export function subscribeDB(cb: (db: DB) => void): Unsubscribe {
  const r = ref(database, PATH)
  return onValue(r, (snap) => {
    cb((snap.val() as DB | null) ?? { clientes: [] })
  })
}

/** Escribe todo el estado en Firebase */
export function writeDB(db: DB): Promise<void> {
  return set(ref(database, PATH), db)
}

// ---------- Utilidades ----------
export const uid = (): string => Math.random().toString(36).slice(2, 10)

export const fmtMoney = (n: number): string =>
  'C$ ' + Number(n || 0).toLocaleString('es-NI', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export const fmtFecha = (ts: number): string =>
  new Date(ts).toLocaleDateString('es-NI', { day: '2-digit', month: '2-digit', year: 'numeric' })

export function totalItems(c: Cliente): number {
  return (c.items || []).reduce((s, it) => s + it.precio * (it.cantidad || 1), 0)
}

export function totalPagos(c: Cliente): number {
  return (c.pagos || []).reduce((s, p) => s + p.monto, 0)
}

export function deuda(c: Cliente): number {
  return Math.max(0, totalItems(c) - totalPagos(c))
}
