import type { Analisis } from './agentes/protocolo'
import { DIRECCIONES, jugadasLegales, type Direccion, type Tablero } from './motor/tablero'

export { DIRECCIONES, type Direccion }

/** Valor de cada jugada; `null` si la jugada es ilegal. */
export type ValoresBrujula = Record<Direccion, number | null>

// Piso para que la peor jugada legal siga viéndose distinta de una ilegal.
const RELLENO_MINIMO = 0.15

/**
 * Proporción de llenado (0 a 1) de cada medidor, relativa entre las jugadas
 * legales. Es relativa y no absoluta porque las evaluaciones pueden ser
 * negativas o de escalas muy distintas según la heurística.
 */
export function rellenoBrujula(valores: ValoresBrujula): Record<Direccion, number> {
  const legales = DIRECCIONES.map((d) => valores[d]).filter((v): v is number => v !== null)
  const min = Math.min(...legales)
  const max = Math.max(...legales)
  const relleno = {} as Record<Direccion, number>
  for (const d of DIRECCIONES) {
    const v = valores[d]
    if (v === null) relleno[d] = 0
    else if (max === min) relleno[d] = 1
    else relleno[d] = RELLENO_MINIMO + (1 - RELLENO_MINIMO) * ((v - min) / (max - min))
  }
  return relleno
}

/** Lo que dibuja un medidor: texto visible, llenado, estado y texto accesible. */
export interface Medidor {
  texto: string
  relleno: number
  estado: 'elegida' | 'legal' | 'ilegal'
  etiqueta: string
}

export const NOMBRES: Record<Direccion, string> = {
  arriba: 'Arriba',
  abajo: 'Abajo',
  izquierda: 'Izquierda',
  derecha: 'Derecha',
}

/** Medidores con el valor que calculó el agente para cada jugada. */
export function medidoresDeValores(valores: ValoresBrujula, elegida: Direccion): Record<Direccion, Medidor> {
  const relleno = rellenoBrujula(valores)
  const medidores = {} as Record<Direccion, Medidor>
  for (const d of DIRECCIONES) {
    const valor = valores[d]
    const estado = valor === null ? 'ilegal' : d === elegida ? 'elegida' : 'legal'
    // Un decimal: con enteros, dos jugadas parecen empatadas aunque una gane.
    const texto = valor === null ? 'ilegal' : decimal.format(valor)
    const sufijo = estado === 'elegida' ? ', jugada elegida' : ''
    medidores[d] = { texto, relleno: relleno[d], estado, etiqueta: `${NOMBRES[d]}: ${texto}${sufijo}` }
  }
  return medidores
}

/**
 * Medidores sin agente: solo lo que sabe el motor, qué jugadas son legales y
 * cuál fue la última. Sin valores inventados.
 */
export function medidoresDeLegalidad(legales: readonly Direccion[], ultima: Direccion | null): Record<Direccion, Medidor> {
  const medidores = {} as Record<Direccion, Medidor>
  for (const d of DIRECCIONES) {
    if (!legales.includes(d)) {
      medidores[d] = { texto: 'ilegal', relleno: 0, estado: 'ilegal', etiqueta: `${NOMBRES[d]}: ilegal` }
    } else if (d === ultima) {
      medidores[d] = { texto: 'última', relleno: 1, estado: 'elegida', etiqueta: `${NOMBRES[d]}: legal, última jugada` }
    } else {
      medidores[d] = { texto: 'legal', relleno: 0, estado: 'legal', etiqueta: `${NOMBRES[d]}: legal` }
    }
  }
  return medidores
}

/**
 * Medidores del modo agente. Muestran el último análisis sobre el tablero en
 * que se calculó; el agente aleatorio no tiene valores, así que solo marca
 * legales y la elegida. Sin análisis todavía, las jugadas legales del tablero actual.
 */
export function medidoresDeAnalisis(
  ultimo: { analisis: Analisis; tablero: Tablero } | null,
  tableroActual: Tablero,
): Record<Direccion, Medidor> {
  if (!ultimo) return medidoresDeLegalidad(jugadasLegales(tableroActual), null)
  const { analisis, tablero } = ultimo
  const sinValores = DIRECCIONES.every((d) => analisis.valores[d] === null)
  if (analisis.elegida === null || sinValores) return medidoresDeLegalidad(jugadasLegales(tablero), analisis.elegida)
  return medidoresDeValores(analisis.valores, analisis.elegida)
}

const numero = new Intl.NumberFormat('es-AR', { maximumFractionDigits: 0, useGrouping: 'always' })
const decimal = new Intl.NumberFormat('es-AR', { maximumFractionDigits: 1, useGrouping: 'always' })

/** Formato con punto de miles también en números de 4 cifras (1.130, no 1130). */
export function formatearNumero(valor: number): string {
  return numero.format(valor)
}

/** Milisegundos: un decimal por debajo de 10 ms (5,2), enteros a partir de ahí (152). */
export function formatearMs(ms: number): string {
  return (ms < 10 ? decimal : numero).format(ms)
}
