# Investigación: Núcleo de agenda

No quedaban marcadores «NEEDS CLARIFICATION» en el contexto técnico; este documento recoge las decisiones de stack con su justificación. Criterio rector: apariencia profesional y actual (2026) sin romper la simplicidad (principio IV) ni la garantía anti-solape (principio III).

## D1. Framework: Next.js 16 (App Router) + React 19 + TypeScript estricto

- **Decisión**: un único proyecto Next.js con Server Components y Server Actions.
- **Justificación**: es el estándar de facto para interfaces web actuales; los Server Components entregan la agenda ya renderizada (rápida en móvil, cumple SC-005) y las Server Actions eliminan una API REST propia (menos superficie, principio IV). TypeScript estricto da tipos compartidos entre BD, dominio y UI.
- **Alternativas**: SPA React + API aparte (dos proyectos, más código sin valor añadido); SvelteKit/Nuxt (válidos, pero menor ecosistema de componentes de calidad profesional); Angular (más pesado para 4 pantallas).

## D2. Estilos y sistema de diseño: Tailwind CSS v4 + shadcn/ui (Radix UI)

- **Decisión**: tokens de diseño en `@theme` de Tailwind v4, componentes shadcn/ui copiados al repositorio, iconos `lucide-react`, tipografía Inter (variable, autoalojada con `next/font`), solo modo claro (el modo oscuro no está en la spec), esquinas redondeadas, sombras suaves y espaciado generoso.
- **Justificación**: es el lenguaje visual dominante en productos SaaS de 2026 (limpio, denso en información, accesible). Radix aporta foco, teclado y ARIA correctos (principio VII: contraste y accesibilidad) sin escribirlos a mano. Los componentes viven en el repo, así que no hay una dependencia opaca que actualizar.
- **Alternativas**: MUI/Ant Design (aspecto genérico, más peso y personalización costosa); CSS propio (más trabajo y riesgo de accesibilidad); Chakra/Mantine (válidos, menos alineados con la tendencia actual).

## D3. Visualización de la agenda: línea de tiempo propia con CSS Grid

- **Decisión**: columna por profesional, escala vertical 09:00–20:00 con CSS Grid; en móvil, una columna con selector de profesional (pestañas). Sin librería de calendario.
- **Justificación**: la vista es sencilla (un día, tramos ocupados/libres) y las librerías de calendario (FullCalendar, etc.) añaden peso, estilos ajenos y reglas propias de solape que podrían contradecir el dominio. Control total sobre accesibilidad y 360 px.
- **Alternativas**: FullCalendar / react-big-calendar (dependencia grande para un caso que no necesita arrastrar ni vistas semanales).

## D4. Base de datos: PostgreSQL 17 con restricción de exclusión

- **Decisión**:
  ```sql
  CREATE EXTENSION IF NOT EXISTS btree_gist;
  ALTER TABLE cita ADD CONSTRAINT cita_sin_solape
    EXCLUDE USING gist (
      profesional_id WITH =,
      tstzrange(inicio, fin, '[)') WITH &&
    ) WHERE (estado IN ('reservada', 'completada'));
  ```
- **Justificación**: comprobar «¿hay solape?» en código y luego insertar tiene una condición de carrera: dos peticiones simultáneas pasan ambas la comprobación. La restricción de exclusión la resuelve de forma atómica en la BD: la segunda inserción falla con el código `23P01`, que el servicio traduce a «hueco ocupado» (FR-011). El rango semiabierto `[)` hace que tramos contiguos no solapen (FR-010). La cláusula `WHERE` deja libres los huecos de citas canceladas o no asistidas (FR-009). Además, la transición a `completada` no puede crear solapes porque la fila ya ocupa el hueco.
- **Alternativas**: bloqueo a nivel de aplicación o `SELECT … FOR UPDATE` (frágil, depende de que todo el código lo respete); `SERIALIZABLE` con reintentos (más complejo y no protege frente a escrituras fuera del servicio); SQLite (no tiene restricciones de exclusión, obligaría a bloqueo manual).

## D5. Acceso a datos: Drizzle ORM + postgres.js

- **Decisión**: esquema tipado en Drizzle; las migraciones son SQL versionado (la restricción de exclusión va en SQL puro).
- **Justificación**: ligero, sin generador de cliente ni motor binario, SQL transparente y fácil de auditar; admite SQL propio para lo que el ORM no modela (`EXCLUDE`, `tstzrange`).
- **Alternativas**: Prisma (más pesado y no modela las restricciones de exclusión; habría que salirse a SQL igualmente); SQL a mano sin ORM (sin tipos).

