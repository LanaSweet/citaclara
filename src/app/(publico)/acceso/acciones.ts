'use server'

import { z } from 'zod'
import { obtenerBd } from '@/bd/cliente'
import { ejecutar } from '@/app/envolver-accion'
import { ErrorNegocio, type Resultado } from '@/dominio/errores'
import { accesoPorClaveDeClinica } from '@/servicios/acceso'
import { crearSesion } from '@/servicios/sesion'

const esquema = z.object({ clave: z.string().min(1) })

/** Valida la clave y emite la cookie de sesión; la interfaz redirige a `/agenda`. */
export async function acceder(entrada: unknown): Promise<Resultado<null>> {
  return ejecutar(async () => {
    const datos = esquema.safeParse(entrada)
    if (!datos.success) throw new ErrorNegocio('CLAVE_INCORRECTA')
    const clinicaId = await accesoPorClaveDeClinica(obtenerBd()).verificarClave(datos.data.clave)
    if (!clinicaId) throw new ErrorNegocio('CLAVE_INCORRECTA')
    await crearSesion(clinicaId)
    return null
  })
}
