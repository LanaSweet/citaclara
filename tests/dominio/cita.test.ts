import { describe, expect, it } from 'vitest'
import { calcularFin, ocupaHueco, pendienteDeCerrar, type Estado } from '@/dominio/cita'
import { madrid } from '../ayudas/bd'

describe('cita', () => {
  it('FR-005, H1.1: 10:00 + 45 minutos = 10:45', () => {
    const inicio = madrid('2026-11-17', '10:00')
    expect(calcularFin(inicio, 45).getTime()).toBe(madrid('2026-11-17', '10:45').getTime())
  })

  it('FR-009: solo reservada y completada ocupan hueco', () => {
    const esperado: Record<Estado, boolean> = {
      reservada: true,
      completada: true,
      cancelada: false,
      no_asistida: false,
    }
    for (const [estado, ocupa] of Object.entries(esperado)) expect(ocupaHueco(estado as Estado)).toBe(ocupa)
  })

  it('FR-016b, H3.5: una reservada con inicio pasado está pendiente de cerrar', () => {
    const ahora = madrid('2026-11-17', '12:00')
    expect(pendienteDeCerrar('reservada', madrid('2026-11-17', '10:00'), ahora)).toBe(true)
  })

  it('FR-016b: una reservada futura no está pendiente de cerrar', () => {
    const ahora = madrid('2026-11-17', '12:00')
    expect(pendienteDeCerrar('reservada', madrid('2026-11-17', '12:01'), ahora)).toBe(false)
  })

  it('FR-016b: un inicio exactamente igual a ahora cuenta como pasado', () => {
    const ahora = madrid('2026-11-17', '12:00')
    expect(pendienteDeCerrar('reservada', ahora, ahora)).toBe(true)
  })

  it('FR-016b: solo las reservadas pueden estar pendientes de cerrar', () => {
    const ahora = madrid('2026-11-17', '12:00')
    const antes = madrid('2026-11-17', '10:00')
    for (const e of ['completada', 'cancelada', 'no_asistida'] as const) {
      expect(pendienteDeCerrar(e, antes, ahora)).toBe(false)
    }
  })
})
