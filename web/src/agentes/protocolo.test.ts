import { describe, expect, it } from 'vitest'
import { analisisDesdePython, minProb } from './protocolo'

describe('analisisDesdePython', () => {
  it('pasa los índices de Python (UP, DOWN, LEFT, RIGHT) a direcciones', () => {
    const a = analisisDesdePython({ move_values: [812.5, null, 640, 1130], chosen: 3, nodes: 2181, ms: 5.2 })
    expect(a).toEqual({
      valores: { arriba: 812.5, abajo: null, izquierda: 640, derecha: 1130 },
      elegida: 'derecha',
      nodos: 2181,
      ms: 5.2,
    })
  })

  it('sin jugadas legales no hay elegida', () => {
    expect(analisisDesdePython({ move_values: [null, null, null, null], chosen: null, nodes: 0, ms: 0 }).elegida).toBeNull()
  })
})

describe('minProb', () => {
  it('solo poda Expectimax en profundidad 3, como experiments.py', () => {
    expect(minProb({ agente: 'expectimax', profundidad: 3, evaluacion: 'balanceada' })).toBe(1e-3)
    expect(minProb({ agente: 'expectimax', profundidad: 2, evaluacion: 'balanceada' })).toBe(0)
    expect(minProb({ agente: 'minimax_ab', profundidad: 3, evaluacion: 'balanceada' })).toBe(0)
  })
})
