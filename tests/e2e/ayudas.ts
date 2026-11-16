import { expect, type Page, type TestInfo } from '@playwright/test'
import { and, asc, eq } from 'drizzle-orm'
import { crearCliente } from '@/bd/cliente'
import { cita } from '@/bd/esquema'
import { fechaIsoMadrid, lunesDeLaSemana, sumarDias } from '@/dominio/fechas'
import { CLAVE_DEMO } from '@/semilla/datos'

/** Ancla de la semilla de los E2E: lunes de la semana en curso (la app usa el reloj real). */
export const ANCLA = lunesDeLaSemana(new Date())

const indice = (info: TestInfo) => (info.project.name === 'movil' ? 0 : 1)

/** Lunes sin citas sembradas (tres semanas después del ancla); distinto por proyecto para no chocar. */
export const diaLibre = (info: TestInfo) => sumarDias(ANCLA, 21 + 7 * indice(info))

/** Martes de la segunda semana sembrada, con citas reservadas; distinto por proyecto. */
export const diaConCitas = (info: TestInfo) => sumarDias(ANCLA, 8 + indice(info))

export async function entrar(page: Page) {
  await page.goto('/acceso')
  await page.getByLabel('Clave de la clínica').fill(CLAVE_DEMO)
  await page.getByRole('button', { name: 'Entrar' }).click()
  await expect(page).toHaveURL(/\/agenda$/)
}

export const tarjetas = (page: Page) => page.locator('[data-testid="tarjeta-cita"]:visible')
export const tramosLibres = (page: Page) => page.locator('[data-testid="tramo-libre"]:visible')

/** Rellena y envía el formulario de nueva cita. */
export async function reservar(page: Page, datos: { fecha: string; hora: string; profesional?: string }) {
  await page.goto('/agenda/nueva')
  await page.getByLabel('Profesional').selectOption({ label: datos.profesional ?? 'María · Fisioterapia' })
  await page.getByLabel('Servicio').selectOption({ label: 'Sesión de fisioterapia (45 min)' })
  await page.getByLabel('Paciente').selectOption({ index: 1 })
  await page.getByLabel('Fecha').fill(datos.fecha)
  await page.getByLabel('Hora de inicio').fill(datos.hora)
  await page.getByRole('button', { name: 'Reservar' }).click()
}

/**
 * Convierte una cita completada de la historia en una reservada ya empezada (pendiente de cerrar).
 * La semilla nunca la genera: se prepara directamente en la BD de pruebas.
 */
export async function crearPendienteDeCerrar(info: TestInfo): Promise<{ fecha: string; paciente: string; profesional: string }> {
  const { sql, bd } = crearCliente(process.env.DATABASE_URL_TEST!, 1)
  try {
    const candidatas = await bd
      .select()
      .from(cita)
      .where(and(eq(cita.estado, 'completada')))
      .orderBy(asc(cita.inicio))
      .offset(indice(info) * 40)
      .limit(1)
    const original = candidatas[0]
    await bd.delete(cita).where(eq(cita.id, original.id))
    await bd.insert(cita).values({ ...original, id: undefined, estado: 'reservada' })
    const [fila] = await sql`SELECT nombre FROM paciente WHERE id = ${original.pacienteId}`
    const [prof] = await sql`SELECT nombre FROM profesional WHERE id = ${original.profesionalId}`
    return { fecha: fechaIsoMadrid(original.inicio), paciente: fila.nombre as string, profesional: prof.nombre as string }
  } finally {
    await sql.end()
  }
}

/** En móvil la agenda muestra un profesional por pestaña; en escritorio no hace falta nada. */
export async function verProfesional(page: Page, nombre: string) {
  await page.getByTestId('fecha-actual').waitFor() // la agenda ya se ha renderizado
  const pestana = page.getByRole('tab', { name: nombre })
  if (await pestana.isVisible()) await pestana.click()
}

/** Alerta de la interfaz (excluye el anunciador de rutas de Next, que también usa role="alert"). */
export const alerta = (page: Page) => page.locator('[role="alert"]:not(#__next-route-announcer__)')
