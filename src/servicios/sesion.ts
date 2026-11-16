import { jwtVerify, SignJWT } from 'jose'
import { ErrorNegocio } from '@/dominio/errores'

export const NOMBRE_COOKIE = 'citaclara_sesion'
const DURACION_S = 60 * 60 * 12

function clave(): Uint8Array {
  const secreto = process.env.SESION_SECRETO
  if (!secreto || secreto.length < 32) throw new Error('SESION_SECRETO debe tener al menos 32 caracteres.')
  return new TextEncoder().encode(secreto)
}

export async function firmarToken(clinicaId: string): Promise<string> {
  return new SignJWT({ clinicaId })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${DURACION_S}s`)
    .sign(clave())
}

/** Devuelve el `clinicaId` del token o `null` si falta, está manipulado o ha caducado. */
export async function verificarToken(token: string | undefined): Promise<string | null> {
  if (!token) return null
  try {
    const { payload } = await jwtVerify(token, clave(), { algorithms: ['HS256'] })
    return typeof payload.clinicaId === 'string' ? payload.clinicaId : null
  } catch {
    return null
  }
}

/** Emite la cookie de sesión: `httpOnly`, `sameSite=lax` y `secure` solo en producción. */
export async function crearSesion(clinicaId: string): Promise<void> {
  const { cookies } = await import('next/headers')
  const almacen = await cookies()
  almacen.set(NOMBRE_COOKIE, await firmarToken(clinicaId), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: DURACION_S,
  })
}

/** Clínica de la sesión actual; lanza `NO_AUTORIZADO` sin cookie válida (FR-018, FR-024). */
export async function obtenerClinicaId(): Promise<string> {
  const { cookies } = await import('next/headers')
  const almacen = await cookies()
  const clinicaId = await verificarToken(almacen.get(NOMBRE_COOKIE)?.value)
  if (!clinicaId) throw new ErrorNegocio('NO_AUTORIZADO')
  return clinicaId
}
