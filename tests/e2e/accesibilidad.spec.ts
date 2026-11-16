import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'
import { diaConCitas, entrar } from './ayudas'

async function sinDesbordeHorizontal(page: Page) {
  const { ancho, visible } = await page.evaluate(() => ({
    ancho: document.documentElement.scrollWidth,
    visible: document.documentElement.clientWidth,
  }))
  expect(ancho).toBeLessThanOrEqual(visible)
}

async function sinViolacionesGraves(page: Page) {
  const { violations } = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze()
  const graves = violations.filter((v) => v.impact === 'serious' || v.impact === 'critical')
  expect(graves.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`)).toEqual([])
}

async function objetivosTactiles(page: Page) {
  const pequenos = await page.evaluate(() => {
    const salida: string[] = []
    document.querySelectorAll<HTMLElement>('button, a[href], input:not([type=hidden]), select').forEach((el) => {
      const r = el.getBoundingClientRect()
      if (r.width === 0 || r.height === 0) return // oculto
      if (r.height < 44 - 0.5 || r.width < 44 - 0.5) {
        salida.push(`${el.tagName.toLowerCase()} «${(el.textContent || el.getAttribute('aria-label') || '').trim().slice(0, 30)}» ${Math.round(r.width)}×${Math.round(r.height)}`)
      }
    })
    return salida
  })
  expect(pequenos).toEqual([])
}

test.describe('accesibilidad y adaptación (V9, SC-008, FR-021)', () => {
  test('/acceso: sin desplazamiento horizontal, sin violaciones graves y objetivos ≥ 44 px', async ({ page }) => {
    await page.goto('/acceso')
    await sinDesbordeHorizontal(page)
    await sinViolacionesGraves(page)
    await objetivosTactiles(page)
  })

  test('/agenda: sin desplazamiento horizontal, sin violaciones graves y objetivos ≥ 44 px', async ({ page }, info) => {
    await entrar(page)
    await page.goto(`/agenda?fecha=${diaConCitas(info)}`)
    await expect(page.locator('[data-testid="tarjeta-cita"]:visible').first()).toBeVisible()
    await sinDesbordeHorizontal(page)
    await sinViolacionesGraves(page)
    await objetivosTactiles(page)
  })

  test('/agenda/nueva: sin desplazamiento horizontal, sin violaciones graves y objetivos ≥ 44 px', async ({ page }) => {
    await entrar(page)
    await page.goto('/agenda/nueva')
    await expect(page.getByLabel('Profesional')).toBeVisible()
    await sinDesbordeHorizontal(page)
    await sinViolacionesGraves(page)
    await objetivosTactiles(page)
  })
})
