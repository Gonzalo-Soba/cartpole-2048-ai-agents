import { DIRECCIONES, type Direccion } from './motor/tablero'

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

const NOMBRES: Record<Direccion, string> = {
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
    const texto = valor === null ? 'ilegal' : formatearNumero(valor)
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

const numero = new Intl.NumberFormat('es-AR', { maximumFractionDigits: 0, useGrouping: 'always' })

/** Formato con punto de miles también en números de 4 cifras (1.130, no 1130). */
export function formatearNumero(valor: number): string {
  return numero.format(valor)
}
