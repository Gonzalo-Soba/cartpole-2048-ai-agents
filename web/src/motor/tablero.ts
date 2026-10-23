/*
 * Reglas de 2048, equivalentes a game2048/game2048/board.py (lo verifican los
 * fixtures exportados desde Python).
 *
 * El tablero son 16 exponentes por filas: índice 4 * fila + columna, 0 = vacía,
 * 1 = 2, 11 = 2048. Python usa un bitboard de 64 bits; acá un array alcanza
 * para jugar y evita BigInt.
 */

/** Mismo orden que UP, DOWN, LEFT, RIGHT en Python: el índice es el código de la jugada. */
export const DIRECCIONES = ['arriba', 'abajo', 'izquierda', 'derecha'] as const

export type Direccion = (typeof DIRECCIONES)[number]

export type Tablero = readonly number[]

/** Generador uniforme en [0, 1), como Math.random. */
export type Rng = () => number

export const PROB_DOS = 0.9

// Igual que en Python: dos fichas de exponente 15 no se fusionan (el nibble no da para 16).
const EXPONENTE_MAXIMO = 15

/**
 * Índices de cada línea en el orden en que se recorren al mover: el primero es
 * el borde hacia el que van las fichas.
 */
export const LINEAS: Record<Direccion, readonly (readonly number[])[]> = {
  izquierda: [0, 1, 2, 3].map((f) => [0, 1, 2, 3].map((c) => 4 * f + c)),
  derecha: [0, 1, 2, 3].map((f) => [3, 2, 1, 0].map((c) => 4 * f + c)),
  arriba: [0, 1, 2, 3].map((c) => [0, 1, 2, 3].map((f) => 4 * f + c)),
  abajo: [0, 1, 2, 3].map((c) => [3, 2, 1, 0].map((f) => 4 * f + c)),
}

/** Desliza y combina una línea hacia su primer elemento. */
export function deslizarLinea(celdas: readonly number[]): { linea: number[]; puntaje: number } {
  const fichas = celdas.filter((e) => e !== 0)
  const linea: number[] = []
  let puntaje = 0
  for (let i = 0; i < fichas.length; i++) {
    if (i + 1 < fichas.length && fichas[i] === fichas[i + 1] && fichas[i] < EXPONENTE_MAXIMO) {
      const fusion = fichas[i] + 1
      linea.push(fusion)
      puntaje += 2 ** fusion
      i++
    } else {
      linea.push(fichas[i])
    }
  }
  while (linea.length < 4) linea.push(0)
  return { linea, puntaje }
}

export interface ResultadoMovimiento {
  tablero: Tablero
  puntaje: number
  cambio: boolean
}

/** Aplica una jugada sin agregar ficha nueva. */
export function mover(tablero: Tablero, direccion: Direccion): ResultadoMovimiento {
  const nuevo = [...tablero]
  let puntaje = 0
  for (const indices of LINEAS[direccion]) {
    const r = deslizarLinea(indices.map((i) => tablero[i]))
    indices.forEach((i, k) => (nuevo[i] = r.linea[k]))
    puntaje += r.puntaje
  }
  const cambio = nuevo.some((e, i) => e !== tablero[i])
  return { tablero: nuevo, puntaje, cambio }
}

/** Jugadas que cambian el tablero, en el orden de DIRECCIONES. */
export function jugadasLegales(tablero: Tablero): Direccion[] {
  return DIRECCIONES.filter((d) => mover(tablero, d).cambio)
}

export function celdasVacias(tablero: Tablero): number[] {
  const vacias: number[] = []
  tablero.forEach((e, i) => e === 0 && vacias.push(i))
  return vacias
}

export interface FichaNueva {
  tablero: Tablero
  indice: number
  exponente: number
}

/** Agrega un 2 (90 %) o un 4 en una celda vacía al azar; `null` si no hay lugar. */
export function agregarFicha(tablero: Tablero, rng: Rng): FichaNueva | null {
  const vacias = celdasVacias(tablero)
  if (vacias.length === 0) return null
  const indice = vacias[Math.floor(rng() * vacias.length)]
  const exponente = rng() < PROB_DOS ? 1 : 2
  const nuevo = [...tablero]
  nuevo[indice] = exponente
  return { tablero: nuevo, indice, exponente }
}

export function exponenteMaximo(tablero: Tablero): number {
  return Math.max(...tablero)
}

/** Valor de la ficha (2, 4, ..., 2048) para un exponente; 0 si está vacía. */
export function valorDeExponente(exponente: number): number {
  return exponente === 0 ? 0 : 2 ** exponente
}
