import { crearCliente } from '@/bd/cliente'
import { migrar } from '@/bd/migrar'
import { cargarSemilla } from '@/semilla/cargar'
import { ANCLA } from './ayudas'

/** Antes de la suite: BD de pruebas migrada y con la semilla de la semana en curso. */
export default async function globalSetup() {
  const url = process.env.DATABASE_URL_TEST
  if (!url) throw new Error('Falta DATABASE_URL_TEST (copia .env.example a .env.local).')
  const { sql, bd } = crearCliente(url, 1)
  try {
    await migrar(sql)
    await cargarSemilla(bd, { ancla: ANCLA, ahora: new Date() })
  } finally {
    await sql.end()
  }
}
