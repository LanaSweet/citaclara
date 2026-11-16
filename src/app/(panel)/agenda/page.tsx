import { redirect } from 'next/navigation'
import { obtenerBd } from '@/bd/cliente'
import { Alert } from '@/components/ui/alert'
import { LineaTiempo } from '@/components/agenda/linea-tiempo'
import { SelectorDia } from '@/components/agenda/selector-dia'
import { ErrorNegocio, MENSAJES } from '@/dominio/errores'
import { fechaIsoMadrid } from '@/dominio/fechas'
import { listarServicios } from '@/servicios/catalogo'
import { consultarAgenda, type AgendaProfesional } from '@/servicios/consultar-agenda'
import { RelojSistema } from '@/servicios/reloj'
import { obtenerClinicaId } from '@/servicios/sesion'

export const metadata = { title: 'Agenda · CitaClara' }
export const dynamic = 'force-dynamic'

export default async function PaginaAgenda({
  searchParams,
}: {
  searchParams: Promise<{ fecha?: string; aviso?: string }>
}) {
  const { fecha: fechaPedida, aviso } = await searchParams
  const reloj = new RelojSistema()
  const hoy = fechaIsoMadrid(reloj.ahora())
  const fecha = fechaPedida ?? hoy

  let agenda: AgendaProfesional[] = []
  let minimoReservableMin = 0
  let errorFecha: string | null = null
  try {
    const clinicaId = await obtenerClinicaId()
    const bd = obtenerBd()
    agenda = await consultarAgenda(bd, reloj, clinicaId, fecha)
    const servicios = await listarServicios(bd, clinicaId)
    minimoReservableMin = Math.min(...servicios.map((s) => s.duracionMin), Infinity)
    if (!Number.isFinite(minimoReservableMin)) minimoReservableMin = 0
  } catch (e) {
    if (!(e instanceof ErrorNegocio)) throw e
    if (e.codigo === 'NO_AUTORIZADO') redirect('/acceso')
    errorFecha = e.message
  }

  return (
    <div className="space-y-4">
      <h1 className="sr-only">Agenda del día</h1>
      <SelectorDia fecha={errorFecha ? hoy : fecha} hoy={hoy} />
      {aviso === 'hueco-ocupado' && <Alert tono="aviso">{MENSAJES.HUECO_OCUPADO}</Alert>}
      {errorFecha ? <Alert tono="error">{errorFecha}</Alert> : <LineaTiempo agenda={agenda} minimoReservableMin={minimoReservableMin} />}
    </div>
  )
}
