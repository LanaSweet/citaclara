/** Importes siempre en céntimos enteros (FR-020, principio II). Prohibido `float`. */

function exigirEntero(centimos: number): void {
  if (!Number.isInteger(centimos)) {
    throw new RangeError('El importe debe expresarse en céntimos enteros.')
  }
}

const formatoEuros = new Intl.NumberFormat('es-ES', {
  style: 'currency',
  currency: 'EUR',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
  useGrouping: 'min2',
})

/** 4000 → «40,00 €». */
export function formatearEuros(centimos: number): string {
  exigirEntero(centimos)
  // Intl separa con un espacio de no ruptura; se normaliza a espacio normal.
  return formatoEuros.format(centimos / 100).replace(/ /g, ' ')
}

export function sumarCentimos(...importes: number[]): number {
  importes.forEach(exigirEntero)
  return importes.reduce((total, i) => total + i, 0)
}
