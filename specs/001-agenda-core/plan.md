# Plan de implementación: Núcleo de agenda

**Rama**: `001-agenda-core` | **Fecha**: 2026-11-16 | **Spec**: [spec.md](spec.md)

**Entrada**: especificación de la feature en `specs/001-agenda-core/spec.md`. Directriz del usuario: stack tecnológico moderno que permita una apariencia profesional y actual (estilo 2026).

## Resumen

Aplicación web full-stack en TypeScript con **Next.js 16 (App Router, React 19)**, interfaz con **Tailwind CSS v4 + shadcn/ui (Radix)** y persistencia en **PostgreSQL 17**. La regla capital (sin solapes, principio III) se garantiza **en la base de datos** con una restricción de exclusión (`EXCLUDE USING gist` sobre `tstzrange`), no solo en código: es la única forma de que dos reservas simultáneas del mismo hueco no puedan coexistir. La lógica de negocio vive en un módulo de dominio puro, sin dependencias de framework, y la interfaz solo la invoca mediante Server Actions. Los datos de demostración salen de una semilla con generador pseudoaleatorio determinista.

## Contexto técnico

**Lenguaje/Versión**: TypeScript 5.x (modo `strict`) sobre Node.js 22 LTS

**Dependencias principales**: Next.js 16, React 19, Tailwind CSS v4, shadcn/ui (Radix UI + lucide-react), Drizzle ORM + `postgres` (postgres.js), Zod, date-fns v4 + `@date-fns/tz`, `jose` (cookie de sesión firmada)

**Almacenamiento**: PostgreSQL 17 (extensión `btree_gist`); importes en céntimos (`integer`); instantes en `timestamptz` (UTC)

**Pruebas**: Vitest (dominio y servicios contra PostgreSQL real), Playwright (E2E y accesibilidad con `@axe-core/playwright`)

**Plataforma objetivo**: navegador moderno de escritorio y móvil (≥ 360 px); servidor Node en contenedor

**Tipo de proyecto**: aplicación web única (Next.js monolito), sin API REST pública

**Objetivos de rendimiento**: agenda del día de un profesional < 2 s con la demo (SC-005); alta de cita < 1 min de uso (SC-003)

**Restricciones**: cero solapes incluso con concurrencia (SC-001); sin desplazamiento horizontal desde 360 px (SC-008); todo texto en español de España; zona fija Europe/Madrid

**Escala/Alcance**: 1 clínica de demo, 3 profesionales, ~40 pacientes, ~10 semanas de citas (≈ 500 filas); 4 pantallas (acceso, agenda del día, nueva cita, detalle/cierre de cita)

## Comprobación de la constitución

*Puerta previa a la investigación; se reevalúa tras el diseño.*

| Principio | Cumplimiento | Evidencia |
|---|---|---|
| I. Spec First | ✅ | Plan derivado de `spec.md`; `specs/MAPA.md` aún no existe (pendiente anotado en la spec): se crea como tarea T0 de `tasks.md`. |
| II. Importes y fechas exactos | ✅ | Céntimos enteros (sin `float`); `timestamptz` + `Intl`/`@date-fns/tz` con `Europe/Madrid`; formato `dd/MM/yyyy` y `HH:mm`. Pruebas de cambio de hora (marzo y octubre). |
| III. El solape es el fallo capital | ✅ | `EXCLUDE USING gist` parcial (solo `reservada` y `completada`) con rango `[)`. Pruebas de reservas concurrentes sobre el mismo hueco. |
| IV. Simplicidad y cero alcance fantasma | ✅ | Monolito único, sin API REST, sin colas, sin caché, sin gestor de estado en cliente. Cada dependencia está justificada en `research.md`. |
| V. Datos reproducibles | ✅ | Semilla con PRNG `mulberry32` y fecha ancla explícita; prueba de doble carga idéntica. |
| VI. Tests con la spec | ✅ | Cada test cita su ID (`FR-009`, `SC-001`, escenario H1.2…) en el nombre; matriz en `quickstart.md`. |
| VII. Interfaz clara y moderna | ✅ | Stack elegido para ello (ver `research.md` D1–D3); verificación con axe y viewport 360 px. |
| VIII. Español de España | ✅ | Mensajes y artefactos en español; `lang="es-ES"`. |

**Resultado de la puerta**: sin violaciones; no se rellena «Seguimiento de complejidad». Reevaluación posterior al diseño: se mantiene sin violaciones.

## Estructura del proyecto

### Documentación (esta feature)

```text
specs/001-agenda-core/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── actions.md
└── tasks.md             # lo genera /speckit-tasks
```

### Código fuente (raíz del repositorio)

```text
src/
├── app/                         # Next.js App Router (solo UI y Server Actions)
│   ├── (publico)/acceso/        # pantalla de clave de clínica
│   ├── (panel)/agenda/          # agenda del día por profesional
│   ├── (panel)/agenda/nueva/    # alta de cita
│   ├── envolver-accion.ts       # convierte errores de negocio en Resultado
│   ├── layout.tsx
│   └── globals.css              # tokens de diseño (Tailwind v4 @theme)
├── proxy.ts                     # redirige a /acceso sin sesión (Next.js 16)
├── components/
│   ├── ui/                      # primitivas shadcn/ui
│   └── agenda/                  # línea de tiempo, tarjeta de cita, formulario
├── dominio/                     # TypeScript puro, sin framework ni BD
│   ├── cita.ts                  # estados, transiciones, cálculo de fin
│   ├── horario.ts               # horario de atención y huecos libres
│   ├── dinero.ts                # céntimos ↔ texto en euros
│   ├── fechas.ts                # Europe/Madrid, formatos es-ES
│   ├── paciente.ts              # esquema Zod de la ficha de paciente
│   └── errores.ts               # errores de negocio con mensaje en español
├── servicios/                   # casos de uso; reciben la BD y el Reloj
│   ├── reservar-cita.ts
│   ├── cerrar-cita.ts
│   ├── consultar-agenda.ts
│   ├── previsualizar-cita.ts
│   ├── catalogo.ts              # profesionales, servicios y pacientes de la clínica
│   ├── reloj.ts                 # RelojSistema y RelojFijo
│   ├── sesion.ts                # cookie de sesión firmada
│   └── acceso.ts                # puerto de autenticación (sustituible, FR-018)
├── bd/
│   ├── esquema.ts               # tablas Drizzle
│   ├── migrar.ts                # ejecuta las migraciones SQL
│   ├── migraciones/             # SQL, incluye la restricción de exclusión
│   └── cliente.ts
└── semilla/
    ├── datos.ts                 # datos fijos de la demo
    ├── generar.ts               # PRNG determinista
    ├── cargar.ts
    └── cli.ts                   # pnpm db:seed

tests/
├── dominio/                     # unitarios (Vitest)
├── servicios/                   # integración contra PostgreSQL real, incl. concurrencia
├── semilla/                     # determinismo y recuentos
└── e2e/                         # Playwright + axe, viewports 360 px y escritorio

docker-compose.yml               # PostgreSQL 17 para desarrollo y pruebas
```

**Decisión de estructura**: proyecto único. El dominio no importa nada de `app/`, `bd/` ni librerías de UI; los servicios dependen de la BD y de un `Reloj` inyectado (para probar «inicio en el pasado» sin depender del reloj real). La autenticación queda tras un puerto en `servicios/acceso.ts` para poder sustituirla sin tocar reglas de negocio (FR-018).
