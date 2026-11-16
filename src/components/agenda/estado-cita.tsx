import { Ban, CalendarClock, CheckCircle2, UserX, Hourglass } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import type { Estado } from '@/dominio/cita'

const ETIQUETAS: Record<Estado, { texto: string; icono: typeof Ban; tono: 'info' | 'ok' | 'peligro' | 'neutro' }> = {
  reservada: { texto: 'Reservada', icono: CalendarClock, tono: 'info' },
  completada: { texto: 'Completada', icono: CheckCircle2, tono: 'ok' },
  cancelada: { texto: 'Cancelada', icono: Ban, tono: 'neutro' },
  no_asistida: { texto: 'No asistió', icono: UserX, tono: 'peligro' },
}

/** Insignia con icono y texto: se distingue también sin color. */
export function EstadoCita({ estado, pendienteDeCerrar = false }: { estado: Estado; pendienteDeCerrar?: boolean }) {
  if (pendienteDeCerrar) {
    return (
      <Badge tono="aviso">
        <Hourglass aria-hidden className="size-3.5" />
        Pendiente de cerrar
      </Badge>
    )
  }
  const { texto, icono: Icono, tono } = ETIQUETAS[estado]
  return (
    <Badge tono={tono}>
      <Icono aria-hidden className="size-3.5" />
      {texto}
    </Badge>
  )
}
