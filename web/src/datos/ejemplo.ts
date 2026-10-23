import type { Direccion, ValoresBrujula } from '../brujula'
import { fichasDeTablero } from '../motor/fichas'

/*
 * Datos de relleno para el modo agente mientras los agentes no están
 * conectados. No salen de ninguna corrida: la UI los marca como "Valores de
 * ejemplo".
 */

// Toda la rampa, de 1 a 4 dígitos, más una fila vacía (en exponentes).
const TABLERO_EJEMPLO = [
  1, 2, 3, 4,
  5, 6, 7, 8,
  9, 10, 11, 12,
  0, 0, 0, 0,
]

export const FICHAS_EJEMPLO = fichasDeTablero(TABLERO_EJEMPLO).fichas

export const BRUJULA_EJEMPLO: { valores: ValoresBrujula; elegida: Direccion } = {
  valores: { arriba: 812, abajo: null, izquierda: 640, derecha: 1130 },
  elegida: 'derecha',
}
