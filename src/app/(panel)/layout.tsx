import Link from 'next/link'
import { redirect } from 'next/navigation'
import { CalendarCheck } from 'lucide-react'
import { eq } from 'drizzle-orm'
import { obtenerBd } from '@/bd/cliente'
import { clinica } from '@/bd/esquema'
import { ErrorNegocio } from '@/dominio/errores'
import { obtenerClinicaId } from '@/servicios/sesion'

export const dynamic = 'force-dynamic'

export default async function LayoutPanel({ children }: { children: React.ReactNode }) {
  let nombre: string
  try {
    const clinicaId = await obtenerClinicaId()
    const [fila] = await obtenerBd().select({ nombre: clinica.nombre }).from(clinica).where(eq(clinica.id, clinicaId))
    if (!fila) redirect('/acceso')
    nombre = fila.nombre
  } catch (e) {
    if (e instanceof ErrorNegocio) redirect('/acceso')
    throw e
  }

  return (
    <div className="min-h-dvh">
      <header className="border-b border-borde bg-superficie">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3">
          <Link href="/agenda" className="inline-flex min-h-11 items-center gap-2 font-bold">
            <span className="inline-flex size-9 items-center justify-center rounded-lg bg-primario text-primario-texto">
              <CalendarCheck aria-hidden className="size-5" />
            </span>
            <span>{nombre}</span>
          </Link>
          <Link
            href="/agenda/nueva"
            className="inline-flex min-h-11 items-center rounded-lg bg-primario px-4 text-sm font-semibold text-primario-texto hover:bg-primario-fuerte"
          >
            Nueva cita
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-5">{children}</main>
    </div>
  )
}
