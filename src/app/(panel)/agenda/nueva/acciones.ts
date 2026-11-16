'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { obtenerBd } from '@/bd/cliente'
import { envolverAccion } from '@/app/envolver-accion'
import { ErrorNegocio, type Resultado } from '@/dominio/errores'
import { previsualizarCita as previsualizar } from '@/servicios/previsualizar-cita'
import { reservarCita as reservar } from '@/servicios/reservar-cita'
import { RelojSistema } from '@/servicios/reloj'

const inicioIso = z.iso.datetime({ offset: true })
const esquemaReserva = z.object({
  profesionalId: z.uuid(),
  servicioId: z.uuid(),
  pacienteId: z.uuid(),
  inicio: inicioIso,
})
const esquemaPrevia = z.object({ servicioId: z.uuid(), inicio: inicioIso })

export interface CitaReservadaDto {
  citaId: string
  inicio: string
  fin: string
  estado: 'reservada'
}

export async function reservarCita(entrada: unknown): Promise<Resultado<CitaReservadaDto>> {
  const resultado = await envolverAccion(async (clinicaId) => {
    const datos = esquemaReserva.safeParse(entrada)
    if (!datos.success) throw new ErrorNegocio('NO_ENCONTRADO')
    const r = await reservar(obtenerBd(), new RelojSistema(), clinicaId, {
      ...datos.data,
      inicio: new Date(datos.data.inicio),
    })
    return { citaId: r.citaId, inicio: r.inicio.toISOString(), fin: r.fin.toISOString(), estado: r.estado }
  })
  // La agenda cambia con una reserva; tras un choque, la interfaz la recarga actualizada (FR-011).
  if (resultado.ok || resultado.codigo === 'HUECO_OCUPADO') revalidatePath('/agenda')
  return resultado
}

export async function previsualizarCita(entrada: unknown): Promise<Resultado<{ inicio: string; fin: string }>> {
  return envolverAccion(async (clinicaId) => {
    const datos = esquemaPrevia.safeParse(entrada)
    if (!datos.success) throw new ErrorNegocio('NO_ENCONTRADO')
    const r = await previsualizar(obtenerBd(), clinicaId, { ...datos.data, inicio: new Date(datos.data.inicio) })
    return { inicio: r.inicio.toISOString(), fin: r.fin.toISOString() }
  })
}
