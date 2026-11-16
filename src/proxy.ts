import { NextResponse, type NextRequest } from 'next/server'
import { NOMBRE_COOKIE, verificarToken } from '@/servicios/sesion'

/** Sin sesión válida, cualquier petición a /agenda/** redirige a /acceso sin mostrar datos (H4.1). */
export async function proxy(peticion: NextRequest) {
  const clinicaId = await verificarToken(peticion.cookies.get(NOMBRE_COOKIE)?.value)
  if (!clinicaId) return NextResponse.redirect(new URL('/acceso', peticion.url))
  return NextResponse.next()
}

export const config = { matcher: ['/agenda/:path*'] }
