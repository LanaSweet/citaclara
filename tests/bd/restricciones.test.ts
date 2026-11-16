import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import { eq } from 'drizzle-orm'
import { cita } from '@/bd/esquema'
import type { Cliente } from '@/bd/cliente'
import { abrirBdPruebas, crearCita, crearClinica, crearEscenario, crearPaciente, crearProfesional, crearServicio, limpiarBd, madrid } from '../ayudas/bd'

let c: Cliente
let e: Awaited<ReturnType<typeof crearEscenario>>

beforeEach(async () => {
  c ??= await abrirBdPruebas()
  await limpiarBd(c)
  e = await crearEscenario(c.bd)
})
afterAll(() => c?.sql.end())

const D = '2026-11-17'
const base = () => ({
  clinicaId: e.clinica.id,
  profesionalId: e.profesional.id,
  servicioId: e.servicio.id,
  pacienteId: e.paciente.id,
})
const tramo = (desde: string, hasta: string) => ({ inicio: madrid(D, desde), fin: madrid(D, hasta) })

/** El código SQL llega en el error o en su causa según la versión de Drizzle. */
async function codigoDe(promesa: Promise<unknown>): Promise<string | undefined> {
  try {
    await promesa
  } catch (err) {
    const x = err as { code?: string; cause?: { code?: string } }
    return x.code ?? x.cause?.code
  }
  return undefined
}

describe('restricciones de la BD', () => {
  it('FR-009: cita_sin_solape rechaza un solape parcial con 23P01', async () => {
    await crearCita(c.bd, { ...base(), ...tramo('10:00', '10:45') })
    expect(await codigoDe(crearCita(c.bd, { ...base(), ...tramo('10:30', '11:15') }))).toBe('23P01')
  })

  it('FR-009: cita_sin_solape rechaza la contención con 23P01', async () => {
    await crearCita(c.bd, { ...base(), ...tramo('10:00', '12:00') })
    expect(await codigoDe(crearCita(c.bd, { ...base(), ...tramo('10:30', '11:00') }))).toBe('23P01')
  })

  it('FR-009: cita_sin_solape rechaza el mismo tramo con 23P01', async () => {
    await crearCita(c.bd, { ...base(), ...tramo('10:00', '10:45') })
    expect(await codigoDe(crearCita(c.bd, { ...base(), ...tramo('10:00', '10:45') }))).toBe('23P01')
  })

  it('FR-010, H1.4: acepta tramos contiguos', async () => {
    await crearCita(c.bd, { ...base(), ...tramo('10:00', '10:45') })
    expect(await codigoDe(crearCita(c.bd, { ...base(), ...tramo('10:45', '11:30') }))).toBeUndefined()
  })

  it('FR-009: acepta el mismo tramo si la otra cita está cancelada o no asistida', async () => {
    await crearCita(c.bd, { ...base(), ...tramo('10:00', '10:45'), estado: 'cancelada' })
    await crearCita(c.bd, { ...base(), ...tramo('10:00', '10:45'), estado: 'no_asistida' })
    expect(await codigoDe(crearCita(c.bd, { ...base(), ...tramo('10:00', '10:45') }))).toBeUndefined()
  })

  it('FR-009: una cita completada sigue ocupando el hueco', async () => {
    await crearCita(c.bd, { ...base(), ...tramo('10:00', '10:45'), estado: 'completada' })
    expect(await codigoDe(crearCita(c.bd, { ...base(), ...tramo('10:15', '11:00') }))).toBe('23P01')
  })

  it('H1.7: acepta el mismo tramo con profesionales distintos', async () => {
    const otro = await crearProfesional(c.bd, e.clinica.id, 'Jorge')
    await crearCita(c.bd, { ...base(), ...tramo('10:00', '10:45') })
    expect(await codigoDe(crearCita(c.bd, { ...base(), profesionalId: otro.id, ...tramo('10:00', '10:45') }))).toBeUndefined()
  })

  it('FR-007: el disparador rechaza cambiar el estado de una cita final', async () => {
    const f = await crearCita(c.bd, { ...base(), ...tramo('10:00', '10:45'), estado: 'completada' })
    expect(await codigoDe(c.bd.update(cita).set({ estado: 'cancelada' }).where(eq(cita.id, f.id)))).toBe('P0001')
  })

  it('FR-007: el disparador permite cerrar una cita reservada', async () => {
    const f = await crearCita(c.bd, { ...base(), ...tramo('10:00', '10:45') })
    expect(await codigoDe(c.bd.update(cita).set({ estado: 'cancelada' }).where(eq(cita.id, f.id)))).toBeUndefined()
  })

  it('FR-003: CHECK de duración positiva', async () => {
    expect(await codigoDe(crearServicio(c.bd, e.clinica.id, { duracionMin: 0 }))).toBe('23514')
  })

  it('FR-003: CHECK de importe no negativo', async () => {
    expect(await codigoDe(crearServicio(c.bd, e.clinica.id, { importeCentimos: -1 }))).toBe('23514')
  })

  it('FR-005: CHECK de fin posterior a inicio', async () => {
    expect(await codigoDe(crearCita(c.bd, { ...base(), ...tramo('10:45', '10:00') }))).toBe('23514')
    expect(await codigoDe(crearCita(c.bd, { ...base(), ...tramo('10:00', '10:00') }))).toBe('23514')
  })

  it('FR-024: la clave foránea compuesta rechaza un paciente de otra clínica', async () => {
    const otra = await crearClinica(c.bd, { nombre: 'Otra clínica' })
    const ajeno = await crearPaciente(c.bd, otra.id, 'Paciente ajeno')
    expect(await codigoDe(crearCita(c.bd, { ...base(), pacienteId: ajeno.id, ...tramo('10:00', '10:45') }))).toBe('23503')
  })

  it('FR-024: la clave foránea compuesta rechaza profesional y servicio de otra clínica', async () => {
    const otra = await crearClinica(c.bd, { nombre: 'Otra clínica' })
    const pAjeno = await crearProfesional(c.bd, otra.id)
    const sAjeno = await crearServicio(c.bd, otra.id)
    expect(await codigoDe(crearCita(c.bd, { ...base(), profesionalId: pAjeno.id, ...tramo('10:00', '10:45') }))).toBe('23503')
    expect(await codigoDe(crearCita(c.bd, { ...base(), servicioId: sAjeno.id, ...tramo('10:00', '10:45') }))).toBe('23503')
  })
})
