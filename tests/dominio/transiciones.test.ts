import { describe, expect, it } from 'vitest'
import { transicionar, type Accion, type Estado } from '@/dominio/cita'
import { madrid } from '../ayudas/bd'

const ahora = madrid('2026-11-17', '12:00')
const pasado = madrid('2026-11-17', '10:00')
const futuro = madrid('2026-11-17', '15:00')

describe('transiciones de estado', () => {
  it('H3.1, FR-016: reservada → completada solo con inicio ≤ ahora', () => {
    expect(transicionar('reservada', 'completar', pasado, ahora)).toBe('completada')
    expect(transicionar('reservada', 'completar', ahora, ahora)).toBe('completada')
    expect(() => transicionar('reservada', 'completar', futuro, ahora)).toThrow(
      expect.objectContaining({ codigo: 'CITA_NO_EMPEZADA' }),
    )
  })

  it('H3.3, H3.6, FR-016: reservada → no_asistida solo con inicio ≤ ahora', () => {
    expect(transicionar('reservada', 'no_asistio', pasado, ahora)).toBe('no_asistida')
    expect(() => transicionar('reservada', 'no_asistio', futuro, ahora)).toThrow(
      expect.objectContaining({ codigo: 'CITA_NO_EMPEZADA' }),
    )
  })

  it('H3.2: reservada → cancelada en cualquier momento (pasada o futura)', () => {
    expect(transicionar('reservada', 'cancelar', futuro, ahora)).toBe('cancelada')
    expect(transicionar('reservada', 'cancelar', pasado, ahora)).toBe('cancelada')
  })

  it('H3.4, FR-007: cualquier acción sobre un estado final → ESTADO_FINAL', () => {
    const finales: Estado[] = ['completada', 'cancelada', 'no_asistida']
    const acciones: Accion[] = ['completar', 'cancelar', 'no_asistio']
    for (const estado of finales) {
      for (const accion of acciones) {
        expect(() => transicionar(estado, accion, pasado, ahora)).toThrow(
          expect.objectContaining({ codigo: 'ESTADO_FINAL' }),
        )
      }
    }
  })
})
