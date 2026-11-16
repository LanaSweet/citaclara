import { crearCliente, type Bd, type Cliente } from '@/bd/cliente'
import { migrar } from '@/bd/migrar'
import { cita, clinica, paciente, profesional, servicio } from '@/bd/esquema'
import { hashearClave } from '@/servicios/acceso'
import { instanteMadrid } from '@/dominio/fechas'
import type { Estado } from '@/dominio/cita'

/** Abre `DATABASE_URL_TEST`, aplica las migraciones y deja las tablas vacías. */
export async function abrirBdPruebas(): Promise<Cliente> {
  const url = process.env.DATABASE_URL_TEST
  if (!url) throw new Error('Falta DATABASE_URL_TEST (copia .env.example a .env.local).')
  const cliente = crearCliente(url)
  await migrar(cliente.sql)
  await limpiarBd(cliente)
  return cliente
}

export async function limpiarBd({ sql }: Pick<Cliente, 'sql'>): Promise<void> {
  await sql`TRUNCATE cita, paciente, servicio, profesional, clinica CASCADE`
}

/** Instante UTC de `HH:mm` del día local `AAAA-MM-DD` en Madrid. */
export function madrid(fechaIso: string, hora: string): Date {
  const [h, m] = hora.split(':').map(Number)
  return instanteMadrid(fechaIso, h, m)
}

export async function crearClinica(bd: Bd, datos: { nombre?: string; clave?: string } = {}) {
  const [fila] = await bd
    .insert(clinica)
    .values({ nombre: datos.nombre ?? 'Clínica Eleva', claveHash: await hashearClave(datos.clave ?? 'clave-de-prueba') })
    .returning()
  return fila
}

export async function crearProfesional(bd: Bd, clinicaId: string, nombre = 'María', especialidad = 'Fisioterapia') {
  const [fila] = await bd.insert(profesional).values({ clinicaId, nombre, especialidad }).returning()
  return fila
}

export async function crearServicio(
  bd: Bd,
  clinicaId: string,
  datos: { nombre?: string; duracionMin?: number; importeCentimos?: number } = {},
) {
  const [fila] = await bd
    .insert(servicio)
    .values({
      clinicaId,
      nombre: datos.nombre ?? 'Sesión de fisioterapia',
      duracionMin: datos.duracionMin ?? 45,
      importeCentimos: datos.importeCentimos ?? 4000,
    })
    .returning()
  return fila
}

export async function crearPaciente(bd: Bd, clinicaId: string, nombre = 'Ana Pérez') {
  const [fila] = await bd
    .insert(paciente)
    .values({ clinicaId, nombre, telefono: '600123123', email: 'ana@example.com' })
    .returning()
  return fila
}

/** Inserta una cita directamente (sin pasar por los servicios). */
export async function crearCita(
  bd: Bd,
  datos: {
    clinicaId: string
    profesionalId: string
    servicioId: string
    pacienteId: string
    inicio: Date
    fin: Date
    estado?: Estado
  },
) {
  const [fila] = await bd
    .insert(cita)
    .values({ ...datos, estado: datos.estado ?? 'reservada' })
    .returning()
  return fila
}

/** Escenario mínimo: una clínica con un profesional, un servicio de 45' y un paciente. */
export async function crearEscenario(bd: Bd) {
  const c = await crearClinica(bd)
  const p = await crearProfesional(bd, c.id)
  const s = await crearServicio(bd, c.id)
  const pa = await crearPaciente(bd, c.id)
  return { clinica: c, profesional: p, servicio: s, paciente: pa }
}
