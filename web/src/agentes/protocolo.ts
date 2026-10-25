import { DIRECCIONES, type Direccion } from '../motor/tablero'
import type { ValoresBrujula } from '../brujula'

/*
 * Mensajes entre la página y el worker que corre los agentes de Python.
 * Los `id` de agente y evaluación son los de `make_agent` y `PRESETS`.
 */

export type IdAgente = 'random' | 'minimax_ab' | 'expectimax'

export interface ConfigAgente {
  agente: IdAgente
  profundidad: 1 | 2 | 3
  evaluacion: string
}

export type EtapaCarga = 'pyodide' | 'numpy' | 'agentes'

export type MensajeAlWorker =
  | { tipo: 'iniciar' }
  | { tipo: 'analizar'; id: number; tablero: number[]; config: ConfigAgente }

/** Lo que devuelve `agent.analyze()` en Python, tal cual. */
export interface AnalisisPython {
  move_values: (number | null)[]
  chosen: number | null
  nodes: number
  ms: number
}

export type MensajeDelWorker =
  | { tipo: 'progreso'; etapa: EtapaCarga }
  | { tipo: 'listo' }
  | { tipo: 'analisis'; id: number; resultado: AnalisisPython }
  | { tipo: 'error'; id?: number; mensaje: string }

export interface Analisis {
  valores: ValoresBrujula
  elegida: Direccion | null
  nodos: number
  ms: number
}

/**
 * Expectimax exacto en profundidad 3 tarda segundos por jugada en el
 * navegador; se usa la misma poda que en experiments.py.
 */
export function minProb(config: ConfigAgente): number {
  return config.agente === 'expectimax' && config.profundidad === 3 ? 1e-3 : 0
}

/** Pasa del formato de Python (índices UP, DOWN, LEFT, RIGHT) a direcciones. */
export function analisisDesdePython(r: AnalisisPython): Analisis {
  const valores = {} as ValoresBrujula
  DIRECCIONES.forEach((d, i) => (valores[d] = r.move_values[i] ?? null))
  return {
    valores,
    elegida: r.chosen === null ? null : DIRECCIONES[r.chosen],
    nodos: r.nodes,
    ms: r.ms,
  }
}
