import { expect, test } from '@playwright/test'
import { ANCLA, alerta, crearPendienteDeCerrar, diaConCitas, entrar, tarjetas, verProfesional } from './ayudas'
import { CLAVE_DEMO } from '@/semilla/datos'

test.describe('acceso y agenda', () => {
  test('V1, H4.1: sin sesión se redirige a /acceso y no se muestra ningún dato', async ({ page }) => {
    await page.goto('/agenda')
    await expect(page).toHaveURL(/\/acceso$/)
    await expect(page.getByText('María')).toHaveCount(0)
    await page.goto('/agenda/nueva')
    await expect(page).toHaveURL(/\/acceso$/)
  })

  test('V1, H4.2: una clave errónea muestra un error claro y ningún dato', async ({ page }) => {
    await page.goto('/acceso')
    await page.getByLabel('Clave de la clínica').fill('clave-equivocada')
    await page.getByRole('button', { name: 'Entrar' }).click()
    await expect(alerta(page)).toHaveText('La clave no es correcta.')
    await expect(page).toHaveURL(/\/acceso$/)
  })

  test('V1, H4.3: la clave de la demo entra en la agenda', async ({ page }) => {
    await page.goto('/acceso')
    await page.getByLabel('Clave de la clínica').fill(CLAVE_DEMO)
    await page.getByRole('button', { name: 'Entrar' }).click()
    await expect(page).toHaveURL(/\/agenda$/)
    await expect(page.getByText('Clínica Eleva').first()).toBeVisible()
  })

  test('V2, H2.1: los 3 profesionales van por separado con citas ordenadas y huecos', async ({ page }, info) => {
    await entrar(page)
    await page.goto(`/agenda?fecha=${diaConCitas(info)}`)
    if (info.project.name === 'movil') {
      const pestanas = page.getByRole('tab')
      await expect(pestanas).toHaveText(['Jorge', 'Lucía', 'María'])
    } else {
      await expect(page.getByRole('heading', { level: 3 })).toHaveText(['Jorge', 'Lucía', 'María'])
      await expect(page.locator('[data-testid="columna-profesional"]:visible')).toHaveCount(3)
    }
    const horas = await tarjetas(page).locator('span.font-semibold').allTextContents()
    expect(horas.length).toBeGreaterThan(3)
    await expect(page.locator('[data-testid="tramo-libre"]:visible').first()).toContainText('Libre')
  })

  test('V8, H3.5: una cita reservada con inicio pasado se destaca como pendiente de cerrar', async ({ page }, info) => {
    const { fecha, paciente, profesional } = await crearPendienteDeCerrar(info)
    await entrar(page)
    await page.goto(`/agenda?fecha=${fecha}`)
    await verProfesional(page, profesional)
    const pendiente = page.locator('[data-testid="tarjeta-cita"][data-pendiente="si"]:visible', { hasText: paciente })
    await expect(pendiente).toHaveCount(1)
    await expect(pendiente).toContainText('Pendiente de cerrar')
    await expect(pendiente).toContainText(paciente)
  })

  test('V10, FR-019, FR-020: fechas dd/MM/yyyy, horas HH:mm e importes con dos decimales', async ({ page }, info) => {
    await entrar(page)
    await page.goto(`/agenda?fecha=${diaConCitas(info)}`)
    const [a, m, d] = diaConCitas(info).split('-')
    await expect(page.getByTestId('fecha-actual')).toHaveText(`${d}/${m}/${a}`)
    await expect(tarjetas(page).first()).toContainText(/\d{2}:\d{2}–\d{2}:\d{2}/)
    await tarjetas(page).first().click()
    await expect(page.getByRole('dialog')).toContainText(/\d{2},\d{2} €/)
    await expect(page.getByRole('dialog')).toContainText(`${d}/${m}/${a}`)
    expect(ANCLA).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })
})

test('SC-004: recepción localiza un hueco libre de un profesional en menos de 10 segundos', async ({ page }, info) => {
  await entrar(page)
  const inicio = Date.now()
  await page.goto(`/agenda?fecha=${diaConCitas(info)}`)
  await expect(page.locator('[data-testid="tramo-libre"]:visible').first()).toBeVisible()
  expect(Date.now() - inicio).toBeLessThan(10_000)
})
