import { Loader2 } from 'lucide-react'

export default function CargandoAgenda() {
  return (
    <div role="status" className="flex items-center gap-2 p-6 text-texto-suave">
      <Loader2 aria-hidden className="size-5 animate-spin" />
      Cargando la agenda…
    </div>
  )
}
