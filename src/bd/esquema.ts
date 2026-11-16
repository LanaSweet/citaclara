import { integer, pgEnum, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'

export const estadoCita = pgEnum('estado_cita', ['reservada', 'completada', 'cancelada', 'no_asistida'])

export const clinica = pgTable('clinica', {
  id: uuid('id').primaryKey().defaultRandom(),
  nombre: text('nombre').notNull(),
  claveHash: text('clave_hash').notNull(),
})

export const profesional = pgTable('profesional', {
  id: uuid('id').primaryKey().defaultRandom(),
  clinicaId: uuid('clinica_id').notNull(),
  nombre: text('nombre').notNull(),
  especialidad: text('especialidad').notNull(),
})

export const servicio = pgTable('servicio', {
  id: uuid('id').primaryKey().defaultRandom(),
  clinicaId: uuid('clinica_id').notNull(),
  nombre: text('nombre').notNull(),
  duracionMin: integer('duracion_min').notNull(),
  importeCentimos: integer('importe_centimos').notNull(),
})

export const paciente = pgTable('paciente', {
  id: uuid('id').primaryKey().defaultRandom(),
  clinicaId: uuid('clinica_id').notNull(),
  nombre: text('nombre').notNull(),
  telefono: text('telefono').notNull(),
  email: text('email').notNull(),
})

export const cita = pgTable('cita', {
  id: uuid('id').primaryKey().defaultRandom(),
  clinicaId: uuid('clinica_id').notNull(),
  profesionalId: uuid('profesional_id').notNull(),
  servicioId: uuid('servicio_id').notNull(),
  pacienteId: uuid('paciente_id').notNull(),
  inicio: timestamp('inicio', { withTimezone: true, mode: 'date' }).notNull(),
  fin: timestamp('fin', { withTimezone: true, mode: 'date' }).notNull(),
  estado: estadoCita('estado').notNull().default('reservada'),
  creadaEn: timestamp('creada_en', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
})

// Las claves foráneas compuestas, la restricción `cita_sin_solape`, los CHECK y el disparador
// viven en la migración SQL (src/bd/migraciones/0000_inicial.sql): Drizzle no expresa EXCLUDE.
