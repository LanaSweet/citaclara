import { ErrorNegocio, type Resultado } from '@/dominio/errores'
import { obtenerClinicaId } from '@/servicios/sesion'

const MENSAJE_GENERICO = 'Ha ocurrido un problema inesperado. Inténtalo de nuevo en unos instantes.'

/** Ejecuta `fn` y convierte los errores en `Resultado` sin trazas ni códigos SQL (FR-017). */
export async function ejecutar<T>(fn: () => Promise<T>): Promise<Resultado<T>> {
  try {
    return { ok: true, datos: await fn() }
  } catch (e) {
    if (e instanceof ErrorNegocio) return { ok: false, codigo: e.codigo, mensaje: e.message }
    console.error(e)
    return { ok: false, codigo: 'NO_ENCONTRADO', mensaje: MENSAJE_GENERICO }
  }
}

/** Ejecuta un caso de uso con el `clinicaId` de la sesión. */
export function envolverAccion<T>(fn: (clinicaId: string) => Promise<T>): Promise<Resultado<T>> {
  return ejecutar(async () => fn(await obtenerClinicaId()))
}
