import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import type { Cliente } from '@/bd/cliente'
import { consultarAgenda } from '@/servicios/consultar-agenda'
import { RelojFijo } from '@/servicios/reloj'
import {
  abrirBdPruebas,
  crearCita,
  crearClinica,
  crearEscenario,
  crearPaciente,
  crearProfesional,
  crearServicio,
  limpiarBd,
  madrid,
} from '../ayudas/bd'

let c: Cliente
let e: Awaited<ReturnType<typeof crearEscenario>>
const D = '2026-11-17'
const reloj = new RelojFijo(madrid(D, '12:00'))

beforeEach(async () => {
  c ??= await abrirBdPruebas()
  await limpiarBd(c)
  e = await crearEscenario(c.bd)
})
afterAll(() => c?.sql.end())

const base = () => ({
  clinicaId: e.clinica.id,
  profesionalId: e.profesional.id,
  servicioId: e.servicio.id,
  pacienteId: e.paciente.id,
})
const poner = (desde: string, hasta: string, estado?: 'reservada' | 'completada' | 'cancelada' | 'no_asistida') =>
  crearCita(c.bd, { ...base(), inicio: madrid(D, desde), fin: madrid(D, hasta), estado })
const agenda = () => consultarAgenda(c.bd, reloj, e.clinica.id, D)
const resumen = (tramos: Awaited<ReturnType<typeof agenda>>[number]['tramos']) =>
  tramos.map((t) => [t.tipo, new Date(t.inicio).toISOString().slice(11, 16)].join('@'))

describe('consultar agenda', () => {
  it('FR-002, H2.1: cada profesional (nombre y especialidad) va por separado, con citas ordenadas por hora y huecos entre ellas', async () => {
    const jorge = await crearProfesional(c.bd, e.clinica.id, 'Jorge')
    await poner('11:00', '11:45')
    await poner('10:00', '10:45')
    await crearCita(c.bd, { ...base(), profesionalId: jorge.id, inicio: madrid(D, '09:00'), fin: madrid(D, '09:45') })

    const r = await agenda()
    expect(r.map((p) => p.nombre)).toEqual(['Jorge', 'María'])
    expect(r.map((p) => p.especialidad)).toEqual(['Fisioterapia', 'Fisioterapia'])
    // 10:00 local = 09:00 UTC en noviembre
    expect(resumen(r[1].tramos)).toEqual(['libre@08:00', 'cita@09:00', 'libre@09:45', 'cita@10:00', 'libre@10:45'])
    expect(resumen(r[0].tramos)).toEqual(['cita@08:00', 'libre@08:45'])
  })

  it('H2.2: las canceladas y no asistidas aparecen como tramo libre', async () => {
    await poner('10:00', '10:45', 'cancelada')
    await poner('11:00', '11:45', 'no_asistida')
    const [p] = await agenda()
    expect(p.tramos).toHaveLength(1)
    expect(p.tramos[0].tipo).toBe('libre')
  })

  it('H2.3: las completadas y reservadas ocupan y llevan su estado, paciente, servicio e importe', async () => {
    await poner('10:00', '10:45', 'completada')
    await poner('11:00', '11:45', 'reservada')
    const [p] = await agenda()
    const citas = p.tramos.filter((t) => t.tipo === 'cita')
    expect(citas.map((t) => t.estado)).toEqual(['completada', 'reservada'])
    expect(citas[0]).toMatchObject({ paciente: 'Ana Pérez', servicio: 'Sesión de fisioterapia', importeCentimos: 4000 })
  })

  it('H2.4: un día sin citas está libre durante todo el horario', async () => {
    const [p] = await agenda()
    expect(p.tramos).toHaveLength(1)
    expect(p.tramos[0]).toEqual({
      tipo: 'libre',
      inicio: madrid(D, '09:00').toISOString(),
      fin: madrid(D, '20:00').toISOString(),
    })
  })

  it('FR-016b, H3.5: pendienteDeCerrar solo para reservadas con inicio pasado', async () => {
    await poner('10:00', '10:45', 'reservada') // pasada (ahora = 12:00)
    await poner('11:00', '11:45', 'completada') // pasada pero cerrada
    await poner('15:00', '15:45', 'reservada') // futura
    const [p] = await agenda()
    const flags = p.tramos.filter((t) => t.tipo === 'cita').map((t) => t.pendienteDeCerrar)
    expect(flags).toEqual([true, false, false])
  })

  it('FR-016b: consultar la agenda nunca cambia el estado de las citas', async () => {
    const f = await poner('10:00', '10:45', 'reservada')
    await agenda()
    const [p] = await agenda()
    const t = p.tramos.find((x) => x.tipo === 'cita')
    expect(t).toMatchObject({ citaId: f.id, estado: 'reservada' })
  })

  it('FR-014: FECHA_INVALIDA con una fecha mal formada', async () => {
    await expect(consultarAgenda(c.bd, reloj, e.clinica.id, '17-11-2026')).rejects.toMatchObject({
      codigo: 'FECHA_INVALIDA',
    })
  })

  it('FR-019: una cita de la 00:30 local pertenece a su día de Madrid, no al día UTC', async () => {
    // Una cita a las 23:30 UTC del 16 es las 00:30 del 17 en Madrid: cae en el día 17.
    await crearCita(c.bd, { ...base(), inicio: new Date('2026-11-16T23:30:00Z'), fin: new Date('2026-11-17T00:15:00Z') })
    const [p] = await agenda()
    expect(p.tramos.some((t) => t.tipo === 'cita')).toBe(true)
  })

  it('FR-024: no aparecen datos de otra clínica', async () => {
    const otra = await crearClinica(c.bd, { nombre: 'Otra' })
    const p2 = await crearProfesional(c.bd, otra.id, 'Ajeno')
    const s2 = await crearServicio(c.bd, otra.id)
    const pa2 = await crearPaciente(c.bd, otra.id, 'Paciente ajeno')
    await crearCita(c.bd, {
      clinicaId: otra.id,
      profesionalId: p2.id,
      servicioId: s2.id,
      pacienteId: pa2.id,
      inicio: madrid(D, '10:00'),
      fin: madrid(D, '10:45'),
    })
    const r = await agenda()
    expect(r.map((p) => p.nombre)).toEqual(['María'])
    expect(JSON.stringify(r)).not.toContain('Paciente ajeno')
  })
})
