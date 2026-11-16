import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto'
import { promisify } from 'node:util'
import { clinica } from '@/bd/esquema'
import type { Bd } from '@/bd/cliente'

const derivar = promisify(scrypt) as (clave: string, sal: Buffer, largo: number) => Promise<Buffer>
const LARGO = 64

/** Puerto de autenticación: las reglas de negocio solo dependen de esto (FR-018). */
export interface AccesoClinica {
  /** Devuelve el `clinicaId` si la clave es válida, o `null`. */
  verificarClave(clave: string): Promise<string | null>
}

/** `scrypt$<sal hex>$<hash hex>`; la sal es aleatoria, así que dos hashes de la misma clave difieren. */
export async function hashearClave(clave: string): Promise<string> {
  const sal = randomBytes(16)
  const hash = await derivar(clave, sal, LARGO)
  return `scrypt$${sal.toString('hex')}$${hash.toString('hex')}`
}

async function coincide(clave: string, almacenado: string): Promise<boolean> {
  const [esquema, salHex, hashHex] = almacenado.split('$')
  if (esquema !== 'scrypt' || !salHex || !hashHex) return false
  const esperado = Buffer.from(hashHex, 'hex')
  const calculado = await derivar(clave, Buffer.from(salHex, 'hex'), esperado.length)
  return calculado.length === esperado.length && timingSafeEqual(calculado, esperado)
}

/** Implementación por defecto: compara con `clinica.clave_hash`. */
export function accesoPorClaveDeClinica(bd: Bd): AccesoClinica {
  return {
    async verificarClave(clave) {
      const clinicas = await bd.select({ id: clinica.id, claveHash: clinica.claveHash }).from(clinica)
      let encontrada: string | null = null
      // Se recorren todas para no filtrar por tiempo cuál clínica existe.
      for (const c of clinicas) {
        if ((await coincide(clave, c.claveHash)) && encontrada === null) encontrada = c.id
      }
      return encontrada
    },
  }
}
