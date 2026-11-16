import { asc, eq } from 'drizzle-orm'
import type { Bd } from '@/bd/cliente'
import { paciente, profesional, servicio } from '@/bd/esquema'

/** Listas del formulario de cita (FR-015). Solo de la clínica recibida, ordenadas por nombre. */
export function listarProfesionales(bd: Bd, clinicaId: string) {
  return bd
    .select({ id: profesional.id, nombre: profesional.nombre, especialidad: profesional.especialidad })
    .from(profesional)
    .where(eq(profesional.clinicaId, clinicaId))
    .orderBy(asc(profesional.nombre))
}

export function listarServicios(bd: Bd, clinicaId: string) {
  return bd
    .select({
      id: servicio.id,
      nombre: servicio.nombre,
      duracionMin: servicio.duracionMin,
      importeCentimos: servicio.importeCentimos,
    })
    .from(servicio)
    .where(eq(servicio.clinicaId, clinicaId))
    .orderBy(asc(servicio.nombre))
}

/** Solo se eligen pacientes ya existentes; no hay alta de pacientes (clarificación 2026-11-16). */
export function listarPacientes(bd: Bd, clinicaId: string) {
  return bd
    .select({ id: paciente.id, nombre: paciente.nombre })
    .from(paciente)
    .where(eq(paciente.clinicaId, clinicaId))
    .orderBy(asc(paciente.nombre))
}
