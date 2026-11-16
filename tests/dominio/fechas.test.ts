import { describe, expect, it } from 'vitest'
import { formatearFecha, formatearHora, limitesDelDia, parsearFechaIso } from '@/dominio/fechas'
import { calcularFin } from '@/dominio/cita'

const horas = ({ inicio, fin }: { inicio: Date; fin: Date }) => (fin.getTime() - inicio.getTime()) / 3_600_000

describe('fechas', () => {
  it('FR-019: formatea la fecha como dd/MM/yyyy en hora de Madrid', () => {
    expect(formatearFecha(new Date('2026-11-16T09:30:00Z'))).toBe('16/11/2026')
    // 23:30 UTC del 15 ya es 00:30 del día 16 en Madrid (invierno, UTC+1)
    expect(formatearFecha(new Date('2026-11-15T23:30:00Z'))).toBe('16/11/2026')
  })

  it('FR-019: formatea la hora como HH:mm de 24 horas en hora de Madrid', () => {
    expect(formatearHora(new Date('2026-11-16T09:05:00Z'))).toBe('10:05')
    expect(formatearHora(new Date('2026-07-16T18:00:00Z'))).toBe('20:00')
    expect(formatearHora(new Date('2026-11-15T23:00:00Z'))).toBe('00:00')
  })

  it('FR-019: un día normal dura 24 horas', () => {
    expect(horas(limitesDelDia('2026-11-17'))).toBe(24)
  })

  it('FR-019: el día de cambio de hora de marzo (último domingo) dura 23 horas', () => {
    expect(horas(limitesDelDia('2026-03-29'))).toBe(23)
  })

  it('FR-019: el día de cambio de hora de octubre (último domingo) dura 25 horas', () => {
    expect(horas(limitesDelDia('2026-10-25'))).toBe(25)
  })

  it('FR-019: el inicio del día local es medianoche de Madrid expresada en UTC', () => {
    expect(limitesDelDia('2026-11-17').inicio.toISOString()).toBe('2026-11-16T23:00:00.000Z')
    expect(limitesDelDia('2026-07-17').inicio.toISOString()).toBe('2026-07-16T22:00:00.000Z')
  })

  it('FR-005: caso límite: una cita de 45 minutos dura 45 minutos reales también en cambio de hora', () => {
    // 01:30 local del 29/03/2026 = 00:30 UTC; +45' = 01:15 UTC = 03:15 hora local
    const inicio = new Date('2026-03-29T00:30:00Z')
    const fin = calcularFin(inicio, 45)
    expect(fin.getTime() - inicio.getTime()).toBe(45 * 60_000)
    expect(formatearHora(fin)).toBe('03:15')
  })

  it('FR-014: FECHA_INVALIDA si no es AAAA-MM-DD válido', () => {
    for (const mala of ['', '17/11/2026', '2026-13-01', '2026-02-30', 'hoy', '2026-1-1']) {
      expect(() => parsearFechaIso(mala)).toThrow(expect.objectContaining({ codigo: 'FECHA_INVALIDA' }))
    }
    expect(parsearFechaIso('2028-02-29')).toEqual({ anio: 2028, mes: 2, dia: 29 })
  })
})
