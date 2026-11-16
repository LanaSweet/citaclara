import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Cliente } from '@/bd/cliente'
import { accesoPorClaveDeClinica, hashearClave } from '@/servicios/acceso'
import { firmarToken, obtenerClinicaId, verificarToken, NOMBRE_COOKIE } from '@/servicios/sesion'
import { abrirBdPruebas, crearClinica, limpiarBd } from '../ayudas/bd'

// La cookie de la petición se simula con un Map.
const galletas = new Map<string, string>()
vi.mock('next/headers', () => ({
  cookies: async () => ({
    get: (n: string) => (galletas.has(n) ? { name: n, value: galletas.get(n)! } : undefined),
    set: (n: string, v: string) => void galletas.set(n, v),
  }),
}))

let c: Cliente
beforeAll(() => {
  process.env.SESION_SECRETO ??= 'secreto-de-pruebas-con-mas-de-treinta-y-dos-caracteres'
})
beforeEach(async () => {
  c ??= await abrirBdPruebas()
  await limpiarBd(c)
  galletas.clear()
})
afterAll(() => c?.sql.end())

describe('acceso con clave de clínica', () => {
  it('H4.2: una clave incorrecta devuelve null, exista o no la clínica', async () => {
    const acceso = accesoPorClaveDeClinica(c.bd)
    expect(await acceso.verificarClave('lo-que-sea')).toBeNull() // sin clínicas
    await crearClinica(c.bd, { clave: 'clave-correcta' })
    expect(await acceso.verificarClave('clave-incorrecta')).toBeNull()
    expect(await acceso.verificarClave('')).toBeNull()
  })

  it('H4.3: la clave correcta de Clínica Eleva devuelve su clinicaId', async () => {
    const eleva = await crearClinica(c.bd, { nombre: 'Clínica Eleva', clave: 'clave-correcta' })
    await crearClinica(c.bd, { nombre: 'Otra', clave: 'otra-clave' })
    expect(await accesoPorClaveDeClinica(c.bd).verificarClave('clave-correcta')).toBe(eleva.id)
  })

  it('FR-001: la clave nunca se guarda en claro y cada hash lleva una sal distinta', async () => {
    const a = await hashearClave('misma-clave')
    const b = await hashearClave('misma-clave')
    expect(a).not.toBe(b)
    expect(a.startsWith('scrypt$')).toBe(true)
    expect(a).not.toContain('misma-clave')
    const fila = await crearClinica(c.bd, { clave: 'misma-clave' })
    expect(fila.claveHash).not.toContain('misma-clave')
  })

  it('H4.1, FR-018: sin cookie, obtenerClinicaId lanza NO_AUTORIZADO', async () => {
    await expect(obtenerClinicaId()).rejects.toMatchObject({ codigo: 'NO_AUTORIZADO' })
  })

  it('H4.1, FR-018: con una cookie manipulada o de otra firma, lanza NO_AUTORIZADO', async () => {
    const token = await firmarToken('clinica-1')
    galletas.set(NOMBRE_COOKIE, token.slice(0, -3) + 'abc')
    await expect(obtenerClinicaId()).rejects.toMatchObject({ codigo: 'NO_AUTORIZADO' })
    galletas.set(NOMBRE_COOKIE, 'basura')
    await expect(obtenerClinicaId()).rejects.toMatchObject({ codigo: 'NO_AUTORIZADO' })
  })

  it('H4.3, FR-018: con una cookie válida devuelve el clinicaId firmado', async () => {
    galletas.set(NOMBRE_COOKIE, await firmarToken('clinica-1'))
    await expect(obtenerClinicaId()).resolves.toBe('clinica-1')
    expect(await verificarToken(undefined)).toBeNull()
  })
})
