---

description: "Lista de tareas de la feature Núcleo de agenda"
---

# Tareas: Núcleo de agenda

**Entrada**: documentos de diseño de `specs/001-agenda-core/`

**Requisitos previos**: plan.md, spec.md, research.md, data-model.md, contracts/actions.md, quickstart.md

**Pruebas**: incluidas. La constitución (principios III y VI) las exige: cada test MUST citar en su nombre el ID de spec que cubre (`FR-009`, `SC-001`, `H1.2`…) y toda feature que escribe en la agenda MUST incluir pruebas de solape, también con reservas simultáneas.

**Organización**: tareas agrupadas por historia de usuario para implementar y probar cada una de forma independiente. Las historias P1–P3 siguen el orden de `spec.md`.

## Formato: `[ID] [P?] [Historia] Descripción`

- **[P]**: se puede ejecutar en paralelo (archivos distintos, sin dependencias pendientes)
- **[Historia]**: historia a la que pertenece (US1…US5)
- Todas las rutas son relativas a la raíz del repositorio (`citaclara/`)

## Convenciones de implementación (aplican a todas las tareas)

- Todo texto de interfaz, mensaje de error, comentario y nombre de test en español de España (principio VIII). Identificadores de código en español, como en `plan.md`.
- `src/dominio/` es TypeScript puro: no importa nada de `src/app/`, `src/bd/` ni librerías de UI.
- Los servicios reciben la BD, el `Reloj` y el `clinicaId` como parámetros; nunca leen la cookie ni `Date.now()` directamente.
- Importes siempre en céntimos enteros; instantes en `timestamptz` (UTC); la zona `Europe/Madrid` solo se aplica al mostrar y al calcular límites de día.
- Ninguna dependencia fuera de las listadas en `plan.md` (principio IV).

---

## Fase 1: Preparación (infraestructura compartida)

**Propósito**: inicializar el proyecto y las herramientas.

- [X] T001 Crear `specs/MAPA.md` (lo exige el principio I) registrando a `001-agenda-core` como propietaria única de las entidades Clínica, Profesional, Servicio, Paciente y Cita y de las reglas de agenda (RN1, RN2), y anotando que las futuras specs de recordatorios y analítica las reutilizarán.
- [X] T002 Inicializar el proyecto Next.js 16 (App Router, React 19, TypeScript 5 con `"strict": true`, Node 22, gestor `pnpm`) en la raíz con la estructura de `plan.md` (`src/app`, `src/components`, `src/dominio`, `src/servicios`, `src/bd`, `src/semilla`, `tests/`). Instalar solo las dependencias de `plan.md` (Drizzle ORM, `postgres`, Zod, `date-fns` v4, `@date-fns/tz`, `jose`, Tailwind v4, `lucide-react`, Vitest, Playwright, `@axe-core/playwright`). Definir en `package.json` los scripts `dev`, `test`, `test:e2e`, `db:migrate` y `db:seed`.
- [X] T003 [P] Crear `docker-compose.yml` con PostgreSQL 17 (puerto 5432) que cree dos bases: `citaclara` (desarrollo) y `citaclara_test` (pruebas).
- [X] T004 [P] Crear `.env.example` con `DATABASE_URL`, `DATABASE_URL_TEST` y `SESION_SECRETO` (cadena aleatoria larga) y asegurar que `.env.local` está en `.gitignore`.
- [X] T005 [P] Configurar Vitest en `vitest.config.ts`: entorno Node, alias `@/` → `src/`, ejecución secuencial de los archivos de `tests/servicios` y `tests/bd` (comparten la BD de pruebas) y carga de `DATABASE_URL_TEST`.
- [X] T006 [P] Configurar Playwright en `playwright.config.ts` con dos proyectos: móvil (viewport 360×740) y escritorio (1280×800), `locale: 'es-ES'`, `timezoneId: 'Europe/Madrid'`, y servidor web `pnpm dev` contra la BD de pruebas.
- [X] T007 [P] Configurar el sistema de diseño: tokens de diseño en `@theme` de Tailwind v4 dentro de `src/app/globals.css` (solo modo claro, sin modo oscuro: no está en la spec; contraste AA, esquinas redondeadas, sombras suaves), tipografía Inter variable con `next/font` y `src/app/layout.tsx` con `<html lang="es-ES">`.
- [X] T008 [P] Inicializar shadcn/ui (`components.json`) y añadir las primitivas `button`, `input`, `label`, `select`, `tabs`, `sheet`, `badge`, `card` y `alert` en `src/components/ui/`, con objetivos táctiles ≥ 44 px.

---

## Fase 2: Fundamentos (prerrequisitos bloqueantes)

**Propósito**: dominio, base de datos, sesión y utilidades de prueba de los que dependen todas las historias.

**⚠️ CRÍTICO**: ninguna historia puede empezar hasta completar esta fase.

