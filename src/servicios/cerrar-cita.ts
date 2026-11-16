import { and, eq } from 'drizzle-orm'
import type { Bd } from '@/bd/cliente'
import { cita } from '@/bd/esquema'
import { transicionar, type Accion, type Estado, type Reloj } from '@/dominio/cita'
import { ErrorNegocio } from '@/dominio/errores'

/**
 * Cierra una cita reservada (completar, cancelar o marcar no asistida). La actualización es
 * condicional (`WHERE estado = 'reservada'`): dos cierres simultáneos no pueden aplicarse ambos.
 */
export async function cerrarCita(
  bd: Bd,
  reloj: Reloj,
  clinicaId: string,
  peticion: { citaId: string; accion: Accion },
): Promise<{ citaId: string; estado: Estado }> {
  const [actual] = await bd
    .select({ estado: cita.estado, inicio: cita.inicio })
    .from(cita)
    .where(and(eq(cita.id, peticion.citaId), eq(cita.clinicaId, clinicaId)))
  if (!actual) throw new ErrorNegocio('NO_ENCONTRADO')

  const nuevo = transicionar(actual.estado, peticion.accion, actual.inicio, reloj.ahora())

  const filas = await bd
    .update(cita)
    .set({ estado: nuevo })
    .where(and(eq(cita.id, peticion.citaId), eq(cita.clinicaId, clinicaId), eq(cita.estado, 'reservada')))
    .returning({ id: cita.id })
  if (filas.length === 0) throw new ErrorNegocio('ESTADO_FINAL')

  return { citaId: peticion.citaId, estado: nuevo }
}
