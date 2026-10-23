import { describe, expect, it } from 'vitest'
import { fichasDeTablero, moverFichas, tableroDeFichas } from './fichas'
import { jugar, nuevaPartida, partidaDesdeTablero } from './partida'
import { crearRng } from './rng'
import { DIRECCIONES, mover, type Tablero } from './tablero'

function tableroAleatorio(rng: () => number): Tablero {
  return Array.from({ length: 16 }, () => (rng() < 0.35 ? 0 : 1 + Math.floor(rng() * 11)))
}

describe('moverFichas', () => {
  it('da el mismo tablero, puntaje y cambio que mover en 5000 tableros', () => {
    const rng = crearRng(2048)
    for (let n = 0; n < 5000; n++) {
      const tablero = tableroAleatorio(rng)
      const { fichas, siguienteId } = fichasDeTablero(tablero)
      for (const d of DIRECCIONES) {
        const esperado = mover(tablero, d)
        const r = moverFichas(fichas, d, siguienteId)
        expect(tableroDeFichas(r.fichas), `${d} sobre ${tablero}`).toEqual(esperado.tablero)
        expect(r.puntaje).toBe(esperado.puntaje)
        expect(r.cambio).toBe(esperado.cambio)
      }
    }
  })

  it('conserva el id de las fichas que se mueven y crea uno nuevo por fusión', () => {
    // Fila: 2 . 2 4  ->  izquierda: 4 4 . .
    const { fichas, siguienteId } = fichasDeTablero([1, 0, 1, 2, ...Array(12).fill(0)])
    const [a, b, c] = fichas
    const r = moverFichas(fichas, 'izquierda', siguienteId)

    expect(r.fichas).toEqual([
      { id: siguienteId, exponente: 2, indice: 0, animacion: 'fusion' },
      { id: c.id, exponente: 2, indice: 1, animacion: 'quieta' },
    ])
    expect(r.absorbidas).toEqual([
      { ...a, indice: 0 },
      { ...b, indice: 0 },
    ])
    expect(r.siguienteId).toBe(siguienteId + 1)
  })

  it('no repite ids entre fichas vivas', () => {
    const rng = crearRng(5)
    let partida = nuevaPartida(rng)
    for (let i = 0; i < 300 && !partida.terminada; i++) {
      partida = jugar(partida, DIRECCIONES[Math.floor(rng() * 4)], rng)
      const ids = partida.fichas.map((f) => f.id)
      expect(new Set(ids).size).toBe(ids.length)
    }
  })
})

describe('partida', () => {
  it('empieza con dos fichas', () => {
    const p = nuevaPartida(crearRng(1))
    expect(p.fichas).toHaveLength(2)
    expect(p.puntaje).toBe(0)
  })

  it('una jugada que no cambia el tablero no hace nada', () => {
    const p = partidaDesdeTablero([1, 2, ...Array(14).fill(0)])
    expect(jugar(p, 'izquierda', crearRng(1))).toBe(p)
  })

  it('una jugada suma puntaje, cuenta el movimiento y agrega una ficha nueva', () => {
    const p = partidaDesdeTablero([1, 1, ...Array(14).fill(0)])
    const q = jugar(p, 'derecha', crearRng(1))
    expect(q.puntaje).toBe(4)
    expect(q.movimientos).toBe(1)
    expect(q.ultima).toBe('derecha')
    expect(q.fichas.filter((f) => f.animacion === 'nueva')).toHaveLength(1)
    expect(q.absorbidas).toHaveLength(2)
  })

  it('detecta el fin de partida', () => {
    const lleno = [1, 2, 1, 2, 2, 1, 2, 1, 1, 2, 1, 2, 2, 1, 2, 1]
    const p = partidaDesdeTablero(lleno)
    expect(p.terminada).toBe(true)
    expect(jugar(p, 'arriba', crearRng(1))).toBe(p)
  })

  it('marca 2048 al alcanzarlo y no vuelve a cambiar', () => {
    const p = partidaDesdeTablero([10, 10, ...Array(14).fill(0)])
    expect(p.llego2048).toBe(false)
    const q = jugar(p, 'izquierda', crearRng(1))
    expect(q.llego2048).toBe(true)
    const r = jugar(q, 'derecha', crearRng(1))
    expect(r.llego2048).toBe(true)
  })
})
