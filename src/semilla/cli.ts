import { crearCliente } from '@/bd/cliente'
import { migrar } from '@/bd/migrar'
import { lunesDeLaSemana, parsearFechaIso } from '@/dominio/fechas'
import { cargarSemilla } from './cargar'

async function principal() {
  const url = process.env.DATABASE_URL
  if (!url) throw new Error('Falta la variable de entorno DATABASE_URL.')

  const i = process.argv.indexOf('--ancla')
  const ahora = new Date()
  const ancla = i >= 0 ? process.argv[i + 1] : lunesDeLaSemana(ahora)
  parsearFechaIso(ancla ?? '') // valida el formato

  const { sql, bd } = crearCliente(url, 1)
  try {
    await migrar(sql)
    const r = await cargarSemilla(bd, { ancla, ahora })
    const estados = Object.entries(r.citasPorEstado)
      .map(([e, n]) => `${e}: ${n}`)
      .join(', ')
    console.log(`Clínica Eleva cargada (ancla ${ancla}).`)
    console.log(`  Profesionales: ${r.profesionales} · Servicios: ${r.servicios} · Pacientes: ${r.pacientes}`)
    console.log(`  Citas → ${estados}`)
    console.log(`  Clave del panel de la demo: ${r.clave}`)
  } finally {
    await sql.end()
  }
}

principal().catch((e) => {
  console.error(e instanceof Error ? e.message : e)
  process.exitCode = 1
})
