import type { Rng } from './tablero'

/**
 * Mulberry32: generador chico con semilla. Sirve para que los tests sean
 * reproducibles; no intenta imitar al generador de numpy.
 */
export function crearRng(semilla: number): Rng {
  let estado = semilla >>> 0
  return () => {
    estado = (estado + 0x6d2b79f5) >>> 0
    let t = estado
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
