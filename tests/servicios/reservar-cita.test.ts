import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import { count } from 'drizzle-orm'
import { cita } from '@/bd/esquema'
import type { Cliente } from '@/bd/cliente'
import { reservarCita } from '@/servicios/reservar-cita'
import { RelojFijo } from '@/servicios/reloj'
import { abrirBdPruebas, crearCita, crearClinica, crearEscenario, crearPaciente, crearProfesional, crearServicio, limpiarBd, madrid } from '../ayudas/bd'

let c: Cliente
let e: Awaited<ReturnType<typeof crearEscenario>>
// Lunes 16/11/2026 a las 09:00; las reservas de prueba son el martes 17.
const reloj = new RelojFijo(madrid('2026-11-16', '09:00'))
const D = '2026-11-17'

beforeEach(async () => {
  c ??= await abrirBdPruebas()
  await limpiarBd(c)
  e = await crearEscenario(c.bd)
  reloj.fijar(madrid('2026-11-16', '09:00'))
})
afterAll(() => c?.sql.end())

const reservar = (hora: string, extra: Partial<{ profesionalId: string; servicioId: string; pacienteId: string }> = {}, dia = D) =>
  reservarCita(c.bd, reloj, e.clinica.id, {
    profesionalId: e.profesional.id,
    servicioId: e.servicio.id,
    pacienteId: e.paciente.id,
    inicio: madrid(dia, hora),
    ...extra,
  })
const base = () => ({
  clinicaId: e.clinica.id,
  profesionalId: e.profesional.id,
  servicioId: e.servicio.id,
  pacienteId: e.paciente.id,
})

describe('reservar cita', () => {
  it('FR-006, H1.1: una sesión de fisio de 45 minutos a las 10:00 acaba a las 10:45 y queda reservada', async () => {
    const r = await reservar('10:00')
    expect(r.fin.getTime()).toBe(madrid(D, '10:45').getTime())
    expect(r.estado).toBe('reservada')
    const [{ n }] = await c.bd.select({ n: count() }).from(cita)
    expect(n).toBe(1)
  })

  it('H1.2: un solape parcial a las 10:30 se rechaza con HUECO_OCUPADO', async () => {
    await reservar('10:00')
    await expect(reservar('10:30')).rejects.toMatchObject({ codigo: 'HUECO_OCUPADO' })
  })

  it('H1.3: solapar con una cita completada se rechaza', async () => {
    await crearCita(c.bd, { ...base(), inicio: madrid(D, '10:00'), fin: madrid(D, '10:45'), estado: 'completada' })
    await expect(reservar('10:15')).rejects.toMatchObject({ codigo: 'HUECO_OCUPADO' })
  })

  it('H1.4, FR-010: una cita contigua a las 10:45 se acepta', async () => {
    await reservar('10:00')
    await expect(reservar('10:45')).resolves.toMatchObject({ estado: 'reservada' })
  })

  it('FR-012, H1.6, SC-002: EN_EL_PASADO con un inicio anterior al instante actual', async () => {
    reloj.fijar(madrid(D, '12:00'))
    await expect(reservar('10:00')).rejects.toMatchObject({ codigo: 'EN_EL_PASADO' })
  })

  it('H1.6, SC-002: EN_EL_PASADO con un inicio igual al instante actual', async () => {
    reloj.fijar(madrid(D, '10:00'))
    await expect(reservar('10:00')).rejects.toMatchObject({ codigo: 'EN_EL_PASADO' })
  })

  it('H1.6: un inicio un minuto posterior al instante actual se acepta', async () => {
    reloj.fijar(madrid(D, '09:59'))
    await expect(reservar('10:00')).resolves.toMatchObject({ estado: 'reservada' })
  })

  it('H1.7: otro profesional a la misma hora se acepta', async () => {
    const jorge = await crearProfesional(c.bd, e.clinica.id, 'Jorge')
    await reservar('10:00')
    await expect(reservar('10:00', { profesionalId: jorge.id })).resolves.toMatchObject({ estado: 'reservada' })
  })

  it('FR-009: caso límite: una cita que contiene por completo a otra se rechaza', async () => {
    const larga = await crearServicio(c.bd, e.clinica.id, { nombre: 'Larga', duracionMin: 120 })
    await reservar('11:00')
    await expect(reservar('10:00', { servicioId: larga.id })).rejects.toMatchObject({ codigo: 'HUECO_OCUPADO' })
  })

  it('FR-009: el hueco liberado por una cita cancelada se puede reservar', async () => {
    await crearCita(c.bd, { ...base(), inicio: madrid(D, '10:00'), fin: madrid(D, '10:45'), estado: 'cancelada' })
    await expect(reservar('10:00')).resolves.toMatchObject({ estado: 'reservada' })
  })

  it('FR-009: el hueco liberado por una cita no asistida se puede reservar', async () => {
    await crearCita(c.bd, { ...base(), inicio: madrid(D, '10:00'), fin: madrid(D, '10:45'), estado: 'no_asistida' })
    await expect(reservar('10:00')).resolves.toMatchObject({ estado: 'reservada' })
  })

  it('FR-013: FUERA_DE_HORARIO antes de las 09:00, tras las 20:00, en sábado y domingo', async () => {
    await expect(reservar('08:30')).rejects.toMatchObject({ codigo: 'FUERA_DE_HORARIO' })
    await expect(reservar('19:30')).rejects.toMatchObject({ codigo: 'FUERA_DE_HORARIO' })
    await expect(reservar('10:00', {}, '2026-11-21')).rejects.toMatchObject({ codigo: 'FUERA_DE_HORARIO' })
    await expect(reservar('10:00', {}, '2026-11-22')).rejects.toMatchObject({ codigo: 'FUERA_DE_HORARIO' })
  })

  it('FR-013: una cita que acaba exactamente a las 20:00 se acepta', async () => {
    await expect(reservar('19:15')).resolves.toMatchObject({ estado: 'reservada' })
  })

  it('FR-024: NO_ENCONTRADO para profesional, servicio o paciente de otra clínica', async () => {
    const otra = await crearClinica(c.bd, { nombre: 'Otra' })
    const p = await crearProfesional(c.bd, otra.id)
    const s = await crearServicio(c.bd, otra.id)
    const pa = await crearPaciente(c.bd, otra.id)
    await expect(reservar('10:00', { profesionalId: p.id })).rejects.toMatchObject({ codigo: 'NO_ENCONTRADO' })
    await expect(reservar('10:00', { servicioId: s.id })).rejects.toMatchObject({ codigo: 'NO_ENCONTRADO' })
    await expect(reservar('10:00', { pacienteId: pa.id })).rejects.toMatchObject({ codigo: 'NO_ENCONTRADO' })
  })

  it('FR-024: NO_ENCONTRADO para identificadores inexistentes', async () => {
    await expect(reservar('10:00', { pacienteId: '00000000-0000-4000-8000-000000000000' })).rejects.toMatchObject({
      codigo: 'NO_ENCONTRADO',
    })
  })
})
