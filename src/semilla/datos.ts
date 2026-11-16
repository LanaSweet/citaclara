/** Datos fijos de Clínica Eleva para la demostración (FR-022). */

export const NOMBRE_CLINICA = 'Clínica Eleva'

/** Clave del panel de la demo; el comando `pnpm db:seed` la imprime. */
export const CLAVE_DEMO = 'eleva-demo-2026'

export const PROFESIONALES = [
  { nombre: 'María', especialidad: 'Fisioterapia' },
  { nombre: 'Jorge', especialidad: 'Fisioterapia' },
  { nombre: 'Lucía', especialidad: 'Nutrición' },
] as const

export const SERVICIOS = [
  { clave: 'fisio', nombre: 'Sesión de fisioterapia', especialidad: 'Fisioterapia', duracionMin: 45, importeCentimos: 4000 },
  { clave: 'fisio-primera', nombre: 'Primera visita de fisioterapia', especialidad: 'Fisioterapia', duracionMin: 60, importeCentimos: 5000 },
  { clave: 'nutri', nombre: 'Consulta de nutrición', especialidad: 'Nutrición', duracionMin: 30, importeCentimos: 3500 },
  { clave: 'nutri-primera', nombre: 'Primera consulta de nutrición', especialidad: 'Nutrición', duracionMin: 45, importeCentimos: 4500 },
] as const

const NOMBRES_PACIENTES = [
  'Ana Pérez', 'Luis García', 'Carmen Ruiz', 'Javier Martín', 'Laura Sánchez', 'Pablo Gómez', 'Marta López',
  'Sergio Fernández', 'Elena Díaz', 'Daniel Moreno', 'Paula Jiménez', 'Alberto Romero', 'Isabel Navarro',
  'Raúl Torres', 'Cristina Domínguez', 'Andrés Vázquez', 'Sara Ramos', 'Hugo Gil', 'Nuria Serrano',
  'Iván Blanco', 'Beatriz Molina', 'Adrián Castro', 'Irene Ortega', 'Rubén Rubio', 'Silvia Marín',
  'Óscar Sanz', 'Patricia Iglesias', 'Diego Medina', 'Lorena Garrido', 'Víctor Cortés', 'Rocío Castillo',
  'Manuel Santos', 'Alicia Lozano', 'Gonzalo Guerrero', 'Teresa Cano', 'Álvaro Prieto', 'Julia Méndez',
  'Fernando Cruz', 'Natalia Calvo', 'Miguel Gallego',
]

function sinTildes(texto: string): string {
  return texto.normalize('NFD').replace(/[̀-ͯ]/g, '')
}

/** ~40 pacientes con teléfonos y correos válidos y estables. */
export const PACIENTES = NOMBRES_PACIENTES.map((nombre, i) => ({
  nombre,
  telefono: `6${String(10_000_000 + i * 137_911).slice(0, 8)}`,
  email: `${sinTildes(nombre).toLowerCase().replace(/\s+/g, '.')}@example.com`,
}))
