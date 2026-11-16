# Guía de validación rápida: Núcleo de agenda

Guía para comprobar de extremo a extremo que la feature funciona. Contratos en [contracts/actions.md](contracts/actions.md); modelo en [data-model.md](data-model.md).

## Requisitos previos

- Node.js 22 LTS, pnpm y Docker.
- Variables en `.env.local` (plantilla en `.env.example`): `DATABASE_URL`, `DATABASE_URL_TEST` y `SESION_SECRETO` (cadena aleatoria de al menos 32 caracteres).
- Clave del panel de la demo: la imprime `pnpm db:seed` (por defecto `eleva-demo-2026`).

## Preparación

```bash
cp .env.example .env.local     # y revisa DATABASE_URL, DATABASE_URL_TEST y SESION_SECRETO
docker compose up -d          # PostgreSQL 17 (crea citaclara y citaclara_test)
pnpm install
pnpm db:migrate               # crea tablas y la restricción cita_sin_solape
pnpm db:seed --ancla 2026-11-16   # semilla fija para resultados reproducibles
pnpm dev                      # http://localhost:3000
```

## Escenarios de validación

| # | Escenario | Pasos | Resultado esperado | Spec |
|---|---|---|---|---|
| V1 | Acceso | Abrir `/agenda` sin sesión; probar clave errónea; probar la clave de la demo | Redirige a `/acceso`; error claro sin datos; entra a Clínica Eleva | H4, FR-018 |
| V2 | Agenda del día | Abrir un día de historia | 3 profesionales por separado, citas ordenadas, huecos libres, estados distinguibles | H2, FR-014 |
| V3 | Reserva válida | Reservar sesión fisio a María en un hueco libre futuro | Cita reservada, fin = inicio + 45' | H1.1 |
| V4 | Solape | Reservar a María a las 10:30 con cita 10:00–10:45 | Rechazo «hueco ocupado» y agenda actualizada | H1.2, FR-009 |
| V5 | Contigua | Reservar a las 10:45 tras una cita que acaba a las 10:45 | Aceptada | H1.4, FR-010 |
| V6 | Pasado | Reservar con inicio anterior o igual a ahora | Rechazo «no se pueden crear citas en el pasado» | H1.6, FR-012 |
| V7 | Cierre | Cancelar, completar y marcar no asistida citas reservadas | Estados y huecos según `data-model.md`; los finales no se modifican | H3 |
| V8 | Pendiente de cerrar | Dejar una cita reservada con inicio pasado | Sigue reservada y aparece destacada | H3.5, FR-016b |
| V9 | Responsive y accesibilidad | Ver agenda a 360 px y en escritorio | Sin desplazamiento horizontal; sin violaciones axe graves | SC-008, FR-021 |
| V10 | Formatos | Revisar fechas, horas e importes | `dd/MM/yyyy`, `HH:mm`, euros con dos decimales | FR-019, FR-020 |

## Pruebas automáticas

```bash
pnpm test           # dominio y servicios (incluye concurrencia y semilla) contra PostgreSQL real
pnpm test:e2e       # Playwright + axe (360 px y escritorio); carga la semilla de la semana en curso en la BD de pruebas
# Primera vez: npx playwright install chromium
```

Pruebas clave que deben pasar (cada nombre de test cita su ID):

- **SC-001 / H1.5**: N reservas simultáneas del mismo hueco → exactamente 1 aceptada; el resto `HUECO_OCUPADO`.
- **SC-001 / H1.7**: reservas simultáneas del mismo hueco con profesionales distintos → todas aceptadas.
- **SC-002 / FR-012**: reserva con inicio en el pasado → siempre rechazada.
- **SC-006 / H5.5**: cargar la semilla dos veces → mismos recuentos totales y por estado, mismos importes.
- **SC-007**: no asistidas 10 % ± 2, canceladas 8 % ± 2, resto completadas; futuras todas reservadas.
- **Caso límite**: días de cambio de hora (último domingo de marzo y de octubre): cita de 45' dura 45' reales.
- **FR-024**: con la clave de otra clínica no se ve ni se modifica ningún dato.

