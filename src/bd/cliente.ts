import { drizzle, type PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as esquema from './esquema'

export type Bd = PostgresJsDatabase<typeof esquema>
export type Conexion = ReturnType<typeof postgres>

export interface Cliente {
  sql: Conexion
  bd: Bd
}

/** Crea una conexión inyectable (las pruebas usan `DATABASE_URL_TEST`). */
export function crearCliente(url: string, max = 10): Cliente {
  const sql = postgres(url, { max, onnotice: () => {} })
  return { sql, bd: drizzle(sql, { schema: esquema }) }
}

let porDefecto: Cliente | undefined

/** Cliente de la aplicación, creado bajo demanda desde `DATABASE_URL`. */
export function obtenerBd(): Bd {
  if (!porDefecto) {
    const url = process.env.DATABASE_URL
    if (!url) throw new Error('Falta la variable de entorno DATABASE_URL.')
    porDefecto = crearCliente(url)
  }
  return porDefecto.bd
}