## D6. Fechas, zona horaria e importes

- **Decisión**: instantes en `timestamptz`; la zona `Europe/Madrid` se aplica solo en la frontera (`@date-fns/tz` + `Intl.DateTimeFormat('es-ES', { timeZone: 'Europe/Madrid' })`); formatos `dd/MM/yyyy` y `HH:mm` (24 h). Importes como `integer` de céntimos; formateo con `Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' })`.
- **Justificación**: guardar UTC evita ambigüedades por cambio de hora (una cita de 45' dura 45' reales). Los días de cambio de hora (23 h y 25 h) se tratan calculando los límites del día en Madrid, no sumando 24 h. Los céntimos enteros eliminan errores de coma flotante (principio II, SC-009).
- **Alternativas**: `Temporal` (aún sin soporte estable generalizado en navegadores; se reevaluará); `numeric(10,2)` (válido, pero obliga a conversiones y riesgo de `Number` en JS).

## D7. Acceso con clave de clínica

- **Decisión**: la clave se guarda con hash (`scrypt` de `node:crypto`, sin dependencia extra); al acertar se emite una cookie `httpOnly`, `secure`, `sameSite=lax` firmada con `jose` que contiene el identificador de la clínica; todas las consultas filtran por ese identificador. Tras un puerto `AccesoClinica` para poder sustituirlo (FR-018).
- **Justificación**: cumple FR-001/FR-018/FR-024 con lo mínimo; el filtrado por clínica en cada servicio evita ver o modificar datos de otra (FR-024). Es deuda consciente declarada en la spec.
- **Alternativas**: Auth.js / Clerk (excesivo para una clave compartida; principio IV).

## D8. Validación y errores

- **Decisión**: Zod valida la entrada de cada Server Action (teléfono, email, identificadores, fecha/hora). Los errores de negocio son tipos propios con mensaje en español sin jerga (FR-017); la interfaz nunca muestra trazas ni códigos SQL.
- **Justificación**: una única fuente de verdad para forma de los datos y mensajes. Zod ya se usa para tipar los formularios.

## D9. Semilla determinista

- **Decisión**: PRNG `mulberry32` con semilla fija (constante en código) y **fecha ancla** como parámetro (por defecto, el lunes de la semana actual en Madrid). Historia = 8 semanas antes del ancla; futuro = 2 semanas a partir del primer instante posterior a `max(ancla, ahora)`, de modo que ninguna cita `reservada` queda en el pasado (FR-022). Los identificadores se derivan del PRNG y `creada_en` se fija desde el ancla, para que dos cargas sean idénticas fila a fila salvo `clave_hash` (sal aleatoria). El instante `ahora` es un parámetro del generador (en pruebas, un `RelojFijo`). El generador coloca primero las citas sin solape y después asigna estados con cuotas exactas (10 % no asistidas, 8 % canceladas, resto completadas; futuras todas reservadas).
- **Justificación**: con el mismo ancla y la misma semilla, el resultado es idéntico byte a byte (SC-006); asignar estados por cuotas exactas, y no por probabilidad por cita, garantiza que SC-007 se cumple siempre dentro de ±2 puntos. Los datos relativos al día de hoy mantienen la demo útil; para pruebas reproducibles el ancla se fija explícitamente.
- **Alternativas**: volcado SQL estático (las fechas caducan y la demo se queda sin futuro); `faker` (dependencia sin necesidad; nombres de una lista fija bastan).

## D10. Pruebas

- **Decisión**: Vitest para dominio y servicios, estos últimos contra un PostgreSQL real (contenedor del `docker-compose.yml`), porque la garantía anti-solape es una propiedad de la BD y un mock no la probaría. Prueba de concurrencia: N reservas simultáneas (`Promise.all`) sobre el mismo hueco → exactamente 1 aceptada. Playwright + axe para E2E, accesibilidad y viewport de 360 px.
- **Justificación**: principios III y VI. El nombre de cada test incluye el ID de spec que cubre.
- **Alternativas**: pg-mem o BD en memoria (no soportan `EXCLUDE … gist`); Jest (más lento y con más configuración con TS/ESM).

## D11. Entorno de ejecución

- **Decisión**: `docker-compose.yml` con PostgreSQL 17 para desarrollo y pruebas; gestor de paquetes `pnpm`; scripts: `dev`, `test`, `test:e2e`, `db:migrate`, `db:seed`.
- **Justificación**: arranque reproducible con un solo comando; sin servicios adicionales.
