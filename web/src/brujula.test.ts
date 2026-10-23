import { describe, expect, it } from 'vitest'
import { formatearNumero, medidoresDeLegalidad, rellenoBrujula } from './brujula'

describe('rellenoBrujula', () => {
  it('llena la mejor jugada, deja un piso a la peor y vacía las ilegales', () => {
    const r = rellenoBrujula({ arriba: 50, abajo: null, izquierda: 0, derecha: 100 })
    expect(r.derecha).toBe(1)
    expect(r.izquierda).toBeCloseTo(0.15)
    expect(r.arriba).toBeCloseTo(0.575)
    expect(r.abajo).toBe(0)
  })

  it('funciona con valores negativos y con empates', () => {
    const neg = rellenoBrujula({ arriba: -10, abajo: -30, izquierda: null, derecha: null })
    expect(neg.arriba).toBe(1)
    expect(neg.abajo).toBeCloseTo(0.15)
    const empate = rellenoBrujula({ arriba: 7, abajo: 7, izquierda: null, derecha: null })
    expect(empate).toEqual({ arriba: 1, abajo: 1, izquierda: 0, derecha: 0 })
  })
})

describe('formatearNumero', () => {
  it('agrupa miles con punto desde 4 cifras', () => {
    expect(formatearNumero(1130)).toBe('1.130')
    expect(formatearNumero(17028)).toBe('17.028')
    expect(formatearNumero(812)).toBe('812')
  })
})

describe('medidoresDeLegalidad', () => {
  it('marca ilegales, legales y la última jugada sin inventar valores', () => {
    const m = medidoresDeLegalidad(['arriba', 'izquierda', 'derecha'], 'izquierda')
    expect(m.abajo).toMatchObject({ estado: 'ilegal', relleno: 0, texto: 'ilegal' })
    expect(m.arriba).toMatchObject({ estado: 'legal', relleno: 0, texto: 'legal' })
    expect(m.izquierda).toMatchObject({ estado: 'elegida', relleno: 1, texto: 'última' })
  })

  it('si la última jugada ya no es legal, gana ilegal', () => {
    expect(medidoresDeLegalidad(['arriba'], 'abajo').abajo.estado).toBe('ilegal')
  })
})
