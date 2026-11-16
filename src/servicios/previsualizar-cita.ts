import { and, eq } from 'drizzle-orm'
import type { Bd } from '@/bd/cliente'
import { servicio } from '@/bd/esquema'
import { calcularFin } from '@/dominio/cita'
import { ErrorNegocio } from '@/dominio/errores'

/** Calcula el fin sin escribir ni comprobar disponibilidad (FR-015). */
export async function previsualizarCita(
  bd: Bd,
  clinicaId: string,
  peticion: { servicioId: string; inicio: Date },
): Promise<{ inicio: Date; fin: Date }> {
  const [serv] = await bd
    .select({ duracionMin: servicio.duracionMin })
    .from(servicio)
    .where(and(eq(servicio.id, peticion.servicioId), eq(servicio.clinicaId, clinicaId)))
  if (!serv) throw new ErrorNegocio('NO_ENCONTRADO')
  return { inicio: peticion.inicio, fin: calcularFin(peticion.inicio, serv.duracionMin) }
}
