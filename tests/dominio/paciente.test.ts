import { describe, expect, it } from 'vitest'
import { esquemaPaciente } from '@/dominio/paciente'

const valido = { nombre: 'Ana Pérez', telefono: '600 12 31 23', email: 'ana@example.com' }

describe('esquema de paciente', () => {
  it('FR-004: acepta datos válidos y normaliza el teléfono', () => {
    const r = esquemaPaciente.parse(valido)
    expect(r.telefono).toBe('600123123')
    expect(esquemaPaciente.safeParse({ ...valido, telefono: '+34 911 222 333' }).success).toBe(true)
  })

  it('FR-004: rechaza un teléfono vacío o sin formato telefónico español', () => {
    for (const telefono of ['', '12345', 'abc', '500123123', '60012312']) {
      expect(esquemaPaciente.safeParse({ ...valido, telefono }).success).toBe(false)
    }
  })

  it('FR-004: rechaza un email vacío o mal formado', () => {
    for (const email of ['', 'ana', 'ana@', '@example.com', 'ana@example']) {
      expect(esquemaPaciente.safeParse({ ...valido, email }).success).toBe(false)
    }
  })

  it('FR-004: rechaza un nombre vacío', () => {
    expect(esquemaPaciente.safeParse({ ...valido, nombre: '  ' }).success).toBe(false)
  })
})
