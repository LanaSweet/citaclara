import { expect, test } from '@playwright/test'
import { ANCLA, crearPendienteDeCerrar, diaConCitas, entrar, tarjetas, verProfesional } from './ayudas'
import { sumarDias } from '@/dominio/fechas'

test.describe('cierre de citas', () => {
  test.beforeEach(async ({ page }) => entrar(page))

  test('V7, H3.2, H3.6: una cita futura solo se puede cancelar; el hueco cancelado vuelve a ser reservable', async ({ page }, info) => {
    await page.goto(`/agenda?fecha=${diaConCitas(info)}`)
    await expect(tarjetas(page).first()).toBeVisible()
    const antes = await tarjetas(page).count()
    await tarjetas(page).first().click()
    const hoja = page.getByRole('dialog')
    await expect(hoja.getByRole('button', { name: 'Completar' })).toHaveCount(0)
    await expect(hoja.getByRole('button', { name: 'No asistió' })).toHaveCount(0)
    await hoja.getByRole('button', { name: 'Cancelar cita' }).click()
    await expect(hoja.getByText('¿Seguro que quieres cancelar esta cita?')).toBeVisible()
    await hoja.getByRole('button', { name: 'Sí, cancelar la cita' }).click()
    await expect(page.getByRole('dialog')).toHaveCount(0)
    await expect(tarjetas(page)).toHaveCount(antes - 1)
  })

  test('V7, H3.1: una cita pendiente de cerrar se puede completar y queda sin acciones', async ({ page }, info) => {
    const { fecha, paciente, profesional } = await crearPendienteDeCerrar(info)
    await page.goto(`/agenda?fecha=${fecha}`)
    await verProfesional(page, profesional)
    const pendiente = page.locator('[data-testid="tarjeta-cita"][data-pendiente="si"]:visible', { hasText: paciente })
    await pendiente.click()
    const hoja = page.getByRole('dialog')
    await expect(hoja.getByRole('button', { name: 'Completar' })).toBeVisible()
    await expect(hoja.getByRole('button', { name: 'No asistió' })).toBeVisible()
    await hoja.getByRole('button', { name: 'Completar' }).click()
    await expect(page.getByRole('dialog')).toHaveCount(0)
    await expect(pendiente).toHaveCount(0)
  })

  test('V7, H3.4: una cita completada no ofrece ninguna acción', async ({ page }) => {
    await page.goto(`/agenda?fecha=${sumarDias(ANCLA, -14)}`)
    await page.locator('[data-testid="tarjeta-cita"][data-estado="completada"]:visible').first().click()
    const hoja = page.getByRole('dialog')
    await expect(hoja).toContainText('Completada')
    await expect(hoja.getByRole('button', { name: /Completar|No asistió|Cancelar cita/ })).toHaveCount(0)
    await expect(hoja).toContainText('no admite más cambios')
  })
})
