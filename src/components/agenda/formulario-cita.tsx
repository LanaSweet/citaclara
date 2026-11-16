'use client'

import { useEffect, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { previsualizarCita, reservarCita } from '@/app/(panel)/agenda/nueva/acciones'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { fechaIsoMadrid, formatearHora, instanteMadrid } from '@/dominio/fechas'

interface Opcion {
  id: string
  nombre: string
}
interface Props {
  profesionales: (Opcion & { especialidad: string })[]
  servicios: (Opcion & { duracionMin: number })[]
  pacientes: Opcion[]
  /** Valores precargados desde un tramo libre de la agenda. */
  profesionalInicial?: string
  inicioInicial?: string
}

/** Instante ISO a partir de la fecha y hora locales de Madrid que escribe la persona usuaria. */
function aInstante(fecha: string, hora: string): string | null {
  const m = /^(\d{2}):(\d{2})$/.exec(hora)
  if (!fecha || !m) return null
  try {
    return instanteMadrid(fecha, Number(m[1]), Number(m[2])).toISOString()
  } catch {
    return null
  }
}

export function FormularioCita({ profesionales, servicios, pacientes, profesionalInicial, inicioInicial }: Props) {
  const router = useRouter()
  const inicial = inicioInicial ? new Date(inicioInicial) : null
  const [profesionalId, setProfesionalId] = useState(profesionalInicial ?? '')
  const [servicioId, setServicioId] = useState('')
  const [pacienteId, setPacienteId] = useState('')
  const [fecha, setFecha] = useState(inicial ? fechaIsoMadrid(inicial) : '')
  const [hora, setHora] = useState(inicial ? formatearHora(inicial) : '')
  const [fin, setFin] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pendiente, empezar] = useTransition()

  const inicioIso = aInstante(fecha, hora)

  // Fin calculado visible antes de confirmar (FR-015).
  useEffect(() => {
    setFin(null)
    if (!servicioId || !inicioIso) return
    let vigente = true
    previsualizarCita({ servicioId, inicio: inicioIso }).then((r) => {
      if (vigente && r.ok) setFin(formatearHora(new Date(r.datos.fin)))
    })
    return () => {
      vigente = false
    }
  }, [servicioId, inicioIso])

  function enviar(evento: React.FormEvent) {
    evento.preventDefault()
    setError(null)
    if (!profesionalId || !servicioId || !pacienteId || !inicioIso) {
      setError('Completa el profesional, el servicio, el paciente, la fecha y la hora.')
      return
    }
    empezar(async () => {
      const r = await reservarCita({ profesionalId, servicioId, pacienteId, inicio: inicioIso })
      const dia = fechaIsoMadrid(new Date(inicioIso))
      if (r.ok) {
        router.push(`/agenda?fecha=${dia}`)
      } else if (r.codigo === 'HUECO_OCUPADO') {
        // La agenda ya está actualizada; se muestra el aviso sin proponer huecos alternativos.
        router.push(`/agenda?fecha=${dia}&aviso=hueco-ocupado`)
      } else {
        setError(r.mensaje)
      }
    })
  }

  return (
    <form onSubmit={enviar} className="space-y-4" noValidate>
      <div>
        <Label htmlFor="profesional">Profesional</Label>
        <Select id="profesional" value={profesionalId} onChange={(e) => setProfesionalId(e.target.value)} required>
          <option value="">Elige un profesional</option>
          {profesionales.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nombre} · {p.especialidad}
            </option>
          ))}
        </Select>
      </div>
      <div>
        <Label htmlFor="servicio">Servicio</Label>
        <Select id="servicio" value={servicioId} onChange={(e) => setServicioId(e.target.value)} required>
          <option value="">Elige un servicio</option>
          {servicios.map((s) => (
            <option key={s.id} value={s.id}>
              {s.nombre} ({s.duracionMin} min)
            </option>
          ))}
        </Select>
      </div>
      <div>
        <Label htmlFor="paciente">Paciente</Label>
        <Select id="paciente" value={pacienteId} onChange={(e) => setPacienteId(e.target.value)} required>
          <option value="">Elige un paciente</option>
          {pacientes.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nombre}
            </option>
          ))}
        </Select>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="fecha">Fecha</Label>
          <Input id="fecha" type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} required />
        </div>
        <div>
          <Label htmlFor="hora">Hora de inicio</Label>
          <Input id="hora" type="time" step={300} value={hora} onChange={(e) => setHora(e.target.value)} required />
        </div>
      </div>

      <p aria-live="polite" className="rounded-lg bg-fondo p-3 text-sm" data-testid="fin-calculado">
        {fin ? (
          <>
            La cita termina a las <strong>{fin}</strong>.
          </>
        ) : (
          'Elige servicio, fecha y hora para ver cuándo termina la cita.'
        )}
      </p>

      {error && <Alert tono="error">{error}</Alert>}

      <Button type="submit" className="w-full" disabled={pendiente}>
        {pendiente && <Loader2 aria-hidden className="size-4 animate-spin" />}
        {pendiente ? 'Reservando…' : 'Reservar'}
      </Button>
    </form>
  )
}
