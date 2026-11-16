import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import { asc, count, eq } from 'drizzle-orm'
import { cita, clinica, paciente, profesional, servicio } from '@/bd/esquema'
import type { Cliente } from '@/bd/cliente'
import { cargarSemilla } from '@/semilla/cargar'
import { CLAVE_DEMO } from '@/semilla/datos'
import { accesoPorClaveDeClinica } from '@/servicios/acceso'
import { abrirBdPruebas, limpiarBd, madrid } from '../ayudas/bd'

let c: Cliente
const ANCLA = '2026-11-16'
// Miércoles de la semana del ancla, a mitad de jornada.
const AHORA = madrid('2026-11-18', '12:00')

beforeEach(async () => {
  c ??= await abrirBdPruebas()
  await limpiarBd(c)
})
afterAll(() => c?.sql.end())

const cargar = (ahora = AHORA) => cargarSemilla(c.bd, { ancla: ANCLA, ahora })

describe('semilla de demostración', () => {
  it('H5.1: Clínica Eleva con María y Jorge en Fisioterapia y Lucía en Nutrición', async () => {
    await cargar()
    const [eleva] = await c.bd.select().from(clinica)
    expect(eleva.nombre).toBe('Clínica Eleva')
    const profs = await c.bd.select().from(profesional).orderBy(asc(profesional.nombre))
    expect(profs.map((p) => [p.nombre, p.especialidad])).toEqual([
      ['Jorge', 'Fisioterapia'],
      ['Lucía', 'Nutrición'],
      ['María', 'Fisioterapia'],
    ])
  })

  it('H5.2: los 4 servicios con sus duraciones e importes', async () => {
    await cargar()
    const s = await c.bd.select().from(servicio)
    expect(s.map((x) => [x.duracionMin, x.importeCentimos]).sort()).toEqual(
      [
        [45, 4000],
        [60, 5000],
        [30, 3500],
        [45, 4500],
      ].sort(),
    )
  })

  it('H5.3: unos 40 pacientes con teléfono y email', async () => {
    await cargar()
    const p = await c.bd.select().from(paciente)
    expect(p.length).toBeGreaterThanOrEqual(38)
    expect(p.length).toBeLessThanOrEqual(42)
    expect(p.every((x) => x.telefono && x.email.includes('@'))).toBe(true)
  })

  it('SC-007: no asistidas 10 % ± 2, canceladas 8 % ± 2 y el resto completadas; ninguna historia en reservada', async () => {
    await cargar()
    const anclaInst = madrid(ANCLA, '00:00')
    const historia = (await c.bd.select().from(cita)).filter((x) => x.inicio < anclaInst)
    expect(historia.length).toBeGreaterThan(300)
    const pct = (e: string) => (historia.filter((x) => x.estado === e).length / historia.length) * 100
    expect(pct('no_asistida')).toBeGreaterThanOrEqual(8)
    expect(pct('no_asistida')).toBeLessThanOrEqual(12)
    expect(pct('cancelada')).toBeGreaterThanOrEqual(6)
    expect(pct('cancelada')).toBeLessThanOrEqual(10)
    expect(historia.filter((x) => x.estado === 'reservada')).toHaveLength(0)
    expect(pct('completada')).toBeGreaterThan(75)
  })

  it('H5.4, FR-022: 2 semanas futuras, todas reservadas y con inicio posterior a ahora (mitad de la semana del ancla)', async () => {
    await cargar()
    const anclaInst = madrid(ANCLA, '00:00')
    const futuras = (await c.bd.select().from(cita)).filter((x) => x.inicio >= anclaInst)
    expect(futuras.length).toBeGreaterThan(50)
    expect(futuras.every((x) => x.estado === 'reservada')).toBe(true)
    expect(futuras.every((x) => x.inicio > AHORA)).toBe(true)
    const ultimo = madrid('2026-11-30', '00:00') // fin de la segunda semana
    expect(futuras.every((x) => x.inicio < ultimo)).toBe(true)
  })

  it('FR-022: ninguna cita reservada queda en el pasado aunque ahora sea posterior al ancla', async () => {
    const ahora = madrid('2026-11-25', '09:00')
    await cargar(ahora)
    const reservadas = (await c.bd.select().from(cita)).filter((x) => x.estado === 'reservada')
    expect(reservadas.length).toBeGreaterThan(0)
    expect(reservadas.every((x) => x.inicio > ahora)).toBe(true)
  })

  it('FR-023: cero solapes entre reservadas y completadas del mismo profesional', async () => {
    await cargar()
    const todas = (await c.bd.select().from(cita).orderBy(asc(cita.profesionalId), asc(cita.inicio))).filter(
      (x) => x.estado === 'reservada' || x.estado === 'completada',
    )
    for (let i = 1; i < todas.length; i++) {
      if (todas[i].profesionalId === todas[i - 1].profesionalId) {
        expect(todas[i].inicio.getTime()).toBeGreaterThanOrEqual(todas[i - 1].fin.getTime())
      }
    }
  })

  it('FR-001: la clave de la demo da acceso a Clínica Eleva', async () => {
    const r = await cargar()
    expect(await accesoPorClaveDeClinica(c.bd).verificarClave(CLAVE_DEMO)).toBe(r.clinicaId)
  })

  it('SC-006, H5.5: dos cargas en BD limpia producen exactamente los mismos datos (ids y creada_en incluidos)', async () => {
    const volcar = async () => ({
      clinica: (await c.bd.select({ id: clinica.id, nombre: clinica.nombre }).from(clinica)),
      profesionales: await c.bd.select().from(profesional).orderBy(asc(profesional.id)),
      servicios: await c.bd.select().from(servicio).orderBy(asc(servicio.id)),
      pacientes: await c.bd.select().from(paciente).orderBy(asc(paciente.id)),
      citas: await c.bd.select().from(cita).orderBy(asc(cita.id)),
    })
    await cargar()
    const primera = await volcar()
    await limpiarBd(c)
    await cargar()
    const segunda = await volcar()
    expect(segunda).toEqual(primera)
    expect(primera.citas.length).toBeGreaterThan(300)
  })

  it('SC-006: recargar sobre datos existentes reemplaza Clínica Eleva sin duplicarla', async () => {
    await cargar()
    await cargar()
    const [{ n }] = await c.bd.select({ n: count() }).from(clinica).where(eq(clinica.nombre, 'Clínica Eleva'))
    expect(n).toBe(1)
  })
})
