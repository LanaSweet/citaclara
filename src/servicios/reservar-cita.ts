import { and, eq, sql } from 'drizzle-orm'
import type { Bd } from '@/bd/cliente'
import { cita, paciente, profesional, servicio } from '@/bd/esquema'
import { calcularFin, type Reloj } from '@/dominio/cita'
import { ErrorNegocio } from '@/dominio/errores'
import { dentroDeHorario } from '@/dominio/horario'

export interface PeticionReserva {
  profesionalId: string
  servicioId: string
  pacienteId: string
  inicio: Date
}

export interface CitaReservada {
  citaId: string
  inicio: Date
  fin: Date
  estado: 'reservada'
}

/** Código SQL del error, esté en el propio error o en su causa (Drizzle lo envuelve). */
export function codigoSql(err: unknown): string | undefined {
  const e = err as { code?: string; cause?: { code?: string } }
  return e?.code ?? e?.cause?.code
}

/**
 * Reserva una cita. La atomicidad frente a reservas simultáneas la da la restricción
 * `cita_sin_solape` de la BD: aquí no hay comprobación previa de solape (D4).
 */
export async function reservarCita(
  bd: Bd,
  reloj: Reloj,
  clinicaId: string,
  peticion: PeticionReserva,
): Promise<CitaReservada> {
  const [prof] = await bd
    .select({ id: profesional.id })
    .from(profesional)
    .where(and(eq(profesional.id, peticion.profesionalId), eq(profesional.clinicaId, clinicaId)))
  const [serv] = await bd
    .select({ duracionMin: servicio.duracionMin })
    .from(servicio)
    .where(and(eq(servicio.id, peticion.servicioId), eq(servicio.clinicaId, clinicaId)))
  const [pac] = await bd
    .select({ id: paciente.id })
    .from(paciente)
    .where(and(eq(paciente.id, peticion.pacienteId), eq(paciente.clinicaId, clinicaId)))
  if (!prof || !serv || !pac) throw new ErrorNegocio('NO_ENCONTRADO')

  if (peticion.inicio.getTime() <= reloj.ahora().getTime()) throw new ErrorNegocio('EN_EL_PASADO')

  const fin = calcularFin(peticion.inicio, serv.duracionMin)
  if (!dentroDeHorario(peticion.inicio, fin)) throw new ErrorNegocio('FUERA_DE_HORARIO')

  // Con varias inserciones simultáneas del mismo hueco, el índice GiST de la restricción puede
  // provocar un interbloqueo (40P01) en lugar de 23P01. El bloqueo asesor por profesional
  // serializa las reservas de un mismo profesional y evita ese caso; la garantía de no
  // solape sigue siendo `cita_sin_solape`. Si aun así hubiera un 40P01, se reintenta.
  for (let intento = 1; ; intento++) {
    try {
      const fila = await bd.transaction(async (tx) => {
        await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtextextended(${peticion.profesionalId}, 0))`)
        const [insertada] = await tx
          .insert(cita)
          .values({
            clinicaId,
            profesionalId: peticion.profesionalId,
            servicioId: peticion.servicioId,
            pacienteId: peticion.pacienteId,
            inicio: peticion.inicio,
            fin,
            estado: 'reservada',
          })
          .returning({ id: cita.id })
        return insertada
      })
      return { citaId: fila.id, inicio: peticion.inicio, fin, estado: 'reservada' }
    } catch (err) {
      const codigo = codigoSql(err)
      if (codigo === '23P01') throw new ErrorNegocio('HUECO_OCUPADO')
      if (codigo === '40P01' && intento < 3) continue
      throw err
    }
  }
}
