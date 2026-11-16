'use client'

import { cn } from '@/lib/utils'
import { formatearHora } from '@/dominio/fechas'
import { DetalleCita, type DatosCita } from './detalle-cita'
import { EstadoCita } from './estado-cita'

/** Tramo ocupado: abre el detalle al pulsarlo (accesible por teclado). */
export function TarjetaCita({ cita }: { cita: DatosCita }) {
  return (
    <DetalleCita cita={cita}>
      <button
        type="button"
        data-testid="tarjeta-cita"
        data-estado={cita.estado}
        data-pendiente={cita.pendienteDeCerrar ? 'si' : 'no'}
        className={cn(
          'flex h-full w-full flex-col items-start gap-0.5 overflow-hidden rounded-lg border-2 p-2 text-left text-sm',
          cita.pendienteDeCerrar
            ? 'border-dashed border-aviso bg-aviso-fondo'
            : 'border-solid border-primario bg-indigo-50',
        )}
      >
        <span className="font-semibold">
          {formatearHora(new Date(cita.inicio))}–{formatearHora(new Date(cita.fin))}
        </span>
        <span className="w-full truncate">{cita.paciente}</span>
        <span className="w-full truncate text-xs text-texto-suave">{cita.servicio}</span>
        <EstadoCita estado={cita.estado} pendienteDeCerrar={cita.pendienteDeCerrar} />
      </button>
    </DetalleCita>
  )
}
