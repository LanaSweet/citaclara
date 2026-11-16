'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { cerrarCita } from '@/app/(panel)/agenda/cerrar-cita-accion'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetDescription, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { EstadoCita } from './estado-cita'
import type { Accion, Estado } from '@/dominio/cita'
import { formatearEuros } from '@/dominio/dinero'
import { formatearFecha, formatearHora } from '@/dominio/fechas'

export interface DatosCita {
  citaId: string
  inicio: string
  fin: string
  paciente: string
  servicio: string
  importeCentimos: number
  estado: Estado
  pendienteDeCerrar: boolean
}

/** Hoja de detalle de una cita con las acciones de cierre permitidas (FR-006, FR-016). */
export function DetalleCita({ cita, children }: { cita: DatosCita; children: React.ReactNode }) {
  const router = useRouter()
  const [abierto, setAbierto] = useState(false)
  const [confirmando, setConfirmando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pendiente, empezar] = useTransition()

  const inicio = new Date(cita.inicio)
  const reservada = cita.estado === 'reservada'
  const yaEmpezada = inicio.getTime() <= Date.now()

  function cerrar(accion: Accion) {
    setError(null)
    empezar(async () => {
      const r = await cerrarCita({ citaId: cita.citaId, accion })
      if (r.ok) {
        setAbierto(false)
        setConfirmando(false)
        router.refresh()
      } else {
        setError(r.mensaje)
        router.refresh()
      }
    })
  }

  return (
    <Sheet
      open={abierto}
      onOpenChange={(o) => {
        setAbierto(o)
        if (!o) {
          setConfirmando(false)
          setError(null)
        }
      }}
    >
      <SheetTrigger asChild>{children}</SheetTrigger>
      <SheetContent>
        <div className="space-y-1 pr-12">
          <SheetTitle className="text-lg font-semibold">Detalle de la cita</SheetTitle>
          <SheetDescription className="text-sm text-texto-suave">
            {formatearFecha(inicio)} · {formatearHora(inicio)}–{formatearHora(new Date(cita.fin))}
          </SheetDescription>
        </div>

        <dl className="space-y-3 text-sm">
          <div>
            <dt className="text-texto-suave">Paciente</dt>
            <dd className="font-medium">{cita.paciente}</dd>
          </div>
          <div>
            <dt className="text-texto-suave">Servicio</dt>
            <dd className="font-medium">{cita.servicio}</dd>
          </div>
          <div>
            <dt className="text-texto-suave">Importe</dt>
            <dd className="font-medium">{formatearEuros(cita.importeCentimos)}</dd>
          </div>
          <div>
            <dt className="mb-1 text-texto-suave">Estado</dt>
            <dd>
              <EstadoCita estado={cita.estado} pendienteDeCerrar={cita.pendienteDeCerrar} />
            </dd>
          </div>
        </dl>

        {error && <Alert tono="error">{error}</Alert>}

        {reservada && !confirmando && (
          <div className="flex flex-col gap-2">
            {yaEmpezada && (
              <>
                <Button onClick={() => cerrar('completar')} disabled={pendiente}>
                  Completar
                </Button>
                <Button variante="secundario" onClick={() => cerrar('no_asistio')} disabled={pendiente}>
                  No asistió
                </Button>
              </>
            )}
            <Button variante="peligro" onClick={() => setConfirmando(true)} disabled={pendiente}>
              Cancelar cita
            </Button>
          </div>
        )}

        {reservada && confirmando && (
          <div className="space-y-2 rounded-lg border border-peligro bg-peligro-fondo p-3">
            <p className="text-sm font-medium text-peligro">¿Seguro que quieres cancelar esta cita?</p>
            <div className="flex flex-col gap-2">
              <Button variante="peligro" onClick={() => cerrar('cancelar')} disabled={pendiente}>
                Sí, cancelar la cita
              </Button>
              <Button variante="secundario" onClick={() => setConfirmando(false)} disabled={pendiente}>
                No, volver
              </Button>
            </div>
          </div>
        )}

        {!reservada && <p className="text-sm text-texto-suave">Esta cita está cerrada y no admite más cambios.</p>}
      </SheetContent>
    </Sheet>
  )
}
