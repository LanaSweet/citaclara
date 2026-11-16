import { describe, expect, it } from 'vitest'
import { huecosLibres } from '@/dominio/horario'
import { formatearHora } from '@/dominio/fechas'
import { madrid } from '../ayudas/bd'

const D = '2026-11-17'
const t = (a: string, b: string) => ({ inicio: madrid(D, a), fin: madrid(D, b) })
const texto = (ts: { inicio: Date; fin: Date }[]) => ts.map((x) => `${formatearHora(x.inicio)}-${formatearHora(x.fin)}`)

describe('huecos libres', () => {
  it('H2.4: un día vacío está libre durante todo el horario (09:00–20:00)', () => {
    expect(texto(huecosLibres([], D))).toEqual(['09:00-20:00'])
  })

  it('FR-014: citas contiguas no dejan hueco entre ellas', () => {
    expect(texto(huecosLibres([t('10:00', '10:45'), t('10:45', '11:30')], D))).toEqual(['09:00-10:00', '11:30-20:00'])
  })

  it('FR-014: un hueco entre dos citas aparece como libre', () => {
    expect(texto(huecosLibres([t('09:00', '09:45'), t('10:30', '11:15')], D))).toEqual(['09:45-10:30', '11:15-20:00'])
  })

  it('FR-014: una cita que empieza a las 09:00 no deja hueco al principio', () => {
    expect(texto(huecosLibres([t('09:00', '09:45')], D))).toEqual(['09:45-20:00'])
  })

  it('FR-014: una cita que acaba a las 20:00 no deja hueco al final', () => {
    expect(texto(huecosLibres([t('19:15', '20:00')], D))).toEqual(['09:00-19:15'])
  })

  it('FR-014: las citas desordenadas se tratan en orden cronológico', () => {
    expect(texto(huecosLibres([t('12:00', '12:45'), t('10:00', '10:45')], D))).toEqual([
      '09:00-10:00',
      '10:45-12:00',
      '12:45-20:00',
    ])
  })

  it('FR-019: un día de cambio de hora (29/03/2026, domingo) no tiene horario; el lunes 30 sí, en hora de Madrid', () => {
    expect(huecosLibres([], '2026-03-29')).toEqual([])
    expect(texto(huecosLibres([], '2026-03-30'))).toEqual(['09:00-20:00'])
    // 09:00 de Madrid el 30/03 es 07:00 UTC (ya en horario de verano)
    expect(huecosLibres([], '2026-03-30')[0].inicio.toISOString()).toBe('2026-03-30T07:00:00.000Z')
  })

  it('FR-019: el último día laborable de octubre con cambio de hora (lunes 26/10) usa UTC+1', () => {
    expect(huecosLibres([], '2026-10-26')[0].inicio.toISOString()).toBe('2026-10-26T08:00:00.000Z')
  })

  it('FR-013: sábado y domingo no tienen huecos', () => {
    expect(huecosLibres([], '2026-11-21')).toEqual([])
    expect(huecosLibres([], '2026-11-22')).toEqual([])
  })
})
