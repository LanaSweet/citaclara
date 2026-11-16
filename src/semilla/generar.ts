import type { Estado } from '@/dominio/cita'
import { calcularFin } from '@/dominio/cita'
import { instanteMadrid, sumarDias } from '@/dominio/fechas'
import { NOMBRE_CLINICA, PACIENTES, PROFESIONALES, SERVICIOS } from './datos'

/** Semilla fija del generador: misma semilla y ancla → mismos datos (principio V). */
export const SEMILLA = 20_261_116

const SEMANAS_HISTORIA = 8
const SEMANAS_FUTURO = 2
const CUOTA_NO_ASISTIDAS = 0.1
const CUOTA_CANCELADAS = 0.08

export interface DatosSemilla {
  clinica: { id: string; nombre: string }
  profesionales: { id: string; clinicaId: string; nombre: string; especialidad: string }[]
  servicios: { id: string; clinicaId: string; nombre: string; duracionMin: number; importeCentimos: number }[]
  pacientes: { id: string; clinicaId: string; nombre: string; telefono: string; email: string }[]
  citas: {
    id: string
    clinicaId: string
    profesionalId: string
    servicioId: string
    pacienteId: string
    inicio: Date
    fin: Date
    estado: Estado
    creadaEn: Date
  }[]
}

/** PRNG mulberry32: determinista y sin dependencias. */
export function mulberry32(semilla: number): () => number {
  let a = semilla >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function crearAzar(semilla: number) {
  const siguiente = mulberry32(semilla)
  const entero = (min: number, max: number) => min + Math.floor(siguiente() * (max - min + 1))
  const elegir = <T>(lista: readonly T[]): T => lista[entero(0, lista.length - 1)]
  const uuid = (): string => {
    const h = Array.from({ length: 16 }, () => entero(0, 255))
    h[6] = (h[6] & 0x0f) | 0x40 // versión 4
    h[8] = (h[8] & 0x3f) | 0x80 // variante RFC 4122
    const x = h.map((b) => b.toString(16).padStart(2, '0')).join('')
    return `${x.slice(0, 8)}-${x.slice(8, 12)}-${x.slice(12, 16)}-${x.slice(16, 20)}-${x.slice(20)}`
  }
  return { siguiente, entero, elegir, uuid }
}

const MIN_APERTURA = 9 * 60
const MIN_CIERRE = 20 * 60

/**
 * Genera los datos de Clínica Eleva en memoria. Función pura y determinista: depende solo de
 * `ancla` (lunes, `AAAA-MM-DD`) y `ahora`. El futuro empieza en el primer instante posterior a
 * `max(ancla, ahora)` para que ninguna cita reservada quede en el pasado (FR-022).
 */
export function generarSemilla({ ancla, ahora }: { ancla: string; ahora: Date }): DatosSemilla {
  const azar = crearAzar(SEMILLA)
  const clinicaId = azar.uuid()
  const instanteAncla = instanteMadrid(ancla, 0, 0)
  const corteFuturo = new Date(Math.max(instanteAncla.getTime(), ahora.getTime()))

  const profesionales = PROFESIONALES.map((p) => ({ id: azar.uuid(), clinicaId, ...p }))
  const servicios = SERVICIOS.map((s) => ({
    id: azar.uuid(),
    clinicaId,
    clave: s.clave,
    especialidad: s.especialidad,
    nombre: s.nombre,
    duracionMin: s.duracionMin,
    importeCentimos: s.importeCentimos,
  }))
  const pacientes = PACIENTES.map((p) => ({ id: azar.uuid(), clinicaId, ...p }))

  // Días laborables: 8 semanas anteriores al ancla (historia) y 2 desde el ancla (futuro).
  const dias = (desde: number, hasta: number): string[] => {
    const lista: string[] = []
    for (let d = desde; d < hasta; d++) {
      const dia = sumarDias(ancla, d)
      const semana = ((d % 7) + 7) % 7 // el ancla es lunes: 0..4 = lunes a viernes
      if (semana <= 4) lista.push(dia)
    }
    return lista
  }
  const diasHistoria = dias(-SEMANAS_HISTORIA * 7, 0)
  const diasFuturo = dias(0, SEMANAS_FUTURO * 7)

  type Hueco = { profesionalIdx: number; fecha: string; inicio: Date; fin: Date; servicioIdx: number; pacienteIdx: number }
  const colocar = (fechas: string[]): Hueco[] => {
    const huecos: Hueco[] = []
    for (const fecha of fechas) {
      profesionales.forEach((prof, profesionalIdx) => {
        const candidatos = servicios.map((s, i) => ({ s, i })).filter(({ s }) => s.especialidad === prof.especialidad)
        let cursor = MIN_APERTURA + azar.entero(0, 2) * 15
        const objetivo = azar.entero(3, 4)
        for (let n = 0; n < objetivo; n++) {
          // 70 % sesión habitual, 30 % primera visita (la primera de la lista es la habitual)
          const { s, i } = azar.siguiente() < 0.7 ? candidatos[0] : candidatos[1]
          if (cursor + s.duracionMin > MIN_CIERRE) break
          const inicio = instanteMadrid(fecha, Math.floor(cursor / 60), cursor % 60)
          huecos.push({
            profesionalIdx,
            fecha,
            inicio,
            fin: calcularFin(inicio, s.duracionMin),
            servicioIdx: i,
            pacienteIdx: azar.entero(0, pacientes.length - 1),
          })
          cursor += s.duracionMin + azar.entero(0, 8) * 15 // hueco libre de 0 a 2 h entre citas
        }
      })
    }
    return huecos
  }

  const historia = colocar(diasHistoria)
  const futuro = colocar(diasFuturo).filter((h) => h.inicio.getTime() > corteFuturo.getTime())

  // Estados por cuotas exactas sobre la historia (D9), no por probabilidad por cita.
  const estados: Estado[] = new Array(historia.length).fill('completada')
  const indices = historia.map((_, i) => i)
  for (let i = indices.length - 1; i > 0; i--) {
    const j = azar.entero(0, i)
    ;[indices[i], indices[j]] = [indices[j], indices[i]]
  }
  const nNoAsistidas = Math.round(historia.length * CUOTA_NO_ASISTIDAS)
  const nCanceladas = Math.round(historia.length * CUOTA_CANCELADAS)
  indices.slice(0, nNoAsistidas).forEach((i) => (estados[i] = 'no_asistida'))
  indices.slice(nNoAsistidas, nNoAsistidas + nCanceladas).forEach((i) => (estados[i] = 'cancelada'))

  const unaSemana = 7 * 24 * 3_600_000
  const aCita = (h: Hueco, estado: Estado) => ({
    id: azar.uuid(),
    clinicaId,
    profesionalId: profesionales[h.profesionalIdx].id,
    servicioId: servicios[h.servicioIdx].id,
    pacienteId: pacientes[h.pacienteIdx].id,
    inicio: h.inicio,
    fin: h.fin,
    estado,
    creadaEn: new Date(Math.min(h.inicio.getTime() - unaSemana, instanteAncla.getTime())),
  })
  const citas = [...historia.map((h, i) => aCita(h, estados[i])), ...futuro.map((h) => aCita(h, 'reservada'))]

  return {
    clinica: { id: clinicaId, nombre: NOMBRE_CLINICA },
    profesionales,
    servicios: servicios.map(({ id, clinicaId: c, nombre, duracionMin, importeCentimos }) => ({
      id,
      clinicaId: c,
      nombre,
      duracionMin,
      importeCentimos,
    })),
    pacientes,
    citas,
  }
}
