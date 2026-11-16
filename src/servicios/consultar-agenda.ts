import { and, asc, eq, gte, inArray, lt } from 'drizzle-orm'
import type { Bd } from '@/bd/cliente'
import { cita, paciente, profesional, servicio } from '@/bd/esquema'
import { pendienteDeCerrar, type Estado, type Reloj } from '@/dominio/cita'
import { limitesDelDia } from '@/dominio/fechas'
import { huecosLibres } from '@/dominio/horario'

export type TramoAgenda =
  | { tipo: 'libre'; inicio: string; fin: string }
  | {
      tipo: 'cita'
      citaId: string
      inicio: string
      fin: string
      paciente: string
      servicio: string
      importeCentimos: number
      estado: Estado
      pendienteDeCerrar: boolean
    }

export interface AgendaProfesional {
  profesionalId: string
  nombre: string
  especialidad: string
  tramos: TramoAgenda[]
}

/**
 * Agenda de un día local de Madrid, por profesional. Las citas canceladas y no asistidas
 * no ocupan: su tramo cuenta como libre. Los instantes viajan en ISO 8601 UTC.
 */
export async function consultarAgenda(
  bd: Bd,
  reloj: Reloj,
  clinicaId: string,
  fechaIso: string,
): Promise<AgendaProfesional[]> {
  const { inicio, fin } = limitesDelDia(fechaIso) // lanza FECHA_INVALIDA
  const ahora = reloj.ahora()

  const profesionales = await bd
    .select()
    .from(profesional)
    .where(eq(profesional.clinicaId, clinicaId))
    .orderBy(asc(profesional.nombre))

  const citas = await bd
    .select({
      id: cita.id,
      profesionalId: cita.profesionalId,
      inicio: cita.inicio,
      fin: cita.fin,
      estado: cita.estado,
      paciente: paciente.nombre,
      servicio: servicio.nombre,
      importeCentimos: servicio.importeCentimos,
    })
    .from(cita)
    .innerJoin(paciente, eq(paciente.id, cita.pacienteId))
    .innerJoin(servicio, eq(servicio.id, cita.servicioId))
    .where(
      and(
        eq(cita.clinicaId, clinicaId),
        gte(cita.inicio, inicio),
        lt(cita.inicio, fin),
        inArray(cita.estado, ['reservada', 'completada']),
      ),
    )
    .orderBy(asc(cita.inicio))

  return profesionales.map((p) => {
    const suyas = citas.filter((c) => c.profesionalId === p.id)
    const libres = huecosLibres(
      suyas.map((c) => ({ inicio: c.inicio, fin: c.fin })),
      fechaIso,
    )
    const tramos: TramoAgenda[] = [
      ...suyas.map(
        (c): TramoAgenda => ({
          tipo: 'cita',
          citaId: c.id,
          inicio: c.inicio.toISOString(),
          fin: c.fin.toISOString(),
          paciente: c.paciente,
          servicio: c.servicio,
          importeCentimos: c.importeCentimos,
          estado: c.estado,
          pendienteDeCerrar: pendienteDeCerrar(c.estado, c.inicio, ahora),
        }),
      ),
      ...libres.map((l): TramoAgenda => ({ tipo: 'libre', inicio: l.inicio.toISOString(), fin: l.fin.toISOString() })),
    ].sort((a, b) => a.inicio.localeCompare(b.inicio))
    return { profesionalId: p.id, nombre: p.nombre, especialidad: p.especialidad, tramos }
  })
}
