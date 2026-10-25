import { EXPONENTE_MAXIMO, LINEAS, agregarFicha, type Direccion, type Rng, type Tablero } from './tablero'

/*
 * Capa de identidad sobre las reglas: para animar hace falta saber a dónde fue
 * cada ficha y cuáles se fusionaron, no solo el tablero final. El resultado
 * tiene que coincidir siempre con `mover` (lo verifica fichas.test.ts).
 */

export interface Ficha {
  id: number
  exponente: number
  /** Celda actual (destino si acaba de moverse), 4 * fila + columna. */
  indice: number
}

export type Animacion = 'quieta' | 'fusion' | 'nueva'

export interface FichaVisible extends Ficha {
  animacion: Animacion
}

export interface MovimientoFichas {
  fichas: FichaVisible[]
  /** Fichas que desaparecen en una fusión: se dibujan deslizándose hasta su destino. */
  absorbidas: Ficha[]
  puntaje: number
  cambio: boolean
  siguienteId: number
}

export function tableroDeFichas(fichas: readonly Ficha[]): Tablero {
  const tablero = Array(16).fill(0)
  for (const f of fichas) tablero[f.indice] = f.exponente
  return tablero
}

export function fichasDeTablero(tablero: Tablero, primerId = 1): { fichas: FichaVisible[]; siguienteId: number } {
  let id = primerId
  const fichas: FichaVisible[] = []
  tablero.forEach((exponente, indice) => {
    if (exponente) fichas.push({ id: id++, exponente, indice, animacion: 'quieta' })
  })
  return { fichas, siguienteId: id }
}

/** Mismo recorrido que `deslizarLinea`, pero conservando qué ficha es cuál. */
export function moverFichas(fichas: readonly Ficha[], direccion: Direccion, siguienteId: number): MovimientoFichas {
  const porIndice = new Map(fichas.map((f) => [f.indice, f]))
  const resultado: FichaVisible[] = []
  const absorbidas: Ficha[] = []
  let puntaje = 0
  let cambio = false
  let id = siguienteId

  for (const indices of LINEAS[direccion]) {
    const enLinea = indices.map((i) => porIndice.get(i)).filter((f): f is Ficha => f !== undefined)
    let destino = 0
    for (let k = 0; k < enLinea.length; k++) {
      const actual = enLinea[k]
      const siguiente = enLinea[k + 1]
      const celda = indices[destino++]
      if (siguiente && siguiente.exponente === actual.exponente && actual.exponente < EXPONENTE_MAXIMO) {
        const exponente = actual.exponente + 1
        resultado.push({ id: id++, exponente, indice: celda, animacion: 'fusion' })
        absorbidas.push({ ...actual, indice: celda }, { ...siguiente, indice: celda })
        puntaje += 2 ** exponente
        cambio = true
        k++
      } else {
        if (actual.indice !== celda) cambio = true
        resultado.push({ id: actual.id, exponente: actual.exponente, indice: celda, animacion: 'quieta' })
      }
    }
  }
  return { fichas: resultado, absorbidas, puntaje, cambio, siguienteId: id }
}

/** Agrega la ficha nueva marcada para animar su aparición. */
export function agregarFichaVisible(
  fichas: readonly FichaVisible[],
  rng: Rng,
  siguienteId: number,
): { fichas: FichaVisible[]; siguienteId: number } {
  const nueva = agregarFicha(tableroDeFichas(fichas), rng)
  if (!nueva) return { fichas: [...fichas], siguienteId }
  return {
    fichas: [...fichas, { id: siguienteId, exponente: nueva.exponente, indice: nueva.indice, animacion: 'nueva' }],
    siguienteId: siguienteId + 1,
  }
}
