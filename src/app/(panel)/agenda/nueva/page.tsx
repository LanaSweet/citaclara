import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { obtenerBd } from '@/bd/cliente'
import { FormularioCita } from '@/components/agenda/formulario-cita'
import { Card } from '@/components/ui/card'
import { listarPacientes, listarProfesionales, listarServicios } from '@/servicios/catalogo'
import { obtenerClinicaId } from '@/servicios/sesion'
import { ErrorNegocio } from '@/dominio/errores'

export const metadata = { title: 'Nueva cita · CitaClara' }
export const dynamic = 'force-dynamic'

export default async function PaginaNuevaCita({
  searchParams,
}: {
  searchParams: Promise<{ profesional?: string; inicio?: string }>
}) {
  const { profesional, inicio } = await searchParams
  let clinicaId: string
  try {
    clinicaId = await obtenerClinicaId()
  } catch (e) {
    if (e instanceof ErrorNegocio) redirect('/acceso')
    throw e
  }
  const bd = obtenerBd()
  const [profesionales, servicios, pacientes] = await Promise.all([
    listarProfesionales(bd, clinicaId),
    listarServicios(bd, clinicaId),
    listarPacientes(bd, clinicaId),
  ])
  const inicioValido = inicio && !Number.isNaN(Date.parse(inicio)) ? inicio : undefined

  return (
    <div className="mx-auto max-w-xl space-y-4">
      <Link href="/agenda" className="inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-primario">
        <ArrowLeft aria-hidden className="size-4" />
        Volver a la agenda
      </Link>
      <Card className="space-y-4 p-5">
        <h1 className="text-xl font-bold">Nueva cita</h1>
        <FormularioCita
          profesionales={profesionales}
          servicios={servicios}
          pacientes={pacientes}
          profesionalInicial={profesional}
          inicioInicial={inicioValido}
        />
      </Card>
    </div>
  )
}
