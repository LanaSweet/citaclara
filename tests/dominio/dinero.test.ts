import { describe, expect, it } from 'vitest'
import { formatearEuros, sumarCentimos } from '@/dominio/dinero'

describe('dinero', () => {
  it('FR-020, SC-009: 4000 céntimos se muestran como «40,00 €»', () => {
    expect(formatearEuros(4000)).toBe('40,00 €')
  })

  it('FR-020, SC-009: 3500 céntimos se muestran como «35,00 €»', () => {
    expect(formatearEuros(3500)).toBe('35,00 €')
  })

  it('SC-009: siempre dos decimales, también con céntimos y cero', () => {
    expect(formatearEuros(4505)).toBe('45,05 €')
    expect(formatearEuros(0)).toBe('0,00 €')
  })

  it('SC-009: la suma de las partes coincide con el total al céntimo', () => {
    expect(sumarCentimos(4000, 3500, 5000, 4500)).toBe(17000)
    expect(sumarCentimos(10, 20, 30)).toBe(60) // con float 0,1 + 0,2 + 0,3 ≠ 0,6
  })

  it('FR-020: rechaza importes no enteros', () => {
    expect(() => formatearEuros(40.5)).toThrow(RangeError)
    expect(() => sumarCentimos(100, 0.1)).toThrow(RangeError)
  })
})