- [X] T009 [P] Crear `src/dominio/errores.ts`: tipo `CodigoError` (`CLAVE_INCORRECTA`, `FECHA_INVALIDA`, `EN_EL_PASADO`, `FUERA_DE_HORARIO`, `HUECO_OCUPADO`, `NO_ENCONTRADO`, `NO_AUTORIZADO`, `ESTADO_FINAL`, `CITA_NO_EMPEZADA`), clase `ErrorNegocio` y el tipo `Resultado<T>` de `contracts/actions.md`. Los mensajes MUST ser exactamente los de `contracts/actions.md` y `data-model.md` («Ese hueco ya está ocupado. Hemos actualizado la agenda.», «No se pueden crear citas en el pasado.», etc.), sin jerga técnica (FR-017).
- [X] T010 [P] Crear `src/dominio/fechas.ts` (FR-019, principio II): constante `ZONA = 'Europe/Madrid'`; `limitesDelDia(fechaIso)` que devuelve inicio y fin del día local en UTC calculando en Madrid (nunca sumando 24 h, para que los días de cambio de hora de 23 h y 25 h sean correctos); `formatearFecha` (`dd/MM/yyyy`), `formatearHora` (`HH:mm`, 24 h) con `@date-fns/tz`/`Intl`; `parsearFechaIso` que lanza `FECHA_INVALIDA` si no es `AAAA-MM-DD` válido.
- [X] T011 [P] Crear `src/dominio/dinero.ts` (FR-020, SC-009): `formatearEuros(centimos: number)` con `Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' })` (siempre dos decimales) y `sumarCentimos`; rechazar valores no enteros. Prohibido `float` para importes.
- [X] T012 [P] Crear `src/dominio/horario.ts` (FR-013): horario fijo de lunes a viernes de 09:00 a 20:00 hora de Madrid y función `dentroDeHorario(inicio, fin)`, que exige que la cita completa quede en el mismo día local y dentro del horario (rango `[09:00, 20:00]`, fin incluido).
- [X] T013 [P] Crear `src/dominio/cita.ts`: tipo `Estado` (`reservada` | `completada` | `cancelada` | `no_asistida`), interfaz `Reloj { ahora(): Date }`, `calcularFin(inicio, duracionMin)` (`fin = inicio + duracionMin` minutos reales, FR-005), `ocupaHueco(estado)` (solo `reservada` y `completada`, FR-009) y `pendienteDeCerrar(estado, inicio, ahora)` (`estado === 'reservada' && inicio <= ahora`, FR-016b; condición derivada, nunca modifica el estado).
- [X] T014 Crear `src/bd/esquema.ts` con las tablas Drizzle `clinica`, `profesional`, `servicio`, `paciente` y `cita` y el enum `estado_cita`, con los campos y tipos de `data-model.md` (uuid como PK, `timestamptz`, `importe_centimos` entero, `estado` por defecto `reservada`, `creada_en` por defecto `now()`).
- [X] T015 Crear la migración SQL `src/bd/migraciones/0000_inicial.sql` con: `CREATE EXTENSION IF NOT EXISTS btree_gist`; las cinco tablas; `CHECK (duracion_min > 0)`, `CHECK (importe_centimos >= 0)`, `CHECK (fin > inicio)`; claves foráneas compuestas `(id, clinica_id)` para que profesional, servicio y paciente de una cita pertenezcan a su `clinica_id` (FR-024); la restricción `cita_sin_solape` exactamente como en `data-model.md` (`EXCLUDE USING gist (profesional_id WITH =, tstzrange(inicio, fin, '[)') WITH &&) WHERE (estado IN ('reservada', 'completada'))`); el disparador `BEFORE UPDATE` que rechaza cualquier cambio de `estado` si el valor anterior no es `reservada`; e índice `cita (clinica_id, inicio)`. Depende de T014.
- [X] T016 [P] Crear `src/bd/cliente.ts` (conexión `postgres.js` + Drizzle desde `DATABASE_URL`, inyectable para pruebas) y `src/bd/migrar.ts` (ejecuta los `.sql` de `src/bd/migraciones/` en orden), enlazado al script `db:migrate`.
- [X] T017 [P] Crear `src/servicios/reloj.ts` con `RelojSistema` (hora real) y `RelojFijo` (para pruebas de «inicio en el pasado» y cierres), ambos implementando `Reloj` de T013.
- [X] T018 [P] Crear `src/servicios/sesion.ts`: firmar y verificar con `jose` una cookie `httpOnly`, `sameSite=lax` y `secure` solo cuando `NODE_ENV === 'production'` (en `http://localhost` algunos navegadores de Playwright la descartarían) que contiene el identificador de la clínica (secreto `SESION_SECRETO`); `crearSesion(clinicaId)` y `obtenerClinicaId()` (no hay cierre de sesión: no está en la spec), que lanza `ErrorNegocio('NO_AUTORIZADO')` sin cookie válida (FR-018, FR-024).
- [X] T019 Crear `src/app/envolver-accion.ts`: utilidad que ejecuta un caso de uso con el `clinicaId` de la sesión y convierte `ErrorNegocio` en `{ ok: false, codigo, mensaje }`; cualquier otro error devuelve un mensaje genérico en español sin trazas ni códigos SQL (FR-017). Depende de T009 y T018.
- [X] T020 Crear `tests/ayudas/bd.ts`: abre `DATABASE_URL_TEST`, aplica migraciones, limpia las tablas entre tests y ofrece fábricas `crearClinica`, `crearProfesional`, `crearServicio`, `crearPaciente`, `crearCita` (inserción directa) que devuelven los registros. Es la base de todas las pruebas de servicio. Depende de T015 y T016.
- [X] T021 [P] Crear `tests/dominio/fechas.test.ts`: formatos `dd/MM/yyyy` y `HH:mm` (FR-019); `limitesDelDia` en los días de cambio de hora (último domingo de marzo = 23 h, último domingo de octubre = 25 h) y que una cita de 45' dura 45' reales (caso límite); `FECHA_INVALIDA`.
- [X] T022 [P] Crear `tests/dominio/dinero.test.ts` (FR-020, SC-009): 4000 → «40,00 €», 3500 → «35,00 €», suma de partes igual al total al céntimo, rechazo de no enteros.
- [X] T023 [P] Crear `tests/dominio/horario.test.ts` (FR-013): cita dentro del horario aceptada, que acaba exactamente a las 20:00 aceptada, que acaba a las 20:01 rechazada, antes de las 09:00 rechazada, sábado y domingo rechazados, cita que cruza medianoche rechazada.
- [X] T024 [P] Crear `tests/dominio/cita.test.ts`: `calcularFin` (FR-005, H1.1: 10:00 + 45' = 10:45), `ocupaHueco` por estado (FR-009) y `pendienteDeCerrar` (FR-016b, H3.5; inicio exactamente igual a ahora cuenta como pasado).
- [X] T025 [P] Crear `tests/bd/restricciones.test.ts` contra PostgreSQL real: `cita_sin_solape` rechaza solape parcial, contención y mismo tramo con `23P01` (FR-009); acepta tramos contiguos (FR-010, H1.4); acepta el mismo tramo si la otra cita está `cancelada` o `no_asistida`; acepta el mismo tramo con profesionales distintos (H1.7); el disparador rechaza cambiar el estado de una cita final (FR-007); `CHECK` de duración, de importe y de `fin > inicio`; clave foránea compuesta rechaza paciente de otra clínica (FR-024). Depende de T020.

**Punto de control**: la base está lista; las historias pueden empezar.

---

## Fase 3: Historia 1 — Reservar una cita sin solapes (Prioridad: P1) 🎯 MVP

**Objetivo**: registrar una cita con fin calculado y rechazar cualquier solape, también con reservas simultáneas, y cualquier inicio en el pasado.

**Prueba independiente**: con las fábricas de `tests/ayudas/bd.ts`, reservar en un hueco libre futuro (se acepta) y reservar otra que invada el tramo del mismo profesional (se rechaza con «Ese hueco ya está ocupado»). No requiere la agenda del día.

### Pruebas de la Historia 1 ⚠️

> Escribirlas primero y comprobar que FALLAN antes de implementar.

- [X] T026 [P] [US1] Crear `tests/servicios/reservar-cita.test.ts` con un test por escenario, citando su ID en el nombre: H1.1 (fisio 45' a las 10:00 → fin 10:45, estado `reservada`), H1.2 (solape parcial a las 10:30 → `HUECO_OCUPADO`), H1.3 (solape con cita `completada` → rechazo), H1.4 (contigua a las 10:45 → aceptada), H1.6 (`EN_EL_PASADO` con inicio anterior e igual al instante actual del `RelojFijo`, SC-002), H1.7 (otro profesional a la misma hora → aceptada), caso límite de cita que contiene por completo a otra, hueco liberado por cita cancelada o no asistida (aceptada), `FUERA_DE_HORARIO` (FR-013) y `NO_ENCONTRADO` para profesional, servicio o paciente de otra clínica (FR-024). Depende de T020.
- [X] T027 [P] [US1] Crear `tests/servicios/reservar-cita.concurrencia.test.ts` (principio III, SC-001, H1.5): lanzar con `Promise.all` N = 10 reservas idénticas del mismo hueco y profesional → exactamente 1 aceptada y 9 con `HUECO_OCUPADO`; la tabla contiene una sola cita; repetir el ciclo 20 veces. Otro test: 10 reservas simultáneas del mismo hueco con profesionales distintos → todas aceptadas. Depende de T020.

### Implementación de la Historia 1

- [X] T028 [P] [US1] Crear `src/servicios/catalogo.ts`: funciones `listarProfesionales`, `listarServicios` y `listarPacientes` (solo de la clínica recibida, ordenados por nombre) para poblar el formulario (FR-015). Solo se eligen pacientes ya existentes; no hay alta de pacientes (clarificación 2026-11-16).
- [X] T029 [US1] Crear `src/servicios/reservar-cita.ts`: valida pertenencia a la clínica de profesional, servicio y paciente (`NO_ENCONTRADO`, sin revelar existencia); valida `inicio > reloj.ahora()` (`EN_EL_PASADO`, FR-012); calcula `fin` con `calcularFin`; valida `dentroDeHorario` (`FUERA_DE_HORARIO`); inserta la cita en estado `reservada` y traduce el error `23P01` de PostgreSQL a `ErrorNegocio('HUECO_OCUPADO')`. MUST NOT hacer una comprobación previa de solape: la atomicidad la da `cita_sin_solape` (D4). Depende de T009, T013, T015, T017.
- [X] T030 [P] [US1] Crear `src/servicios/previsualizar-cita.ts`: devuelve `{ inicio, fin }` calculado a partir del servicio sin escribir ni comprobar disponibilidad (FR-015); `NO_ENCONTRADO` si el servicio no es de la clínica.
- [X] T031 [US1] Crear `src/app/(panel)/agenda/nueva/acciones.ts` con las Server Actions `reservarCita` y `previsualizarCita` según `contracts/actions.md`: validar la entrada con Zod (uuid, `inicio` ISO 8601 con zona), envolver con `envolverAccion` (T019) e invocar los servicios con `RelojSistema`. Tras `HUECO_OCUPADO` MUST hacer `revalidatePath('/agenda')` y la interfaz navega a `/agenda?fecha=AAAA-MM-DD&aviso=hueco-ocupado` (día de la cita intentada), según `contracts/actions.md` (FR-011). Depende de T019, T029, T030.
- [X] T032 [P] [US1] Crear `src/components/agenda/formulario-cita.tsx` (componente cliente): selects de profesional, servicio y paciente, campo de fecha y hora de inicio, fin calculado visible antes de confirmar (llama a `previsualizarCita`), botón Reservar con estado de carga, y errores de `Resultado` mostrados con `Alert` en español, sin jerga. Ante `HUECO_OCUPADO` navega a `/agenda?fecha=…&aviso=hueco-ocupado` sin proponer huecos alternativos. Estados distinguibles sin depender del color.
- [X] T033 [US1] Crear `src/app/(panel)/agenda/nueva/page.tsx` (Server Component): lee `profesional` e `inicio` de la query para precargar el formulario, carga el catálogo (T028) con el `clinicaId` de la sesión y renderiza `formulario-cita.tsx`; al reservar con éxito redirige a `/agenda?fecha=…` del día de la cita. Depende de T028, T031, T032.

**Punto de control**: la Historia 1 es funcional y verificable por sí sola (a nivel de servicio y formulario).

---

## Fase 4: Historia 2 — Consultar la agenda del día por profesional (Prioridad: P2)

**Objetivo**: ver, por profesional, una línea de tiempo con tramos ocupados (paciente, servicio, estado) y libres.

**Prueba independiente**: con citas creadas por las fábricas, abrir un día y comprobar el orden y las horas exactas de cada profesional y que los espacios entre citas aparecen libres.

### Pruebas de la Historia 2 ⚠️

- [X] T034 [P] [US2] Crear `tests/dominio/huecos.test.ts`: `huecosLibres` con día vacío (todo el horario libre, H2.4), citas contiguas (sin hueco entre ellas), hueco entre dos citas, cita que ocupa desde las 09:00 o hasta las 20:00, y día de cambio de hora (los tramos se calculan en hora de Madrid).
- [X] T035 [P] [US2] Crear `tests/servicios/consultar-agenda.test.ts`: H2.1 (profesionales por separado, citas ordenadas por hora y huecos entre ellas), H2.2 (canceladas y no asistidas aparecen como tramo libre), H2.3 (completadas y reservadas ocupan y llevan su estado), H2.4 (día sin citas = todo libre), `pendienteDeCerrar: true` solo para reservadas con inicio pasado (H3.5, FR-016b), `FECHA_INVALIDA`, y aislamiento: no aparecen datos de otra clínica (FR-024). Depende de T020.

### Implementación de la Historia 2

- [X] T036 [US2] Añadir `huecosLibres(citasOcupantes, fechaIso)` a `src/dominio/horario.ts`: dado el conjunto de tramos ocupados de un profesional en un día local, devuelve los tramos libres dentro del horario 09:00–20:00 de Madrid (cero tramos libres de longitud nula). Depende de T012.
- [X] T037 [US2] Crear `src/servicios/consultar-agenda.ts`: para una fecha ISO y un `clinicaId`, devuelve por cada profesional la lista ordenada de `Tramo` (`libre` | `cita`) de `contracts/actions.md`, con instantes ISO 8601 UTC, `importeCentimos` del servicio y `pendienteDeCerrar` calculado con el `Reloj`; las canceladas y no asistidas cuentan como libres; usa el índice `cita (clinica_id, inicio)`. Depende de T010, T013, T036.
- [X] T038 [P] [US2] Crear `src/components/agenda/estado-cita.tsx`: insignia por estado con icono (lucide-react) y texto en español («Reservada», «Completada», «Cancelada», «No asistió», «Pendiente de cerrar»), distinguibles también sin color y con contraste AA.
- [X] T039 [P] [US2] Crear `src/components/agenda/tarjeta-cita.tsx`: tramo ocupado con hora de inicio y fin (`HH:mm`), paciente, servicio y `estado-cita`; resalte visual para `pendienteDeCerrar`. Depende de T038 para el uso de la insignia.
- [X] T040 [P] [US2] Crear `src/components/agenda/selector-dia.tsx`: navegación día anterior / siguiente / hoy y fecha en `dd/MM/yyyy`, que actualiza `?fecha=AAAA-MM-DD`.
- [X] T041 [US2] Crear `src/components/agenda/linea-tiempo.tsx`: columna por profesional con escala vertical 09:00–20:00 en CSS Grid (D3); en pantallas ≥ 768 px, columnas en paralelo; en móvil, una columna con pestañas de `Tabs` para elegir profesional, sin desplazamiento horizontal desde 360 px. Cada tramo libre enlaza a `/agenda/nueva?profesional=…&inicio=…`. Depende de T039.
- [X] T042 [US2] Crear `src/app/(panel)/layout.tsx` con la cabecera del panel (nombre de Clínica Eleva y navegación) y contenedor con ancho adaptable.
- [X] T043 [US2] Crear `src/app/(panel)/agenda/page.tsx` (Server Component): lee `fecha` (por defecto hoy en Madrid), obtiene la agenda con `consultar-agenda.ts` y el `clinicaId` de la sesión, y renderiza `selector-dia` y `linea-tiempo`; ante `NO_AUTORIZADO` redirige a `/acceso`, ante `FECHA_INVALIDA` muestra el mensaje en español, y si `aviso=hueco-ocupado` muestra un `Alert` con «Ese hueco ya está ocupado. Hemos actualizado la agenda.» (FR-011). Depende de T037, T040, T041, T042.
- [X] T044 [P] [US2] Crear `src/app/(panel)/agenda/loading.tsx` y `src/app/(panel)/agenda/error.tsx` con estados de carga y de error visibles y en español (FR-021).

**Punto de control**: las Historias 1 y 2 funcionan; se pueden validar en la interfaz una vez completadas la sesión (US4) y la semilla (US5), o con datos de las fábricas.

---

## Fase 5: Historia 3 — Cerrar el ciclo de una cita (Prioridad: P2)

**Objetivo**: marcar una cita reservada como completada, cancelada o no asistida respetando las transiciones y sus condiciones.

**Prueba independiente**: tomar una cita reservada y aplicarle cada acción; comprobar el estado resultante y el efecto sobre el hueco.

### Pruebas de la Historia 3 ⚠️

- [X] T045 [P] [US3] Crear `tests/dominio/transiciones.test.ts` para `transicionar`: reservada → completada y reservada → no_asistida solo con `inicio <= ahora` (H3.6, FR-016); reservada → cancelada en cualquier momento (H3.2); cualquier acción sobre completada, cancelada o no asistida → `ESTADO_FINAL` (H3.4, FR-007).
- [X] T046 [P] [US3] Crear `tests/servicios/cerrar-cita.test.ts`: H3.1 (completar sigue ocupando: reservar encima sigue rechazado), H3.2 y H3.3 (cancelar y no asistida liberan el hueco: una reserva posterior en ese tramo se acepta), H3.4 (estado final no modificable), H3.5 (cita pasada sin cerrar permanece `reservada` y sigue ocupando; nada la cambia sola), H3.6 (`CITA_NO_EMPEZADA` al completar o marcar no asistida una cita futura), `NO_ENCONTRADO` para cita de otra clínica (FR-024) y dos cierres simultáneos de la misma cita con `Promise.all` → exactamente uno se aplica y el otro recibe `ESTADO_FINAL`. Depende de T020.

### Implementación de la Historia 3

- [X] T047 [US3] Añadir `transicionar(estado, accion, inicio, ahora)` a `src/dominio/cita.ts` con la tabla de `data-model.md` (`completar` y `no_asistio` exigen `inicio <= ahora`; `cancelar` siempre desde `reservada`; estados finales → `ESTADO_FINAL`). Depende de T009, T013.
- [X] T048 [US3] Crear `src/servicios/cerrar-cita.ts`: localiza la cita filtrando por `clinicaId` (`NO_ENCONTRADO`), valida con `transicionar` y actualiza con `UPDATE … WHERE id = … AND estado = 'reservada'`; si no se actualiza ninguna fila, devuelve `ESTADO_FINAL` (cierres simultáneos). Devuelve `{ citaId, estado }`. Depende de T017, T047.
- [X] T049 [US3] Crear `src/app/(panel)/agenda/cerrar-cita-accion.ts` con la Server Action `cerrarCita({ citaId, accion })` (Zod: uuid y `accion` ∈ `completar` | `cancelar` | `no_asistio`), envuelta con `envolverAccion` y con `revalidatePath('/agenda')`. Depende de T019, T048.
- [X] T050 [P] [US3] Crear `src/components/agenda/detalle-cita.tsx` (componente cliente, `Sheet`): datos de la cita (paciente, servicio, hora de inicio y fin, estado, importe en euros con `formatearEuros`) y botones Completar, No asistió y Cancelar mostrando solo los permitidos según el estado y si la cita ya ha empezado; confirmación antes de cancelar; errores de `Resultado` en español.
- [X] T051 [US3] Integrar el detalle en la agenda: `tarjeta-cita.tsx` abre `detalle-cita.tsx` al pulsarla (accesible por teclado) y `linea-tiempo.tsx` pasa a cada tarjeta el importe (`importeCentimos`) y el estado. Depende de T039, T041, T049, T050.

**Punto de control**: las Historias 1, 2 y 3 funcionan; el ciclo completo de una cita es operable.

---

## Fase 6: Historia 4 — Acceso de recepción con clave de clínica (Prioridad: P3)

**Objetivo**: entrar con la clave de la clínica y ver solo los datos de esa clínica. Deuda consciente de la v1 (FR-018), sustituible sin tocar las reglas de negocio.

**Prueba independiente**: sin clave o con clave incorrecta se deniega; con la clave correcta se accede.

### Pruebas de la Historia 4 ⚠️

- [X] T052 [P] [US4] Crear `tests/servicios/acceso.test.ts`: H4.2 (clave incorrecta → `CLAVE_INCORRECTA` con el mismo mensaje exista o no la clínica), H4.3 (clave correcta de Clínica Eleva → devuelve su `clinicaId`), la clave nunca se guarda en claro (`clave_hash` con `scrypt` y sal distintos para la misma clave), y `crearSesion`/`obtenerClinicaId` con cookie manipulada o ausente → `NO_AUTORIZADO` (H4.1). Depende de T020.
- [X] T053 [P] [US4] Crear `tests/servicios/aislamiento-clinica.test.ts` (FR-024): con dos clínicas, con el `clinicaId` de una no se puede consultar la agenda de la otra (`consultar-agenda`), ni reservar con sus profesionales, servicios o pacientes (`reservar-cita` → `NO_ENCONTRADO`), ni cerrar sus citas (`cerrar-cita` → `NO_ENCONTRADO`), ni listar su catálogo. Depende de T020.

### Implementación de la Historia 4

- [X] T054 [US4] Crear `src/servicios/acceso.ts`: puerto `AccesoClinica` con `verificarClave(clave): Promise<string | null>` y su implementación por defecto que compara con `clave_hash` usando `scrypt` de `node:crypto` y `timingSafeEqual` (sin dependencias extra, D7); añadir `hashearClave(clave)` (sal aleatoria) para la semilla. Las reglas de negocio MUST depender solo del puerto (FR-018). Depende de T014.
- [X] T055 [US4] Crear `src/app/(publico)/acceso/acciones.ts` con las Server Actions `acceder({ clave })` (Zod: texto no vacío; `crearSesion` y redirección a `/agenda`; `CLAVE_INCORRECTA` con «La clave no es correcta.»). Depende de T018, T054.
- [X] T056 [US4] Crear `src/app/(publico)/acceso/page.tsx` y `src/components/agenda/formulario-acceso.tsx`: campo de clave con etiqueta, botón Entrar con estado de carga, error claro en español sin revelar datos, usable a 360 px y con contraste AA.
- [X] T057 [US4] Crear `src/proxy.ts` (en Next.js 16 sustituye a `middleware.ts`) que redirige a `/acceso` cualquier petición a `/agenda/**` sin cookie de sesión válida, sin mostrar ningún dato (H4.1). Depende de T018.

**Punto de control**: acceso protegido; ningún dato visible sin clave válida.

---

## Fase 7: Historia 5 — Datos de demostración reproducibles (Prioridad: P3)

**Objetivo**: `pnpm db:seed` carga Clínica Eleva de forma determinista (misma semilla y ancla, mismos datos) y sin solapes.

**Prueba independiente**: cargar la semilla dos veces y comprobar que todos los recuentos coinciden.

### Pruebas de la Historia 5 ⚠️

- [X] T058 [P] [US5] Crear `tests/dominio/paciente.test.ts`: el esquema Zod de paciente rechaza teléfono vacío o con formato no telefónico español y email vacío o mal formado (FR-004, caso límite) y acepta datos válidos.
- [X] T059 [P] [US5] Crear `tests/semilla/semilla.test.ts` con ancla fija `2026-11-16` y un `RelojFijo` (parámetro `ahora`) contra la BD de pruebas, repitiendo H5.4 con `ahora` a mitad de la semana del ancla para comprobar que ninguna cita `reservada` queda en el pasado (FR-022): H5.1 (Clínica Eleva con María y Jorge en Fisioterapia y Lucía en Nutrición), H5.2 (los 4 servicios con 45'/4000, 60'/5000, 30'/3500 y 45'/4500), ~40 pacientes, SC-007 (no asistidas 10 % ± 2, canceladas 8 % ± 2 y el resto completadas sobre las 8 semanas de historia; ninguna historia en `reservada`), H5.4 (2 semanas futuras, todas `reservadas`, todas con inicio posterior al ancla), FR-023 (cero solapes entre reservadas y completadas del mismo profesional) y SC-006 / H5.5 (dos cargas en BD limpias producen exactamente los mismos recuentos totales y por estado, los mismos importes y las mismas filas, con ids iguales y `creada_en` iguales; se excluye solo `clave_hash`). Depende de T020.

### Implementación de la Historia 5

- [X] T060 [P] [US5] Crear `src/dominio/paciente.ts` con el esquema Zod `esquemaPaciente` (nombre no vacío; teléfono no vacío con formato telefónico español; email no vacío con formato de correo), usado por la carga de la semilla.
- [X] T061 [P] [US5] Crear `src/semilla/datos.ts` con los datos fijos de Clínica Eleva: profesionales (María y Jorge, «Fisioterapia»; Lucía, «Nutrición»), los 4 servicios de FR-022 con importes en céntimos, una lista fija de ~40 nombres de paciente con teléfonos y emails válidos, y la clave de panel de la demo.
- [X] T062 [US5] Crear `src/semilla/generar.ts`: PRNG `mulberry32` con semilla fija en constante y `ancla` y `ahora` como parámetros (por defecto, el lunes de la semana actual en Madrid y el reloj del sistema). El futuro empieza en el primer instante posterior a `max(ancla, ahora)` para que ninguna cita `reservada` quede en el pasado (FR-022). Los `uuid` se derivan del PRNG y `creada_en` se fija desde el ancla, de modo que dos cargas sean idénticas fila a fila. Genera la historia de las 8 semanas anteriores al ancla y las 2 semanas desde el ancla, colocando primero las citas sin solape dentro del horario 09:00–20:00 L–V y después asignando estados por cuotas exactas (10 % no asistidas, 8 % canceladas, resto completadas; futuras todas reservadas), no por probabilidad por cita (D9). Debe ser una función pura y determinista que devuelve los registros en memoria. Depende de T013, T061.
- [X] T063 [US5] Crear `src/semilla/cargar.ts`: dentro de una transacción borra e inserta Clínica Eleva con `hashearClave` (T054) para la clave de panel, valida cada paciente con `esquemaPaciente` (T060) y guarda los registros de `generar.ts`; devuelve un resumen con la clave de la demo. Depende de T054, T060, T062.
- [X] T064 [US5] Crear `src/semilla/cli.ts` y enlazar `pnpm db:seed [--ancla AAAA-MM-DD]` en `package.json`: carga la semilla e imprime el resumen (recuentos por estado) y la clave de panel de la demo, como indica `contracts/actions.md`. Depende de T063.

**Punto de control**: las cinco historias funcionan y la demo es reproducible.

---

## Fase 8: Pulido y aspectos transversales

**Propósito**: pruebas de extremo a extremo, accesibilidad y verificación de la guía de validación.

- [X] T065 [P] Crear `tests/e2e/acceso-agenda.spec.ts` (Playwright, semilla con ancla fija): V1 (sin sesión redirige a `/acceso`, clave errónea muestra error sin datos, clave de la demo entra), V2 (3 profesionales por separado con citas ordenadas y huecos), V8 (cita reservada con inicio pasado destacada como pendiente de cerrar) y V10 (fechas `dd/MM/yyyy`, horas `HH:mm`, importes con dos decimales). Depende de T043, T057, T064.
- [X] T066 [P] Crear `tests/e2e/reserva.spec.ts`: V3 (reserva válida con fin calculado visible), V4 (solape → mensaje «Ese hueco ya está ocupado» y agenda actualizada), V5 (contigua aceptada), V6 (pasado rechazado) y SC-003 (alta completa en menos de 1 minuto desde la agenda del día). Depende de T033, T043, T064.
- [X] T067 [P] Crear `tests/e2e/cierre.spec.ts`: V7 (cancelar, completar y no asistió desde el detalle; botones solo los permitidos; estados finales sin acciones; el hueco cancelado vuelve a ser reservable). Depende de T051, T064.
- [X] T068 [P] Crear `tests/e2e/accesibilidad.spec.ts`: V9 y SC-008 en los proyectos de 360 px y de escritorio — `/acceso`, `/agenda` y `/agenda/nueva` sin desplazamiento horizontal (`scrollWidth <= clientWidth`) y sin violaciones graves o críticas de `@axe-core/playwright`; objetivos táctiles ≥ 44 px (FR-021). Depende de T043, T056, T033.
- [X] T069 [P] Crear `tests/servicios/rendimiento-agenda.test.ts` (SC-005): con la semilla cargada, `consultarAgenda` de un día completo de los tres profesionales responde en menos de 2 s; el test cita `SC-005`. Depende de T037, T064.
- [X] T070 Revisar los textos del producto: ningún mensaje visible contiene códigos de error, nombres de tablas, trazas ni jerga (`23P01`, `UUID`, `constraint`…); todo está en español de España con tuteo coherente (principios VII y VIII). Comprobar con `rg` sobre `src/app`, `src/components` y `src/dominio/errores.ts`.
- [X] T071 Comprobar la trazabilidad spec ↔ test (principio VI): cada FR, SC y escenario de aceptación de `spec.md` está citado por al menos un test; añadir los tests que falten y registrar la matriz FR/SC → archivo de test en `specs/001-agenda-core/quickstart.md`.
- [X] T072 Ejecutar `quickstart.md` de extremo a extremo (`docker compose up -d`, `pnpm db:migrate`, `pnpm db:seed --ancla 2026-11-16`, `pnpm test`, `pnpm test:e2e`) y validar a mano V1–V10 (incluido SC-004: localizar un hueco libre en menos de 10 s); corregir en `quickstart.md` cualquier comando o resultado esperado que no coincida con lo implementado.
- [X] T073 Añadir la tubería de integración continua de GitLab en `.gitlab-ci.yml`: servicio PostgreSQL 17, `pnpm install`, `pnpm db:migrate`, `pnpm test` y `pnpm test:e2e`; la suite en verde es condición de merge (constitución, principio VI y «Flujo de trabajo»).

---

## Dependencias y orden de ejecución

### Dependencias entre fases

- **Preparación (Fase 1)**: sin dependencias; puede empezar de inmediato.
- **Fundamentos (Fase 2)**: depende de la Fase 1 y BLOQUEA todas las historias.
- **Historias (Fases 3–7)**: dependen de la Fase 2. Después pueden avanzar en paralelo (si hay equipo) o en orden de prioridad P1 → P2 → P3.
- **Pulido (Fase 8)**: depende de las historias que se quieran validar (los E2E necesitan US4 y US5 para entrar y cargar datos).

### Dependencias entre historias

- **US1 (P1)**: tras Fundamentos; sin dependencias de otras historias. Se prueba con las fábricas de `tests/ayudas/bd.ts`.
- **US2 (P2)**: tras Fundamentos; independiente de US1 a nivel de servicio (usa fábricas). Los enlaces de huecos libres a `/agenda/nueva` (T041) apuntan a la pantalla de US1.
- **US3 (P2)**: tras Fundamentos; el servicio es independiente. La integración en la interfaz (T051) requiere los componentes de US2 (T039, T041).
- **US4 (P3)**: tras Fundamentos; `acceso.ts` (T054) lo reutiliza US5 (T063).
- **US5 (P3)**: tras Fundamentos y T054 (hash de clave) de US4.

### Dentro de cada historia

- Las pruebas se escriben primero y MUST fallar antes de implementar.
- Dominio → servicios → Server Actions → componentes → páginas.
- Terminar la historia y pasar su punto de control antes de la siguiente prioridad.

### Oportunidades de paralelismo

- Fase 1: T003–T008 en paralelo tras T002.
- Fase 2: T009–T013 en paralelo; T016–T018 en paralelo; todas las pruebas T021–T025 en paralelo una vez disponibles sus dependencias.
- Dentro de cada historia: todas las pruebas marcadas [P] a la vez; componentes de interfaz marcados [P] a la vez.
- Fases 3–7: una vez cerrada la Fase 2, un desarrollador por historia (con la excepción de T063, que espera a T054).
- Fase 8: T065–T069 en paralelo.

---

## Ejemplo de ejecución en paralelo: Historia 1

```bash
# Pruebas de la Historia 1 (escribirlas primero):
Tarea: "Pruebas de reserva en tests/servicios/reservar-cita.test.ts"            # T026
Tarea: "Pruebas de concurrencia en tests/servicios/reservar-cita.concurrencia.test.ts"  # T027

# Piezas independientes de la Historia 1:
Tarea: "Catálogo en src/servicios/catalogo.ts"                                   # T028
Tarea: "Previsualización en src/servicios/previsualizar-cita.ts"                 # T030
Tarea: "Formulario en src/components/agenda/formulario-cita.tsx"                 # T032
```

---

## Estrategia de implementación

### Primero el MVP (solo la Historia 1)

1. Completar la Fase 1: Preparación.
2. Completar la Fase 2: Fundamentos (CRÍTICA: bloquea todo).
3. Completar la Fase 3: Historia 1.
4. **PARAR y VALIDAR**: `pnpm test` en verde, con las pruebas de solape y de concurrencia (principio III) pasando.
5. Demostrar si procede.

### Entrega incremental

1. Preparación + Fundamentos → base lista.
2. Historia 1 → probar → MVP (la regla capital de la agenda queda garantizada).
3. Historia 2 → probar → agenda visible.
4. Historia 3 → probar → ciclo de la cita completo.
5. Historia 4 y 5 → acceso y datos de demostración; después Fase 8 (E2E y accesibilidad).
6. Cada historia aporta valor sin romper las anteriores.

### Estrategia con varios agentes o desarrolladores

1. El equipo completa Preparación y Fundamentos junto.
2. Después: A → US1, B → US2 y US3, C → US4 y US5.
3. Las historias se integran sin editar los mismos archivos salvo los indicados en las dependencias (`src/dominio/cita.ts`, `src/dominio/horario.ts`, `src/app/(panel)/layout.tsx`, `tarjeta-cita.tsx`, `linea-tiempo.tsx`).

---

## Notas

- [P] = archivos distintos, sin dependencias pendientes.
- [Historia] enlaza cada tarea con su historia de `spec.md` para la trazabilidad.
- Cada historia debe poder completarse y probarse por separado.
- Verificar que las pruebas fallan antes de implementar.
- Confirmar tras cada tarea o grupo lógico (Conventional Commits, en español).
- Evitar: tareas vagas, conflictos en un mismo archivo, dependencias entre historias que rompan su independencia.
