import Link from 'next/link'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { formatearFecha, instanteMadrid, sumarDias } from '@/dominio/fechas'

const ENLACE =
  'inline-flex min-h-11 min-w-11 items-center justify-center gap-1 rounded-lg border border-borde bg-superficie px-3 text-sm font-semibold hover:bg-fondo'

/** Navegación día anterior / siguiente / hoy; actualiza `?fecha=AAAA-MM-DD`. */
export function SelectorDia({ fecha, hoy }: { fecha: string; hoy: string }) {
  return (
    <nav aria-label="Cambiar de día" className="flex flex-wrap items-center gap-2">
      <Link href={`/agenda?fecha=${sumarDias(fecha, -1)}`} className={ENLACE} aria-label="Día anterior">
        <ChevronLeft aria-hidden className="size-4" />
        <span className="hidden sm:inline">Anterior</span>
      </Link>
      <Link href={`/agenda?fecha=${hoy}`} className={ENLACE}>
        Hoy
      </Link>
      <Link href={`/agenda?fecha=${sumarDias(fecha, 1)}`} className={ENLACE} aria-label="Día siguiente">
        <span className="hidden sm:inline">Siguiente</span>
        <ChevronRight aria-hidden className="size-4" />
      </Link>
      <h2 className="ml-1 text-lg font-bold" data-testid="fecha-actual">
        {formatearFecha(instanteMadrid(fecha, 12))}
      </h2>
    </nav>
  )
}
