import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { Cliente } from '@/bd/cliente'
import { consultarAgenda } from '@/servicios/consultar-agenda'
import { RelojFijo } from '@/servicios/reloj'
import { cargarSemilla } from '@/semilla/cargar'
import { abrirBdPruebas, madrid } from '../ayudas/bd'

let c: Cliente
const AHORA = madrid('2026-11-18', '12:00')

beforeAll(async () => {
  c = await abrirBdPruebas()
  await cargarSemilla(c.bd, { ancla: '2026-11-16', ahora: AHORA })
})
afterAll(() => c?.sql.end())

describe('rendimiento de la agenda', () => {
  it('SC-005: consultar la agenda de un día completo de los tres profesionales responde en menos de 2 s', async () => {
    const clinicaId = (await c.sql`SELECT id FROM clinica LIMIT 1`)[0].id as string
    await consultarAgenda(c.bd, new RelojFijo(AHORA), clinicaId, '2026-11-19') // calienta la conexión
    const inicio = performance.now()
    const agenda = await consultarAgenda(c.bd, new RelojFijo(AHORA), clinicaId, '2026-11-19')
    const ms = performance.now() - inicio
    expect(agenda).toHaveLength(3)
    expect(agenda.every((p) => p.tramos.length > 0)).toBe(true)
    expect(ms).toBeLessThan(2000)
  })
})
