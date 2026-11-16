'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { obtenerBd } from '@/bd/cliente'
import { envolverAccion } from '@/app/envolver-accion'
import type { Estado } from '@/dominio/cita'
import { ErrorNegocio, type Resultado } from '@/dominio/errores'
import { cerrarCita as cerrar } from '@/servicios/cerrar-cita'
import { RelojSistema } from '@/servicios/reloj'

const esquema = z.object({
  citaId: z.uuid(),
  accion: z.enum(['completar', 'cancelar', 'no_asistio']),
})

export async function cerrarCita(entrada: unknown): Promise<Resultado<{ citaId: string; estado: Estado }>> {
  const resultado = await envolverAccion(async (clinicaId) => {
    const datos = esquema.safeParse(entrada)
    if (!datos.success) throw new ErrorNegocio('NO_ENCONTRADO')
    return cerrar(obtenerBd(), new RelojSistema(), clinicaId, datos.data)
  })
  revalidatePath('/agenda')
  return resultado
}
