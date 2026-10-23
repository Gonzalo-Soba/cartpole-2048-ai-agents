import {
  agregarFichaVisible,
  fichasDeTablero,
  moverFichas,
  tableroDeFichas,
  type Ficha,
  type FichaVisible,
} from './fichas'
import { exponenteMaximo, jugadasLegales, type Direccion, type Rng, type Tablero } from './tablero'

const EXPONENTE_2048 = 11

export interface Partida {
  fichas: FichaVisible[]
  absorbidas: Ficha[]
  puntaje: number
  movimientos: number
  siguienteId: number
  ultima: Direccion | null
  terminada: boolean
  /** Queda en true una vez alcanzado: el aviso se da una sola vez por partida. */
  llego2048: boolean
}

export function partidaDesdeTablero(tablero: Tablero): Partida {
  const { fichas, siguienteId } = fichasDeTablero(tablero)
  return {
    fichas,
    absorbidas: [],
    puntaje: 0,
    movimientos: 0,
    siguienteId,
    ultima: null,
    terminada: jugadasLegales(tablero).length === 0,
    llego2048: exponenteMaximo(tablero) >= EXPONENTE_2048,
  }
}

/**
 * Tablero vacío con dos fichas al azar, como `GameBoard()` en Python.
 * `primerId` sigue la numeración de la partida anterior: si los ids se
 * repitieran, la UI reutilizaría las fichas viejas y las animaría.
 */
export function nuevaPartida(rng: Rng, primerId = 1): Partida {
  let { fichas, siguienteId } = agregarFichaVisible([], rng, primerId)
  ;({ fichas, siguienteId } = agregarFichaVisible(fichas, rng, siguienteId))
  return { ...partidaDesdeTablero(tableroDeFichas(fichas)), fichas, siguienteId }
}

/**
 * Aplica una jugada y agrega la ficha nueva. Si la jugada no cambia el tablero
 * devuelve la misma partida, como en el juego original.
 */
export function jugar(partida: Partida, direccion: Direccion, rng: Rng): Partida {
  if (partida.terminada) return partida
  const mov = moverFichas(partida.fichas, direccion, partida.siguienteId)
  if (!mov.cambio) return partida
  const { fichas, siguienteId } = agregarFichaVisible(mov.fichas, rng, mov.siguienteId)
  const tablero = tableroDeFichas(fichas)
  return {
    fichas,
    absorbidas: mov.absorbidas,
    puntaje: partida.puntaje + mov.puntaje,
    movimientos: partida.movimientos + 1,
    siguienteId,
    ultima: direccion,
    terminada: jugadasLegales(tablero).length === 0,
    llego2048: partida.llego2048 || exponenteMaximo(tablero) >= EXPONENTE_2048,
  }
}
