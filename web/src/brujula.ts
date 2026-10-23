export type Direccion = 'arriba' | 'abajo' | 'izquierda' | 'derecha'

export const DIRECCIONES: readonly Direccion[] = ['arriba', 'abajo', 'izquierda', 'derecha']

/** Valor de cada jugada; `null` si la jugada es ilegal. */
export type ValoresBrujula = Record<Direccion, number | null>

// Piso para que la peor jugada legal siga viéndose distinta de una ilegal.
const RELLENO_MINIMO = 0.15

/**
 * Proporción de llenado (0 a 1) de cada medidor, relativa entre las jugadas
 * legales. Es relativa y no absoluta porque las evaluaciones pueden ser
 * negativas o de escalas muy distintas según la heurística.
 */
export function rellenoBrujula(valores: ValoresBrujula): Record<Direccion, number> {
  const legales = DIRECCIONES.map((d) => valores[d]).filter((v): v is number => v !== null)
  const min = Math.min(...legales)
  const max = Math.max(...legales)
  const relleno = {} as Record<Direccion, number>
  for (const d of DIRECCIONES) {
    const v = valores[d]
    if (v === null) relleno[d] = 0
    else if (max === min) relleno[d] = 1
    else relleno[d] = RELLENO_MINIMO + (1 - RELLENO_MINIMO) * ((v - min) / (max - min))
  }
  return relleno
}

const numero = new Intl.NumberFormat('es-AR', { maximumFractionDigits: 0, useGrouping: 'always' })

/** Formato con punto de miles también en números de 4 cifras (1.130, no 1130). */
export function formatearNumero(valor: number): string {
  return numero.format(valor)
}
