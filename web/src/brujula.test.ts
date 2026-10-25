import { describe, expect, it } from 'vitest'
import { formatearMs, formatearNumero, medidoresDeAnalisis, medidoresDeLegalidad, rellenoBrujula } from './brujula'

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
    expect(m.arriba).toMatchObject({ estado: 'legal', relleno: 0, texto: '', etiqueta: 'Arriba: legal' })
    expect(m.izquierda).toMatchObject({ estado: 'elegida', relleno: 1, texto: 'última' })
  })

  it('si la última jugada ya no es legal, gana ilegal', () => {
    expect(medidoresDeLegalidad(['arriba'], 'abajo').abajo.estado).toBe('ilegal')
  })
})

describe('medidoresDeAnalisis', () => {
  const tablero = [1, 2, ...Array(14).fill(0)] // legales: abajo y derecha

  it('sin análisis muestra las jugadas legales del tablero actual', () => {
    const m = medidoresDeAnalisis(null, tablero)
    expect(m.arriba.estado).toBe('ilegal')
    expect(m.abajo).toMatchObject({ estado: 'legal', texto: '', etiqueta: 'Abajo: legal' })
  })

  it('con valores muestra los valores y la elegida', () => {
    const analisis = {
      valores: { arriba: null, abajo: 40, izquierda: null, derecha: 55.6 },
      elegida: 'derecha' as const,
      nodos: 10,
      ms: 1,
    }
    const m = medidoresDeAnalisis({ analisis, tablero }, tablero)
    expect(m.derecha).toMatchObject({ estado: 'elegida', texto: '55,6', relleno: 1 })
    expect(m.abajo).toMatchObject({ estado: 'legal', texto: '40' })
  })

  it('el agente aleatorio no tiene valores: marca legales y la elegida', () => {
    const analisis = {
      valores: { arriba: null, abajo: null, izquierda: null, derecha: null },
      elegida: 'abajo' as const,
      nodos: 0,
      ms: 0,
    }
    const m = medidoresDeAnalisis({ analisis, tablero }, tablero)
    expect(m.abajo.estado).toBe('elegida')
    expect(m.derecha.estado).toBe('legal')
    expect(m.arriba.estado).toBe('ilegal')
  })
})

describe('formatearMs', () => {
  it('usa coma decimal por debajo de 10 ms', () => {
    expect(formatearMs(5.24)).toBe('5,2')
    expect(formatearMs(151.7)).toBe('152')
    expect(formatearMs(1234)).toBe('1.234')
  })
})
