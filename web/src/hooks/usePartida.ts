import { useCallback, useReducer } from 'react'
import { jugar, nuevaPartida, type Partida } from '../motor/partida'
import type { Direccion, Rng } from '../motor/tablero'

/*
 * El azar se sortea en el evento y viaja en la acción: así el reductor es puro
 * (StrictMode lo ejecuta dos veces) y cada jugada se aplica al estado al
 * instante, aunque haya una animación en curso.
 */
type Accion = { tipo: 'jugar'; direccion: Direccion; azar: number[] } | { tipo: 'nueva'; azar: number[] }

// Una ficha nueva usa dos números: la celda y si es 2 o 4.
const sortear = (n: number) => Array.from({ length: n }, Math.random)

function rngDe(azar: number[]): Rng {
  let i = 0
  return () => azar[i++]
}

function reductor(partida: Partida, accion: Accion): Partida {
  if (accion.tipo === 'jugar') return jugar(partida, accion.direccion, rngDe(accion.azar))
  return nuevaPartida(rngDe(accion.azar), partida.siguienteId)
}

export function usePartida() {
  const [partida, despachar] = useReducer(reductor, undefined, () => nuevaPartida(Math.random))
  const jugarDireccion = useCallback((direccion: Direccion) => despachar({ tipo: 'jugar', direccion, azar: sortear(2) }), [])
  const nueva = useCallback(() => despachar({ tipo: 'nueva', azar: sortear(4) }), [])
  return { partida, jugar: jugarDireccion, nueva }
}
