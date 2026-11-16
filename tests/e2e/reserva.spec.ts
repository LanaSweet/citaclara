import { expect, test } from '@playwright/test'
import { ANCLA, alerta, diaLibre, entrar, reservar, tarjetas, tramosLibres, verProfesional } from './ayudas'
import { sumarDias } from '@/dominio/fechas'

test.describe('reserva de citas', () => {
  test.beforeEach(async ({ page }) => entrar(page))

  test('V3, H1.1: una reserva válida muestra el fin calculado antes de confirmar y aparece en la agenda', async ({ page }, info) => {
    const dia = diaLibre(info)
    await page.goto('/agenda/nueva')
    await page.getByLabel('Profesional').selectOption({ label: 'María · Fisioterapia' })
    await page.getByLabel('Servicio').selectOption({ label: 'Sesión de fisioterapia (45 min)' })
    await page.getByLabel('Paciente').selectOption({ index: 1 })
    await page.getByLabel('Fecha').fill(dia)
    await page.getByLabel('Hora de inicio').fill('10:00')
    await expect(page.getByTestId('fin-calculado')).toContainText('10:45')
    await page.getByRole('button', { name: 'Reservar' }).click()
    await expect(page).toHaveURL(new RegExp(`/agenda\\?fecha=${dia}$`))
    await verProfesional(page, 'María')
    await expect(tarjetas(page).first()).toContainText('10:00–10:45')
    await expect(tarjetas(page).first()).toContainText('Reservada')
  })

  test('V4, H1.2: un solape muestra «Ese hueco ya está ocupado» y la agenda actualizada', async ({ page }, info) => {
    const dia = diaLibre(info)
    await reservar(page, { fecha: dia, hora: '11:00' })
    await expect(page).toHaveURL(/\/agenda\?fecha=/)
    await reservar(page, { fecha: dia, hora: '11:30' })
    await expect(page).toHaveURL(new RegExp(`/agenda\\?fecha=${dia}&aviso=hueco-ocupado`))
    await expect(page.getByRole('status').filter({ hasText: 'Ese hueco ya está ocupado.' })).toBeVisible()
    await verProfesional(page, 'María')
    // Solo existe la primera reserva (11:00–11:45); la de 11:30 no se ha creado.
    await expect(tarjetas(page).filter({ hasText: '11:00–11:45' })).toHaveCount(1)
    await expect(tarjetas(page).filter({ hasText: '11:30' })).toHaveCount(0)
  })

  test('V5, H1.4: una cita contigua se acepta', async ({ page }, info) => {
    const dia = diaLibre(info)
    await reservar(page, { fecha: dia, hora: '12:00' })
    await expect(page).toHaveURL(/\/agenda\?fecha=/)
    await reservar(page, { fecha: dia, hora: '12:45' })
    await expect(page).toHaveURL(new RegExp(`/agenda\\?fecha=${dia}$`))
    await verProfesional(page, 'María')
    await expect(page.locator('[data-testid="tarjeta-cita"]:visible', { hasText: '12:45–13:30' })).toBeVisible()
  })

  test('V6, H1.6: una cita en el pasado se rechaza con un mensaje claro', async ({ page }) => {
    await reservar(page, { fecha: sumarDias(ANCLA, -7), hora: '10:00' })
    await expect(alerta(page)).toHaveText('No se pueden crear citas en el pasado.')
    await expect(page).toHaveURL(/\/agenda\/nueva$/)
  })

  test('FR-013: una cita fuera del horario se rechaza con un mensaje claro', async ({ page }, info) => {
    await reservar(page, { fecha: diaLibre(info), hora: '19:45' })
    await expect(alerta(page)).toContainText('fuera del horario de atención')
  })

  test('SC-003: dar de alta una cita desde la agenda del día lleva menos de 1 minuto', async ({ page }, info) => {
    const dia = diaLibre(info)
    const inicio = Date.now()
    await page.goto(`/agenda?fecha=${dia}`)
    await tramosLibres(page).first().click()
    await expect(page).toHaveURL(/\/agenda\/nueva\?profesional=/)
    await page.getByLabel('Servicio').selectOption({ index: 1 })
    await page.getByLabel('Paciente').selectOption({ index: 2 })
    await page.getByRole('button', { name: 'Reservar' }).click()
    await expect(page).toHaveURL(new RegExp(`/agenda\\?fecha=${dia}$`))
    expect(Date.now() - inicio).toBeLessThan(60_000)
  })
})
