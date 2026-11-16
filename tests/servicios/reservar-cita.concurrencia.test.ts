import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import { count } from 'drizzle-orm'
import { cita } from '@/bd/esquema'
import type { Cliente } from '@/bd/cliente'
import { reservarCita } from '@/servicios/reservar-cita'
import { RelojFijo } from '@/servicios/reloj'
import { abrirBdPruebas, crearEscenario, crearProfesional, limpiarBd, madrid } from '../ayudas/bd'

let c: Cliente
let e: Awaited<ReturnType<typeof crearEscenario>>
const reloj = new RelojFijo(madrid('2026-11-16', '09:00'))
const D = '2026-11-17'
const N = 10

beforeEach(async () => {
  c ??= await abrirBdPruebas()
  await limpiarBd(c)
  e = await crearEscenario(c.bd)
})
afterAll(() => c?.sql.end())

describe('reservas simultáneas (principio III)', () => {
  it('FR-011, SC-001, H1.5: 10 reservas idénticas del mismo hueco → exactamente 1 aceptada y 9 HUECO_OCUPADO (20 ciclos)', async () => {
    for (let ciclo = 0; ciclo < 20; ciclo++) {
      await limpiarBd(c)
      e = await crearEscenario(c.bd)
      const resultados = await Promise.allSettled(
        Array.from({ length: N }, () =>
          reservarCita(c.bd, reloj, e.clinica.id, {
            profesionalId: e.profesional.id,
            servicioId: e.servicio.id,
            pacienteId: e.paciente.id,
            inicio: madrid(D, '10:00'),
          }),
        ),
      )
      const aceptadas = resultados.filter((r) => r.status === 'fulfilled')
      const rechazadas = resultados.filter((r) => r.status === 'rejected') as PromiseRejectedResult[]
      expect(aceptadas).toHaveLength(1)
      expect(rechazadas).toHaveLength(N - 1)
      expect(rechazadas.every((r) => r.reason?.codigo === 'HUECO_OCUPADO')).toBe(true)
      const [{ n }] = await c.bd.select({ n: count() }).from(cita)
      expect(n).toBe(1)
    }
  })

  it('SC-001: 10 reservas simultáneas del mismo hueco con profesionales distintos → todas aceptadas', async () => {
    const profesionales = await Promise.all(
      Array.from({ length: N }, (_, i) => crearProfesional(c.bd, e.clinica.id, `Profesional ${i}`)),
    )
    const resultados = await Promise.allSettled(
      profesionales.map((p) =>
        reservarCita(c.bd, reloj, e.clinica.id, {
          profesionalId: p.id,
          servicioId: e.servicio.id,
          pacienteId: e.paciente.id,
          inicio: madrid(D, '10:00'),
        }),
      ),
    )
    expect(resultados.every((r) => r.status === 'fulfilled')).toBe(true)
    const [{ n }] = await c.bd.select({ n: count() }).from(cita)
    expect(n).toBe(N)
  })
})
