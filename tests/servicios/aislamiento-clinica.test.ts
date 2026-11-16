import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import type { Cliente } from '@/bd/cliente'
import { consultarAgenda } from '@/servicios/consultar-agenda'
import { reservarCita } from '@/servicios/reservar-cita'
import { cerrarCita } from '@/servicios/cerrar-cita'
import { listarPacientes, listarProfesionales, listarServicios } from '@/servicios/catalogo'
import { RelojFijo } from '@/servicios/reloj'
import { abrirBdPruebas, crearCita, crearEscenario, limpiarBd, madrid } from '../ayudas/bd'

let c: Cliente
const D = '2026-11-17'
const reloj = new RelojFijo(madrid(D, '12:00'))

beforeEach(async () => {
  c ??= await abrirBdPruebas()
  await limpiarBd(c)
})
afterAll(() => c?.sql.end())

async function dosClinicas() {
  const a = await crearEscenario(c.bd)
  const b = await crearEscenario(c.bd)
  const citaDeB = await crearCita(c.bd, {
    clinicaId: b.clinica.id,
    profesionalId: b.profesional.id,
    servicioId: b.servicio.id,
    pacienteId: b.paciente.id,
    inicio: madrid(D, '10:00'),
    fin: madrid(D, '10:45'),
  })
  return { a, b, citaDeB }
}

describe('aislamiento entre clínicas', () => {
  it('FR-024: con el clinicaId de una no se consulta la agenda de la otra', async () => {
    const { a } = await dosClinicas()
    const agenda = await consultarAgenda(c.bd, reloj, a.clinica.id, D)
    expect(agenda.map((p) => p.profesionalId)).toEqual([a.profesional.id])
    expect(agenda[0].tramos.every((t) => t.tipo === 'libre')).toBe(true)
  })

  it('FR-024: no se puede reservar con profesionales, servicios o pacientes de otra clínica', async () => {
    const { a, b } = await dosClinicas()
    const intento = (parcial: object) =>
      reservarCita(c.bd, reloj, a.clinica.id, {
        profesionalId: a.profesional.id,
        servicioId: a.servicio.id,
        pacienteId: a.paciente.id,
        inicio: madrid('2026-11-18', '10:00'),
        ...parcial,
      })
    await expect(intento({ profesionalId: b.profesional.id })).rejects.toMatchObject({ codigo: 'NO_ENCONTRADO' })
    await expect(intento({ servicioId: b.servicio.id })).rejects.toMatchObject({ codigo: 'NO_ENCONTRADO' })
    await expect(intento({ pacienteId: b.paciente.id })).rejects.toMatchObject({ codigo: 'NO_ENCONTRADO' })
  })

  it('FR-024: no se pueden cerrar las citas de otra clínica', async () => {
    const { a, citaDeB } = await dosClinicas()
    await expect(cerrarCita(c.bd, reloj, a.clinica.id, { citaId: citaDeB.id, accion: 'cancelar' })).rejects.toMatchObject({
      codigo: 'NO_ENCONTRADO',
    })
  })

  it('FR-024, FR-015: el catálogo solo lista datos de la propia clínica', async () => {
    const { a, b } = await dosClinicas()
    expect((await listarProfesionales(c.bd, a.clinica.id)).map((x) => x.id)).toEqual([a.profesional.id])
    expect((await listarServicios(c.bd, a.clinica.id)).map((x) => x.id)).toEqual([a.servicio.id])
    expect((await listarPacientes(c.bd, a.clinica.id)).map((x) => x.id)).toEqual([a.paciente.id])
    expect((await listarPacientes(c.bd, b.clinica.id)).map((x) => x.id)).toEqual([b.paciente.id])
  })
})
