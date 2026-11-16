import { CalendarCheck } from 'lucide-react'
import { FormularioAcceso } from '@/components/agenda/formulario-acceso'
import { Card } from '@/components/ui/card'

export const metadata = { title: 'Acceso · CitaClara' }

export default function PaginaAcceso() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center gap-6 px-4 py-8">
      <div className="flex items-center gap-3">
        <span className="inline-flex size-11 items-center justify-center rounded-xl bg-primario text-primario-texto">
          <CalendarCheck aria-hidden className="size-6" />
        </span>
        <h1 className="text-2xl font-bold">CitaClara</h1>
      </div>
      <Card className="space-y-4 p-5">
        <div>
          <h2 className="text-lg font-semibold">Acceso de recepción</h2>
          <p className="text-sm text-texto-suave">Introduce la clave de la clínica para ver la agenda.</p>
        </div>
        <FormularioAcceso />
      </Card>
    </main>
  )
}
