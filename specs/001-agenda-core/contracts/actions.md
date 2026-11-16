# Contratos de interfaz: Núcleo de agenda

El producto no expone API REST (decisión D1). Sus interfaces son las **Server Actions** que usa la interfaz y las **pantallas**. Todas exigen la sesión de clínica (cookie firmada) salvo `acceder`; sin sesión válida devuelven `NO_AUTORIZADO` y no se muestra ningún dato (FR-018, FR-024).

Formato común de respuesta:

```ts
type Resultado<T> =
  | { ok: true; datos: T }
  | { ok: false; codigo: CodigoError; mensaje: string }  // mensaje en español, sin jerga (FR-017)
```

## Acciones

### `acceder({ clave })`

- **Entrada**: `clave` (texto no vacío).
- **Éxito**: emite la cookie de sesión de la clínica; redirige a `/agenda`.
- **Errores**: `CLAVE_INCORRECTA` — «La clave no es correcta.» (no revela si existe la clínica).
- **Cubre**: FR-001, FR-018; Historia 4.

### `consultarAgenda({ fecha })`

- **Entrada**: `fecha` en formato ISO `AAAA-MM-DD` (día local de Madrid).
- **Éxito**: por cada profesional de la clínica, lista ordenada de `tramos`:
  ```ts
  type Tramo =
    | { tipo: 'libre'; inicio: string; fin: string }
    | { tipo: 'cita'; citaId: string; inicio: string; fin: string; paciente: string;
        servicio: string; importeCentimos: number; estado: Estado; pendienteDeCerrar: boolean }
  ```
  Los instantes viajan en ISO 8601 UTC; la interfaz los formatea en `Europe/Madrid`, `dd/MM/yyyy` y `HH:mm`. Las citas canceladas y no asistidas no aparecen como ocupadas: su tramo cuenta como libre.
- **Errores**: `FECHA_INVALIDA`, `NO_AUTORIZADO`.
- **Cubre**: FR-014, FR-016b, FR-019; Historia 2.

### `reservarCita({ profesionalId, servicioId, pacienteId, inicio })`

- **Entrada**: tres identificadores (uuid) e `inicio` (ISO 8601 con zona).
- **Éxito**: `{ citaId, inicio, fin, estado: 'reservada' }`, con `fin = inicio + duración del servicio`.
- **Errores**:
  | Código | Mensaje | Origen |
  |---|---|---|
  | `EN_EL_PASADO` | No se pueden crear citas en el pasado. | FR-012 |
  | `FUERA_DE_HORARIO` | La cita queda fuera del horario de atención (lunes a viernes, de 09:00 a 20:00). | FR-013 |
  | `HUECO_OCUPADO` | Ese hueco ya está ocupado. Hemos actualizado la agenda. | FR-009, FR-011 |
  | `NO_ENCONTRADO` | No se ha encontrado el dato solicitado. | FR-024 |
  | `NO_AUTORIZADO` | Debes introducir la clave de la clínica. | FR-018 |
- **Tras `HUECO_OCUPADO`**: la interfaz navega a `/agenda?fecha=AAAA-MM-DD` (día de la cita intentada) con `aviso=hueco-ocupado`; la agenda, ya actualizada, muestra el mensaje y no propone huecos alternativos (FR-011).
- **Garantía**: la atomicidad frente a reservas simultáneas la da la restricción `cita_sin_solape` de la BD (ver `data-model.md`); `HUECO_OCUPADO` se produce al capturar el error `23P01`, no por una comprobación previa. El éxito o el rechazo nunca dejan una cita parcial.
- **Cubre**: FR-005, FR-009 a FR-013, FR-015; Historia 1.

### `previsualizarCita({ servicioId, inicio })`

- **Éxito**: `{ inicio, fin }` calculado sin escribir nada, para mostrar el fin antes de confirmar (FR-015). No comprueba disponibilidad; la reserva real sí.
- **Errores**: `NO_ENCONTRADO`, `NO_AUTORIZADO`.

### `cerrarCita({ citaId, accion })`

- **Entrada**: `accion` ∈ `completar` | `cancelar` | `no_asistio`.
- **Éxito**: `{ citaId, estado }` con el nuevo estado.
- **Errores**:
  | Código | Mensaje | Origen |
  |---|---|---|
  | `ESTADO_FINAL` | Esta cita ya está cerrada y no se puede modificar. | FR-007 |
  | `CITA_NO_EMPEZADA` | Solo se puede marcar como completada o no asistida una cita que ya ha empezado; antes solo se puede cancelar. | FR-016 |
  | `NO_ENCONTRADO` | No se ha encontrado el dato solicitado. | FR-024 |
  | `NO_AUTORIZADO` | Debes introducir la clave de la clínica. | FR-018 |
- **Garantía**: la actualización es condicional (`UPDATE … WHERE estado = 'reservada'`), de modo que dos cierres simultáneos de la misma cita no pueden aplicarse ambos.
- **Cubre**: FR-006, FR-007, FR-008, FR-016; Historia 3.

## Pantallas

| Ruta | Acceso | Contenido | Historia |
|---|---|---|---|
| `/acceso` | público | Campo de clave de clínica y mensaje de error | H4 |
| `/agenda?fecha=AAAA-MM-DD[&aviso=hueco-ocupado]` | sesión | Selector de día; línea de tiempo por profesional (pestañas en móvil); tramos libres/ocupados; resalte «pendiente de cerrar» | H2, H3 |
| `/agenda/nueva?profesional=…&inicio=…` | sesión | Formulario: profesional, servicio, paciente (selector de existentes), inicio; muestra el fin calculado | H1 |
| Panel lateral/hoja de detalle de una cita | sesión | Datos de la cita y botones Completar, No asistió, Cancelar (solo los permitidos) | H3 |

Requisitos transversales de UI: textos en español de España, `lang="es-ES"`; contraste AA como mínimo; objetivos táctiles ≥ 44 px; sin desplazamiento horizontal desde 360 px; estados de carga y error visibles; estados distinguibles también sin color (icono y texto).

## Comando de carga de demostración (interfaz de línea de comandos)

`pnpm db:seed [--ancla AAAA-MM-DD]` — carga Clínica Eleva de forma determinista (FR-022, FR-023). Sin `--ancla` usa el lunes de la semana actual en Madrid. La clave de panel de la demo se muestra en la salida del comando y se documenta en `quickstart.md`.
