# Modelo de datos: Núcleo de agenda

Esta spec es la propietaria de estas entidades (futuras specs de recordatorios y analítica las reutilizarán). Convenciones: identificadores `uuid`; instantes en `timestamptz` (UTC); importes en céntimos enteros.

## Entidades

### Clínica (`clinica`)

| Campo | Tipo | Reglas |
|---|---|---|
| `id` | uuid, PK | |
| `nombre` | text, no nulo | |
| `clave_hash` | text, no nulo | `scrypt` con sal; nunca se guarda ni se muestra la clave en claro (FR-001) |

### Profesional (`profesional`)

| Campo | Tipo | Reglas |
|---|---|---|
| `id` | uuid, PK | |
| `clinica_id` | uuid, FK → clinica | no nulo (FR-002, FR-024) |
| `nombre` | text, no nulo | |
| `especialidad` | text, no nulo | «Fisioterapia», «Nutrición» |

### Servicio (`servicio`)

| Campo | Tipo | Reglas |
|---|---|---|
| `id` | uuid, PK | |
| `clinica_id` | uuid, FK → clinica | no nulo |
| `nombre` | text, no nulo | |
| `duracion_min` | integer, no nulo | `CHECK (duracion_min > 0)` (FR-003) |
| `importe_centimos` | integer, no nulo | `CHECK (importe_centimos >= 0)`; 4000 = 40,00 € (FR-003, FR-020) |

### Paciente (`paciente`)

| Campo | Tipo | Reglas |
|---|---|---|
| `id` | uuid, PK | |
| `clinica_id` | uuid, FK → clinica | no nulo |
| `nombre` | text, no nulo | |
| `telefono` | text, no nulo | validado en la carga: no vacío y formato telefónico español (FR-004, caso límite) |
| `email` | text, no nulo | validado en la carga: no vacío y con formato de correo (FR-004, caso límite) |

### Cita (`cita`)

| Campo | Tipo | Reglas |
|---|---|---|
| `id` | uuid, PK | |
| `clinica_id` | uuid, FK → clinica | no nulo; evita cruces entre clínicas (FR-024) |
| `profesional_id` | uuid, FK → profesional | no nulo |
| `servicio_id` | uuid, FK → servicio | no nulo |
| `paciente_id` | uuid, FK → paciente | no nulo |
| `inicio` | timestamptz, no nulo | |
| `fin` | timestamptz, no nulo | `CHECK (fin > inicio)`; lo fija el servicio como `inicio + duracion_min` (FR-005) |
| `estado` | enum `estado_cita` | `reservada` (por defecto), `completada`, `cancelada`, `no_asistida` (FR-006) |
| `creada_en` | timestamptz, no nulo | por defecto `now()` |

Restricciones adicionales en `cita`:

- **Sin solape (FR-009, FR-010, FR-011)** — la garantía del principio III:
  ```sql
  EXCLUDE USING gist (
    profesional_id WITH =,
    tstzrange(inicio, fin, '[)') WITH &&
  ) WHERE (estado IN ('reservada', 'completada'))
  ```
- Integridad de clínica: `profesional`, `servicio` y `paciente` de una cita deben pertenecer a su `clinica_id` (claves foráneas compuestas `(id, clinica_id)`).
- Finales inmutables (FR-007): disparador `BEFORE UPDATE` que rechaza cualquier cambio de `estado` si el valor anterior no es `reservada`. Defensa en profundidad; la regla primaria vive en el dominio.

Índices: la restricción de exclusión crea el índice GiST; además `cita (clinica_id, inicio)` para la agenda del día.

## Relaciones

```text
clinica 1──* profesional
clinica 1──* servicio
clinica 1──* paciente
clinica 1──* cita
profesional 1──* cita
servicio    1──* cita
paciente    1──* cita
```

## Ciclo de vida de la cita (FR-006, FR-007, FR-016)

```text
            ┌── completar (inicio ≤ ahora) ──► completada  (final, ocupa hueco)
reservada ──┼── cancelar (en cualquier momento) ► cancelada   (final, libera hueco)
            └── no asistió (inicio ≤ ahora) ──► no_asistida (final, libera hueco)
```

| Desde | Acción | Condición | Hacia |
|---|---|---|---|
| reservada | completar | `inicio ≤ ahora` | completada |
| reservada | no asistió | `inicio ≤ ahora` | no_asistida |
| reservada | cancelar | ninguna | cancelada |
| completada / cancelada / no_asistida | cualquiera | — | **rechazado** («estado final») |

**Pendiente de cerrar (FR-016b)**: no es un estado. Es una condición derivada: `estado = 'reservada' AND inicio ≤ ahora`. Se calcula al leer y nunca modifica el estado.

## Reglas de validación (en el dominio)

| Regla | Origen | Mensaje al usuario |
|---|---|---|
| `inicio > ahora` (el reloj se inyecta) | FR-012, RN2 | «No se pueden crear citas en el pasado.» |
| Cita completa dentro de lunes a viernes, 09:00–20:00, hora de Madrid, y en el mismo día local | FR-013 | «La cita queda fuera del horario de atención (lunes a viernes, de 09:00 a 20:00).» |
| `23P01` de la restricción de exclusión | FR-009, FR-011 | «Ese hueco ya está ocupado.» (y se devuelve la agenda actualizada) |
| Transición no permitida | FR-007, FR-016 | «Esta cita ya está cerrada y no se puede modificar.» / «Solo se puede marcar como completada o no asistida una cita que ya ha empezado; antes solo se puede cancelar.» |
| Profesional, servicio o paciente de otra clínica | FR-024 | «No se ha encontrado el dato solicitado.» (sin revelar existencia) |

## Datos de demostración (FR-022, FR-023)

Clínica Eleva; profesionales María y Jorge (Fisioterapia) y Lucía (Nutrición); servicios: sesión fisio (45', 4000), primera visita fisio (60', 5000), consulta nutrición (30', 3500), primera nutrición (45', 4500); ~40 pacientes de una lista fija de nombres. Historia: 8 semanas antes del ancla con cuotas exactas de estados (≈10 % no asistidas, ≈8 % canceladas, resto completadas); futuro: 2 semanas con todas las citas reservadas. Sin solapes, por construcción y por la restricción de la BD.
