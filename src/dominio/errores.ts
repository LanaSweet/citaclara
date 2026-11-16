/** Errores de negocio con mensaje en español, sin jerga técnica (FR-017). */
export type CodigoError =
  | 'CLAVE_INCORRECTA'
  | 'FECHA_INVALIDA'
  | 'EN_EL_PASADO'
  | 'FUERA_DE_HORARIO'
  | 'HUECO_OCUPADO'
  | 'NO_ENCONTRADO'
  | 'NO_AUTORIZADO'
  | 'ESTADO_FINAL'
  | 'CITA_NO_EMPEZADA'

export const MENSAJES: Record<CodigoError, string> = {
  CLAVE_INCORRECTA: 'La clave no es correcta.',
  FECHA_INVALIDA: 'La fecha no es válida. Usa el formato AAAA-MM-DD.',
  EN_EL_PASADO: 'No se pueden crear citas en el pasado.',
  FUERA_DE_HORARIO: 'La cita queda fuera del horario de atención (lunes a viernes, de 09:00 a 20:00).',
  HUECO_OCUPADO: 'Ese hueco ya está ocupado. Hemos actualizado la agenda.',
  NO_ENCONTRADO: 'No se ha encontrado el dato solicitado.',
  NO_AUTORIZADO: 'Debes introducir la clave de la clínica.',
  ESTADO_FINAL: 'Esta cita ya está cerrada y no se puede modificar.',
  CITA_NO_EMPEZADA:
    'Solo se puede marcar como completada o no asistida una cita que ya ha empezado; antes solo se puede cancelar.',
}

export class ErrorNegocio extends Error {
  readonly codigo: CodigoError

  constructor(codigo: CodigoError) {
    super(MENSAJES[codigo])
    this.name = 'ErrorNegocio'
    this.codigo = codigo
  }
}

export type Resultado<T> = { ok: true; datos: T } | { ok: false; codigo: CodigoError; mensaje: string }
