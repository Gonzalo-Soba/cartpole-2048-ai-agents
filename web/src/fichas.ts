/** Estilo visual de una ficha según su valor. */
export interface EstiloFicha {
  /** Color de fondo como referencia a un token de la rampa. */
  fondo: string
  /** Color del número; se elige por contraste medido (>= 4.5:1). */
  texto: string
  /** Eje de ancho de Archivo: más dígitos, más condensado, mismo cuerpo. */
  wdth: number
  peso: number
  /** Solo las fichas de 5 o más dígitos bajan un escalón de tamaño. */
  cuerpo: 'normal' | 'reducido'
}

const MAX_RAMPA = 2048

// Fichas con texto claro: el resto no llega a 4.5:1 con blanco.
const TEXTO_CLARO = new Set([64, 128, 256, 512, 1024])

const POR_DIGITOS: Record<number, Pick<EstiloFicha, 'wdth' | 'peso'>> = {
  1: { wdth: 112, peso: 800 },
  2: { wdth: 104, peso: 800 },
  3: { wdth: 95, peso: 780 },
  4: { wdth: 72, peso: 760 },
}

export function esValorDeFicha(valor: number): boolean {
  return Number.isInteger(valor) && valor >= 2 && (valor & (valor - 1)) === 0
}

export function estiloFicha(valor: number): EstiloFicha {
  if (!esValorDeFicha(valor)) {
    throw new RangeError(`${valor} no es un valor de ficha (potencia de 2 desde 2)`)
  }
  const digitos = String(valor).length
  const { wdth, peso } = POR_DIGITOS[digitos] ?? { wdth: 62, peso: 740 }
  return {
    fondo: valor > MAX_RAMPA ? 'var(--tmax)' : `var(--t${valor})`,
    texto: TEXTO_CLARO.has(valor) ? 'var(--ficha-clara)' : 'var(--ficha-oscura)',
    wdth,
    peso,
    cuerpo: digitos >= 5 ? 'reducido' : 'normal',
  }
}