## Criterio de aceptación de la feature

Todas las pruebas automáticas en verde y V1–V10 comprobados manualmente con la semilla fija.

## Matriz de trazabilidad spec ↔ test (principio VI)

Generada comprobando que cada FR, SC y escenario de aceptación de `spec.md` aparece citado en el nombre de al menos un test. Total: 34 IDs, ninguno sin cubrir.

| ID de la spec | Tests que lo citan |
|---|---|
| FR-001 | `tests/semilla/semilla.test.ts`, `tests/servicios/acceso.test.ts` |
| FR-002 | `tests/servicios/consultar-agenda.test.ts` |
| FR-003 | `tests/bd/restricciones.test.ts` |
| FR-004 | `tests/dominio/paciente.test.ts` |
| FR-005 | `tests/bd/restricciones.test.ts`, `tests/dominio/cita.test.ts`, `tests/dominio/fechas.test.ts` |
| FR-006 | `tests/servicios/reservar-cita.test.ts` |
| FR-007 | `tests/bd/restricciones.test.ts`, `tests/dominio/transiciones.test.ts`, `tests/servicios/cerrar-cita.test.ts` |
| FR-008 | `tests/servicios/cerrar-cita.test.ts` |
| FR-009 | `tests/bd/restricciones.test.ts`, `tests/dominio/cita.test.ts`, `tests/servicios/reservar-cita.test.ts` |
| FR-010 | `tests/bd/restricciones.test.ts`, `tests/servicios/reservar-cita.test.ts` |
| FR-011 | `tests/servicios/reservar-cita.concurrencia.test.ts` |
| FR-012 | `tests/servicios/reservar-cita.test.ts` |
| FR-013 | `tests/dominio/horario.test.ts`, `tests/dominio/huecos.test.ts`, `tests/e2e/reserva.spec.ts`, `tests/servicios/reservar-cita.test.ts` |
| FR-014 | `tests/dominio/fechas.test.ts`, `tests/dominio/huecos.test.ts`, `tests/servicios/consultar-agenda.test.ts` |
| FR-015 | `tests/servicios/aislamiento-clinica.test.ts` |
| FR-016 | `tests/dominio/transiciones.test.ts`, `tests/servicios/cerrar-cita.test.ts` |
| FR-016b | `tests/dominio/cita.test.ts`, `tests/servicios/cerrar-cita.test.ts`, `tests/servicios/consultar-agenda.test.ts` |
| FR-017 | `tests/dominio/errores.test.ts` |
| FR-018 | `tests/servicios/acceso.test.ts` |
| FR-019 | `tests/dominio/fechas.test.ts`, `tests/dominio/huecos.test.ts`, `tests/e2e/acceso-agenda.spec.ts`, `tests/servicios/consultar-agenda.test.ts` |
| FR-020 | `tests/dominio/dinero.test.ts`, `tests/e2e/acceso-agenda.spec.ts` |
| FR-021 | `tests/e2e/accesibilidad.spec.ts` |
| FR-022 | `tests/semilla/semilla.test.ts` |
| FR-023 | `tests/semilla/semilla.test.ts` |
| FR-024 | `tests/bd/restricciones.test.ts`, `tests/servicios/aislamiento-clinica.test.ts`, `tests/servicios/cerrar-cita.test.ts`, `tests/servicios/consultar-agenda.test.ts`, `tests/servicios/reservar-cita.test.ts` |
| SC-001 | `tests/servicios/reservar-cita.concurrencia.test.ts` |
| SC-002 | `tests/servicios/reservar-cita.test.ts` |
| SC-003 | `tests/e2e/reserva.spec.ts` |
| SC-004 | `tests/e2e/acceso-agenda.spec.ts` |
| SC-005 | `tests/servicios/rendimiento-agenda.test.ts` |
| SC-006 | `tests/semilla/semilla.test.ts` |
| SC-007 | `tests/semilla/semilla.test.ts` |
| SC-008 | `tests/e2e/accesibilidad.spec.ts` |
| SC-009 | `tests/dominio/dinero.test.ts` |

