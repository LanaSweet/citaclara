import { eq } from 'drizzle-orm'
import type { Bd } from '@/bd/cliente'
import { cita, clinica, paciente, profesional, servicio } from '@/bd/esquema'
import { esquemaPaciente } from '@/dominio/paciente'
import { hashearClave } from '@/servicios/acceso'
import { CLAVE_DEMO, NOMBRE_CLINICA } from './datos'
import { generarSemilla } from './generar'

export interface ResumenSemilla {
  clinicaId: string
  clave: string
  profesionales: number
  servicios: number
  pacientes: number
  citasPorEstado: Record<string, number>
}

/** Borra e inserta Clínica Eleva en una transacción a partir de los datos deterministas. */
export async function cargarSemilla(bd: Bd, opciones: { ancla: string; ahora: Date }): Promise<ResumenSemilla> {
  const datos = generarSemilla(opciones)
  const pacientes = datos.pacientes.map((p) => ({ ...p, ...esquemaPaciente.parse(p) }))
  const claveHash = await hashearClave(CLAVE_DEMO)

  await bd.transaction(async (tx) => {
    const previas = await tx.select({ id: clinica.id }).from(clinica).where(eq(clinica.nombre, NOMBRE_CLINICA))
    for (const { id } of previas) {
      await tx.delete(cita).where(eq(cita.clinicaId, id))
      await tx.delete(paciente).where(eq(paciente.clinicaId, id))
      await tx.delete(servicio).where(eq(servicio.clinicaId, id))
      await tx.delete(profesional).where(eq(profesional.clinicaId, id))
      await tx.delete(clinica).where(eq(clinica.id, id))
    }
    await tx.insert(clinica).values({ ...datos.clinica, claveHash })
    await tx.insert(profesional).values(datos.profesionales)
    await tx.insert(servicio).values(datos.servicios)
    await tx.insert(paciente).values(pacientes)
    for (let i = 0; i < datos.citas.length; i += 500) {
      await tx.insert(cita).values(datos.citas.slice(i, i + 500))
    }
  })

  const citasPorEstado: Record<string, number> = {}
  for (const c of datos.citas) citasPorEstado[c.estado] = (citasPorEstado[c.estado] ?? 0) + 1
  return {
    clinicaId: datos.clinica.id,
    clave: CLAVE_DEMO,
    profesionales: datos.profesionales.length,
    servicios: datos.servicios.length,
    pacientes: pacientes.length,
    citasPorEstado,
  }
}
