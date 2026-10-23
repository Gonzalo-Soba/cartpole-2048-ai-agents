import type { Direccion, ValoresBrujula } from '../brujula'

/*
 * Datos de relleno para el layout estático. No salen de ninguna corrida: la UI
 * los marca como "Valores de ejemplo" hasta que se conecten los agentes.
 */

// Toda la rampa, de 1 a 4 dígitos, más una fila vacía.
export const TABLERO_EJEMPLO: readonly number[] = [
  2, 4, 8, 16,
  32, 64, 128, 256,
  512, 1024, 2048, 4096,
  0, 0, 0, 0,
]

export const BRUJULA_EJEMPLO: { valores: ValoresBrujula; elegida: Direccion } = {
  valores: { arriba: 812, abajo: null, izquierda: 640, derecha: 1130 },
  elegida: 'derecha',
}
