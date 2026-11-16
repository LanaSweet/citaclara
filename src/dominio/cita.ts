import { ErrorNegocio } from './errores'

export type Estado = 'reservada' | 'completada' | 'cancelada' | 'no_asistida'
export type Accion = 'completar' | 'cancelar' | 'no_asistio'

/** Reloj inyectable: el dominio y los servicios nunca leen la hora del sistema directamente. */
export interface Reloj {
  ahora(): Date
}

/** `fin = inicio + duracionMin` minutos reales (FR-005). */
export function calcularFin(inicio: Date, duracionMin: number): Date {
  return new Date(inicio.getTime() + duracionMin * 60_000)
}

/** Solo las citas reservadas y completadas ocupan hueco (FR-009). */
export function ocupaHueco(estado: Estado): boolean {
  return estado === 'reservada' || estado === 'completada'
}

/** Condición derivada (FR-016b): nunca modifica el estado. */
export function pendienteDeCerrar(estado: Estado, inicio: Date, ahora: Date): boolean {
  return estado === 'reservada' && inicio.getTime() <= ahora.getTime()
}

/** Transiciones permitidas (FR-006, FR-007, FR-016). Devuelve el nuevo estado o lanza `ErrorNegocio`. */
export function transicionar(estado: Estado, accion: Accion, inicio: Date, ahora: Date): Estado {
  if (estado !== 'reservada') throw new ErrorNegocio('ESTADO_FINAL')
  if (accion === 'cancelar') return 'cancelada'
  if (inicio.getTime() > ahora.getTime()) throw new ErrorNegocio('CITA_NO_EMPEZADA')
  return accion === 'completar' ? 'completada' : 'no_asistida'
}
