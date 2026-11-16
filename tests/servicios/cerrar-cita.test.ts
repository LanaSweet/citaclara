import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import { eq } from 'drizzle-orm'
import { cita } from '@/bd/esquema'
import type { Cliente } from '@/bd/cliente'
import { cerrarCita } from '@/servicios/cerrar-cita'
import { reservarCita } from '@/servicios/reservar-cita'
import { RelojFijo } from '@/servicios/reloj'
import { abrirBdPruebas, crearCita, crearClinica, crearEscenario, limpiarBd, madrid } from '../ayudas/bd'

let c: Cliente
let e: Awaited<ReturnType<typeof crearEscenario>>
const D = '2026-11-17'
// Martes 17/11/2026 a las 12:00: 10:00 ya empezó, 15:00 todavía no.
const reloj = new RelojFijo(madrid(D, '12:00'))

beforeEach(async () => {
  c ??= await abrirBdPruebas()
  await limpiarBd(c)
  e = await crearEscenario(c.bd)
  reloj.fijar(madrid(D, '12:00'))
})
afterAll(() => c?.sql.end())

const ids = () => ({
  profesionalId: e.profesional.id,
  servicioId: e.servicio.id,
  pacienteId: e.paciente.id,
})
const poner = (desde: string, hasta: string) =>
  crearCita(c.bd, { clinicaId: e.clinica.id, ...ids(), inicio: madrid(D, desde), fin: madrid(D, hasta) })
const cerrar = (citaId: string, accion: 'completar' | 'cancelar' | 'no_asistio') =>
  cerrarCita(c.bd, reloj, e.clinica.id, { citaId, accion })
const reservarEnElMismoHueco = (desde: string) => {
  const ahoraAntes = new RelojFijo(madrid('2026-11-16', '09:00'))
  return reservarCita(c.bd, ahoraAntes, e.clinica.id, { ...ids(), inicio: madrid(D, desde) })
}
const estadoDe = async (id: string) => (await c.bd.select().from(cita).where(eq(cita.id, id)))[0].estado

describe('cerrar cita', () => {
  it('H3.1: completar una cita ya empezada sigue ocupando el hueco', async () => {
    const f = await poner('10:00', '10:45')
    await expect(cerrar(f.id, 'completar')).resolves.toEqual({ citaId: f.id, estado: 'completada' })
    await expect(reservarEnElMismoHueco('10:00')).rejects.toMatchObject({ codigo: 'HUECO_OCUPADO' })
  })

  it('H3.2: cancelar libera el hueco', async () => {
    const f = await poner('15:00', '15:45')
    await expect(cerrar(f.id, 'cancelar')).resolves.toMatchObject({ estado: 'cancelada' })
    await expect(reservarEnElMismoHueco('15:00')).resolves.toMatchObject({ estado: 'reservada' })
  })

  it('H3.3: marcar no asistida libera el hueco', async () => {
    const f = await poner('10:00', '10:45')
    await expect(cerrar(f.id, 'no_asistio')).resolves.toMatchObject({ estado: 'no_asistida' })
    await expect(reservarEnElMismoHueco('10:00')).resolves.toMatchObject({ estado: 'reservada' })
  })

  it('H3.4, FR-007, FR-008: una cita en estado final no se puede modificar', async () => {
    const f = await poner('10:00', '10:45')
    await cerrar(f.id, 'cancelar')
    for (const accion of ['completar', 'cancelar', 'no_asistio'] as const) {
      await expect(cerrar(f.id, accion)).rejects.toMatchObject({ codigo: 'ESTADO_FINAL' })
    }
    expect(await estadoDe(f.id)).toBe('cancelada')
  })

  it('H3.5, FR-016b: una cita pasada sin cerrar permanece reservada y sigue ocupando', async () => {
    const f = await poner('10:00', '10:45')
    reloj.fijar(madrid('2026-11-18', '18:00'))
    expect(await estadoDe(f.id)).toBe('reservada')
    await expect(reservarEnElMismoHueco('10:00')).rejects.toMatchObject({ codigo: 'HUECO_OCUPADO' })
  })

  it('H3.6, FR-016: CITA_NO_EMPEZADA al completar o marcar no asistida una cita futura', async () => {
    const f = await poner('15:00', '15:45')
    await expect(cerrar(f.id, 'completar')).rejects.toMatchObject({ codigo: 'CITA_NO_EMPEZADA' })
    await expect(cerrar(f.id, 'no_asistio')).rejects.toMatchObject({ codigo: 'CITA_NO_EMPEZADA' })
    expect(await estadoDe(f.id)).toBe('reservada')
  })

  it('FR-024: NO_ENCONTRADO para una cita de otra clínica o inexistente', async () => {
    const f = await poner('10:00', '10:45')
    const otra = await crearClinica(c.bd, { nombre: 'Otra' })
    await expect(cerrarCita(c.bd, reloj, otra.id, { citaId: f.id, accion: 'cancelar' })).rejects.toMatchObject({
      codigo: 'NO_ENCONTRADO',
    })
    await expect(cerrar('00000000-0000-4000-8000-000000000000', 'cancelar')).rejects.toMatchObject({
      codigo: 'NO_ENCONTRADO',
    })
    expect(await estadoDe(f.id)).toBe('reservada')
  })

  it('FR-007: dos cierres simultáneos de la misma cita → exactamente uno se aplica y el otro recibe ESTADO_FINAL', async () => {
    for (let i = 0; i < 10; i++) {
      await limpiarBd(c)
      e = await crearEscenario(c.bd)
      const f = await poner('10:00', '10:45')
      const r = await Promise.allSettled([cerrar(f.id, 'completar'), cerrar(f.id, 'cancelar'), cerrar(f.id, 'no_asistio')])
      expect(r.filter((x) => x.status === 'fulfilled')).toHaveLength(1)
      const rechazos = r.filter((x) => x.status === 'rejected') as PromiseRejectedResult[]
      expect(rechazos.every((x) => x.reason?.codigo === 'ESTADO_FINAL')).toBe(true)
    }
  })
})
