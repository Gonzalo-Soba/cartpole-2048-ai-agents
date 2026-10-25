import { describe, expect, it } from 'vitest'
import fixtures from './fixtures.json'
import { crearRng } from './rng'
import { DIRECCIONES, agregarFicha, celdasVacias, deslizarLinea, jugadasLegales, mover } from './tablero'

describe('paridad con board.py', () => {
  it('usa el mismo orden de direcciones', () => {
    expect(fixtures.direcciones).toEqual(['UP', 'DOWN', 'LEFT', 'RIGHT'])
    expect(DIRECCIONES).toEqual(['arriba', 'abajo', 'izquierda', 'derecha'])
  })

  it(`da el mismo tablero y puntaje en los ${fixtures.casos.length} casos`, () => {
    for (const caso of fixtures.casos) {
      DIRECCIONES.forEach((d, codigo) => {
        const r = mover(caso.tablero, d)
        const esperado = caso.movimientos[codigo]
        expect(r.tablero, `${d} sobre ${caso.tablero}`).toEqual(esperado.tablero)
        expect(r.puntaje, `${d} sobre ${caso.tablero}`).toBe(esperado.puntaje)
      })
    }
  })

  it('da las mismas jugadas legales y celdas vacías', () => {
    for (const caso of fixtures.casos) {
      const legales = jugadasLegales(caso.tablero).map((d) => DIRECCIONES.indexOf(d))
      expect(legales, `${caso.tablero}`).toEqual(caso.legales)
      expect(celdasVacias(caso.tablero)).toEqual(caso.vacias)
    }
  })
})

describe('deslizarLinea', () => {
  it('fusiona una sola vez por ficha', () => {
    expect(deslizarLinea([1, 1, 1, 1])).toEqual({ linea: [2, 2, 0, 0], puntaje: 8 })
    expect(deslizarLinea([2, 1, 1, 0])).toEqual({ linea: [2, 2, 0, 0], puntaje: 4 })
  })

  it('no fusiona el exponente 15', () => {
    expect(deslizarLinea([15, 15, 0, 0])).toEqual({ linea: [15, 15, 0, 0], puntaje: 0 })
  })
})

describe('agregarFicha', () => {
  const tablero = [1, 0, 2, 0, 0, 3, 0, 0, 4, 4, 4, 4, 5, 5, 5, 0]

  it('elige entre las celdas vacías con el primer número y el valor con el segundo', () => {
    const vacias = celdasVacias(tablero)
    const secuencia = (...valores: number[]) => () => valores.shift()!
    expect(agregarFicha(tablero, secuencia(0, 0.89))).toMatchObject({ indice: vacias[0], exponente: 1 })
    // Como en Python: rng.random() < 0.9 es un 2, así que 0.9 ya es un 4.
    expect(agregarFicha(tablero, secuencia(0.999, 0.9))).toMatchObject({ indice: vacias.at(-1), exponente: 2 })
  })

  it('pone un 2 cerca del 90 % de las veces', () => {
    const rng = crearRng(7)
    let dos = 0
    const n = 20000
    for (let i = 0; i < n; i++) if (agregarFicha([0, ...tablero.slice(1)], rng)!.exponente === 1) dos++
    expect(dos / n).toBeGreaterThan(0.89)
    expect(dos / n).toBeLessThan(0.91)
  })

  it('devuelve null con el tablero lleno', () => {
    expect(agregarFicha(Array(16).fill(1), Math.random)).toBeNull()
  })
})
