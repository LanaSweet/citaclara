'use client'

import Link from 'next/link'
import { Plus } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { partesMadrid, formatearHora } from '@/dominio/fechas'
import { APERTURA_MIN, CIERRE_MIN } from '@/dominio/horario'
import type { AgendaProfesional, TramoAgenda } from '@/servicios/consultar-agenda'
import { TarjetaCita } from './tarjeta-cita'

const PASO_MIN = 15
const FILAS = (CIERRE_MIN - APERTURA_MIN) / PASO_MIN
const ALTO_FILA_PX = 22

/** Fila de la rejilla (1-based) de un instante, redondeando al paso de 15 minutos. */
function fila(iso: string, redondeo: 'abajo' | 'arriba'): number {
  const { hora, minuto } = partesMadrid(new Date(iso))
  const pasos = (hora * 60 + minuto - APERTURA_MIN) / PASO_MIN
  return (redondeo === 'abajo' ? Math.floor(pasos) : Math.ceil(pasos)) + 1
}

function Columna({ agenda, minimoReservableMin }: { agenda: AgendaProfesional; minimoReservableMin: number }) {
  return (
    <div
      className="grid gap-y-px"
      style={{ gridTemplateRows: `repeat(${FILAS}, ${ALTO_FILA_PX}px)` }}
      data-testid="columna-profesional"
    >
      {agenda.tramos.map((t: TramoAgenda) => {
        const estilo = { gridRow: `${fila(t.inicio, 'abajo')} / ${Math.max(fila(t.fin, 'arriba'), fila(t.inicio, 'abajo') + 1)}` }
        if (t.tipo === 'cita') {
          return (
            <div key={t.citaId} style={estilo}>
              <TarjetaCita cita={t} />
            </div>
          )
        }
        const duracionMin = (new Date(t.fin).getTime() - new Date(t.inicio).getTime()) / 60_000
        if (duracionMin < minimoReservableMin) {
          // No cabe ni el servicio más breve: se muestra como información, sin objetivo táctil.
          return (
            <div
              key={t.inicio}
              style={estilo}
              data-testid="tramo-corto"
              className="flex items-center overflow-hidden px-2 text-xs text-texto-suave"
            >
              Libre {formatearHora(new Date(t.inicio))}–{formatearHora(new Date(t.fin))} (muy corto)
            </div>
          )
        }
        return (
          <Link
            key={t.inicio}
            href={`/agenda/nueva?profesional=${agenda.profesionalId}&inicio=${encodeURIComponent(t.inicio)}`}
            style={estilo}
            data-testid="tramo-libre"
            className="flex items-start gap-2 rounded-lg border-2 border-libre-borde bg-libre p-2 text-sm font-semibold text-ok hover:bg-emerald-100"
          >
            <Plus aria-hidden className="mt-0.5 size-4 shrink-0" />
            <span>
              Libre {formatearHora(new Date(t.inicio))}–{formatearHora(new Date(t.fin))}
              <span className="block text-xs font-normal">Pulsa para reservar</span>
            </span>
          </Link>
        )
      })}
    </div>
  )
}

function Escala() {
  return (
    <div
      aria-hidden
      className="grid gap-y-px text-xs text-texto-suave"
      style={{ gridTemplateRows: `repeat(${FILAS}, ${ALTO_FILA_PX}px)` }}
    >
      {Array.from({ length: (CIERRE_MIN - APERTURA_MIN) / 60 }, (_, h) => (
        <span key={h} style={{ gridRow: `${h * 4 + 1} / span 4` }}>
          {String(9 + h).padStart(2, '0')}:00
        </span>
      ))}
    </div>
  )
}

/** Línea de tiempo por profesional: columnas en escritorio, pestañas en móvil (D3). */
export function LineaTiempo({
  agenda,
  minimoReservableMin,
}: {
  agenda: AgendaProfesional[]
  /** Duración del servicio más breve: los huecos menores no se pueden reservar. */
  minimoReservableMin: number
}) {
  if (agenda.length === 0) return <p>No hay profesionales en esta clínica.</p>
  const sinHorario = agenda.every((p) => p.tramos.length === 0)
  if (sinHorario) {
    return <p className="rounded-lg border border-borde bg-superficie p-4">Este día no hay horario de atención (de lunes a viernes).</p>
  }

  return (
    <>
      {/* Móvil: una columna con pestañas para elegir profesional */}
      <div className="md:hidden">
        <Tabs defaultValue={agenda[0].profesionalId}>
          <TabsList aria-label="Profesionales">
            {agenda.map((p) => (
              <TabsTrigger key={p.profesionalId} value={p.profesionalId}>
                {p.nombre}
              </TabsTrigger>
            ))}
          </TabsList>
          {agenda.map((p) => (
            <TabsContent key={p.profesionalId} value={p.profesionalId} className="mt-3">
              <p className="mb-2 text-sm text-texto-suave">{p.especialidad}</p>
              <div className="grid grid-cols-[3rem_minmax(0,1fr)] gap-2">
                <Escala />
                <Columna agenda={p} minimoReservableMin={minimoReservableMin} />
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </div>

      {/* Escritorio: columnas en paralelo */}
      <div
        className="hidden gap-3 md:grid"
        style={{ gridTemplateColumns: `3rem repeat(${agenda.length}, minmax(0, 1fr))` }}
      >
        <div />
        {agenda.map((p) => (
          <div key={p.profesionalId} className="mb-1">
            <h3 className="font-semibold">{p.nombre}</h3>
            <p className="text-sm text-texto-suave">{p.especialidad}</p>
          </div>
        ))}
        <Escala />
        {agenda.map((p) => (
          <Columna key={p.profesionalId} agenda={p} minimoReservableMin={minimoReservableMin} />
        ))}
      </div>
    </>
  )
}
