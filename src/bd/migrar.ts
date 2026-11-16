import { readdirSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { crearCliente, type Conexion } from './cliente'

const carpeta = join(dirname(fileURLToPath(import.meta.url)), 'migraciones')

/** Aplica, en orden, las migraciones `.sql` pendientes. Devuelve los nombres aplicados. */
export async function migrar(sql: Conexion): Promise<string[]> {
  await sql`CREATE TABLE IF NOT EXISTS migraciones_aplicadas (nombre text PRIMARY KEY, aplicada_en timestamptz NOT NULL DEFAULT now())`
  const hechas = new Set((await sql`SELECT nombre FROM migraciones_aplicadas`).map((f) => f.nombre as string))
  const aplicadas: string[] = []
  for (const archivo of readdirSync(carpeta).filter((a) => a.endsWith('.sql')).sort()) {
    if (hechas.has(archivo)) continue
    await sql.begin(async (tx) => {
      await tx.unsafe(readFileSync(join(carpeta, archivo), 'utf8'))
      await tx`INSERT INTO migraciones_aplicadas (nombre) VALUES (${archivo})`
    })
    aplicadas.push(archivo)
  }
  return aplicadas
}

// Ejecución directa: `pnpm db:migrate`.
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const url = process.env.DATABASE_URL
  if (!url) {
    console.error('Falta la variable de entorno DATABASE_URL.')
    process.exit(1)
  }
  const { sql } = crearCliente(url, 1)
  migrar(sql)
    .then((a) => console.log(a.length ? `Migraciones aplicadas: ${a.join(', ')}` : 'No hay migraciones pendientes.'))
    .catch((e) => {
      console.error(e)
      process.exitCode = 1
    })
    .finally(() => sql.end())
}
