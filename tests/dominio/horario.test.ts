import { describe, expect, it } from 'vitest'
import { dentroDeHorario } from '@/dominio/horario'
import { madrid } from '../ayudas/bd'

// 2026-11-16 es lunes; 2026-11-21 sábado; 2026-11-22 domingo
describe('horario', () => {
  it('FR-013: una cita dentro del horario se acepta', () => {
    expect(dentroDeHorario(madrid('2026-11-17', '10:00'), madrid('2026-11-17', '10:45'))).toBe(true)
  })

  it('FR-013: una cita que acaba exactamente a las 20:00 se acepta', () => {
    expect(dentroDeHorario(madrid('2026-11-17', '19:15'), madrid('2026-11-17', '20:00'))).toBe(true)
  })

  it('FR-013: una cita que empieza exactamente a las 09:00 se acepta', () => {
    expect(dentroDeHorario(madrid('2026-11-17', '09:00'), madrid('2026-11-17', '09:30'))).toBe(true)
  })

  it('FR-013: una cita que acaba a las 20:01 se rechaza', () => {
    expect(dentroDeHorario(madrid('2026-11-17', '19:16'), madrid('2026-11-17', '20:01'))).toBe(false)
  })

  it('FR-013: una cita que empieza antes de las 09:00 se rechaza', () => {
    expect(dentroDeHorario(madrid('2026-11-17', '08:30'), madrid('2026-11-17', '09:15'))).toBe(false)
  })

  it('FR-013: sábado y domingo se rechazan', () => {
    expect(dentroDeHorario(madrid('2026-11-21', '10:00'), madrid('2026-11-21', '10:45'))).toBe(false)
    expect(dentroDeHorario(madrid('2026-11-22', '10:00'), madrid('2026-11-22', '10:45'))).toBe(false)
  })

  it('FR-013: una cita que cruza la medianoche se rechaza', () => {
    expect(dentroDeHorario(madrid('2026-11-17', '23:30'), madrid('2026-11-18', '00:15'))).toBe(false)
  })

  it('FR-013: el horario se evalúa en hora de Madrid también en verano', () => {
    // 2026-07-14 es martes; 10:00 en Madrid = 08:00 UTC
    expect(dentroDeHorario(new Date('2026-07-14T08:00:00Z'), new Date('2026-07-14T08:45:00Z'))).toBe(true)
    // 19:30–20:15 Madrid → fuera
    expect(dentroDeHorario(new Date('2026-07-14T17:30:00Z'), new Date('2026-07-14T18:15:00Z'))).toBe(false)
  })
})
