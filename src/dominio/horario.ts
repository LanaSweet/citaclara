import { diaSemanaMadrid, fechaIsoMadrid, instanteMadrid, partesMadrid } from './fechas'

/** Horario fijo de atención (FR-013): lunes a viernes, 09:00–20:00, hora de Madrid. */
export const APERTURA_MIN = 9 * 60
export const CIERRE_MIN = 20 * 60

export interface Tramo {
  inicio: Date
  fin: Date
}

function esLaborable(instante: Date): boolean {
  const d = diaSemanaMadrid(instante)
  return d >= 1 && d <= 5
}

/** La cita completa debe quedar en el mismo día local, laborable, dentro de [09:00, 20:00]. */
export function dentroDeHorario(inicio: Date, fin: Date): boolean {
  if (fin <= inicio) return false
  if (fechaIsoMadrid(inicio) !== fechaIsoMadrid(fin)) {
    // Solo se admite que el fin sea exactamente la medianoche si el horario lo permitiera; no lo permite.
    return false
  }
  if (!esLaborable(inicio)) return false
  const a = partesMadrid(inicio)
  const b = partesMadrid(fin)
  return a.hora * 60 + a.minuto >= APERTURA_MIN && b.hora * 60 + b.minuto <= CIERRE_MIN
}

/**
 * Tramos libres de un profesional en un día local, dentro del horario de atención.
 * `ocupados` son los tramos de citas que ocupan hueco (reservadas y completadas).
 */
export function huecosLibres(ocupados: Tramo[], fechaIso: string): Tramo[] {
  const apertura = instanteMadrid(fechaIso, 9, 0)
  const cierre = instanteMadrid(fechaIso, 20, 0)
  if (!esLaborable(apertura)) return []

  const orden = [...ocupados].sort((a, b) => a.inicio.getTime() - b.inicio.getTime())
  const libres: Tramo[] = []
  let cursor = apertura
  for (const t of orden) {
    if (t.inicio > cursor) libres.push({ inicio: cursor, fin: t.inicio < cierre ? t.inicio : cierre })
    if (t.fin > cursor) cursor = t.fin
    if (cursor >= cierre) break
  }
  if (cursor < cierre) libres.push({ inicio: cursor, fin: cierre })
  return libres.filter((t) => t.fin > t.inicio)
}
