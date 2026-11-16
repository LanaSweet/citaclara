import { TZDate } from '@date-fns/tz'
import { ErrorNegocio } from './errores'

/** Zona horaria fija del producto (FR-019). */
export const ZONA = 'Europe/Madrid'

const formatoPartes = new Intl.DateTimeFormat('es-ES', {
  timeZone: ZONA,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
})

export interface PartesLocales {
  anio: number
  mes: number
  dia: number
  hora: number
  minuto: number
}

/** Descompone un instante en sus partes de calendario en hora de Madrid. */
export function partesMadrid(instante: Date): PartesLocales {
  const partes = Object.fromEntries(formatoPartes.formatToParts(instante).map((p) => [p.type, p.value]))
  return {
    anio: Number(partes.year),
    mes: Number(partes.month),
    dia: Number(partes.day),
    hora: Number(partes.hour),
    minuto: Number(partes.minute),
  }
}

/** Día de la semana en Madrid: 0 = domingo … 6 = sábado. */
export function diaSemanaMadrid(instante: Date): number {
  const { anio, mes, dia } = partesMadrid(instante)
  return new Date(Date.UTC(anio, mes - 1, dia)).getUTCDay()
}

/** Valida `AAAA-MM-DD` (fecha real del calendario) o lanza `FECHA_INVALIDA`. */
export function parsearFechaIso(fechaIso: string): { anio: number; mes: number; dia: number } {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(fechaIso)
  if (!m) throw new ErrorNegocio('FECHA_INVALIDA')
  const anio = Number(m[1])
  const mes = Number(m[2])
  const dia = Number(m[3])
  const control = new Date(Date.UTC(anio, mes - 1, dia))
  if (control.getUTCFullYear() !== anio || control.getUTCMonth() !== mes - 1 || control.getUTCDate() !== dia) {
    throw new ErrorNegocio('FECHA_INVALIDA')
  }
  return { anio, mes, dia }
}

/** Instante UTC que corresponde a `hora:minuto` del día local de Madrid indicado. */
export function instanteMadrid(fechaIso: string, hora = 0, minuto = 0): Date {
  const { anio, mes, dia } = parsearFechaIso(fechaIso)
  return new Date(new TZDate(anio, mes - 1, dia, hora, minuto, 0, 0, ZONA).getTime())
}

/**
 * Inicio (incluido) y fin (excluido) del día local de Madrid, en UTC.
 * El fin es la medianoche local siguiente, nunca «inicio + 24 h»: así los días de
 * cambio de hora duran 23 h o 25 h.
 */
export function limitesDelDia(fechaIso: string): { inicio: Date; fin: Date } {
  const { anio, mes, dia } = parsearFechaIso(fechaIso)
  return {
    inicio: new Date(new TZDate(anio, mes - 1, dia, 0, 0, 0, 0, ZONA).getTime()),
    fin: new Date(new TZDate(anio, mes - 1, dia + 1, 0, 0, 0, 0, ZONA).getTime()),
  }
}

/** Fecha local de Madrid de un instante, en formato `AAAA-MM-DD`. */
export function fechaIsoMadrid(instante: Date): string {
  const { anio, mes, dia } = partesMadrid(instante)
  return `${anio}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`
}

const dos = (n: number) => String(n).padStart(2, '0')

/** `dd/MM/yyyy` en hora de Madrid (FR-019). */
export function formatearFecha(instante: Date): string {
  const { anio, mes, dia } = partesMadrid(instante)
  return `${dos(dia)}/${dos(mes)}/${anio}`
}

/** `HH:mm` de 24 horas en hora de Madrid (FR-019). */
export function formatearHora(instante: Date): string {
  const { hora, minuto } = partesMadrid(instante)
  return `${dos(hora)}:${dos(minuto)}`
}

/** Lunes de la semana del instante, en Madrid (`AAAA-MM-DD`). */
export function lunesDeLaSemana(instante: Date): string {
  const dia = diaSemanaMadrid(instante) // 0 = domingo
  return sumarDias(fechaIsoMadrid(instante), -((dia + 6) % 7))
}

/** Suma `dias` a una fecha `AAAA-MM-DD` del calendario. */
export function sumarDias(fechaIso: string, dias: number): string {
  const { anio, mes, dia } = parsearFechaIso(fechaIso)
  const d = new Date(Date.UTC(anio, mes - 1, dia + dias))
  return `${d.getUTCFullYear()}-${dos(d.getUTCMonth() + 1)}-${dos(d.getUTCDate())}`
}
