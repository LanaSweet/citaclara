import { describe, expect, it, vi } from 'vitest'
import { MENSAJES, type CodigoError } from '@/dominio/errores'
import { ejecutar } from '@/app/envolver-accion'

const JERGA = /23P01|40P01|SQL|UUID|constraint|exclusion|trigger|tabla|stack|undefined|null|exception|ECONN/i

describe('mensajes de error', () => {
  it('FR-017: todo código de error tiene un mensaje claro en español, sin jerga técnica', () => {
    const codigos = Object.keys(MENSAJES) as CodigoError[]
    expect(codigos).toHaveLength(9)
    for (const codigo of codigos) {
      expect(MENSAJES[codigo].length).toBeGreaterThan(10)
      expect(MENSAJES[codigo]).not.toMatch(JERGA)
      expect(MENSAJES[codigo]).toMatch(/[.]$/)
    }
  })

  it('FR-017: los motivos principales tienen exactamente el texto del contrato', () => {
    expect(MENSAJES.HUECO_OCUPADO).toBe('Ese hueco ya está ocupado. Hemos actualizado la agenda.')
    expect(MENSAJES.EN_EL_PASADO).toBe('No se pueden crear citas en el pasado.')
    expect(MENSAJES.ESTADO_FINAL).toBe('Esta cita ya está cerrada y no se puede modificar.')
    expect(MENSAJES.CLAVE_INCORRECTA).toBe('La clave no es correcta.')
  })

  it('FR-017: un error inesperado se devuelve con un mensaje genérico, sin trazas ni códigos SQL', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const r = await ejecutar(async () => {
      throw Object.assign(new Error('insert into "cita" failed: duplicate key 23P01 constraint cita_sin_solape'), { code: '23P01' })
    })
    expect(r.ok).toBe(false)
    if (!r.ok) {
      expect(r.mensaje).not.toMatch(JERGA)
      expect(r.mensaje).toMatch(/Inténtalo de nuevo/)
    }
  })
})
