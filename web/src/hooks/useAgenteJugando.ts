import { useCallback, useEffect, useRef, useState } from 'react'
import type { Analisis, ConfigAgente } from '../agentes/protocolo'
import { tableroDeFichas } from '../motor/fichas'
import type { Partida } from '../motor/partida'
import type { Direccion, Tablero } from '../motor/tablero'

/** Pausa entre jugadas, de la más lenta a la más rápida. */
export const VELOCIDADES = [
  { nombre: 'Muy lenta', pausaMs: 1000 },
  { nombre: 'Lenta', pausaMs: 500 },
  { nombre: 'Normal', pausaMs: 250 },
  { nombre: 'Rápida', pausaMs: 100 },
  { nombre: 'Máxima', pausaMs: 0 },
] as const

export interface UltimoAnalisis {
  analisis: Analisis
  /** Tablero sobre el que decidió el agente: la brújula muestra sus valores. */
  tablero: Tablero
  config: ConfigAgente
}

interface Opciones {
  partida: Partida
  jugar: (direccion: Direccion) => void
  nueva: () => void
  analizar: (tablero: Tablero, config: ConfigAgente) => Promise<Analisis>
  listo: boolean
}

/**
 * Bucle pedir análisis, mostrarlo y jugar la elegida. Cada pedido lleva un
 * turno: si mientras tanto se pausa o cambia la configuración, la respuesta
 * vieja se descarta en lugar de mover el tablero.
 */
export function useAgenteJugando({ partida, jugar, nueva, analizar, listo }: Opciones) {
  const [config, setConfigEstado] = useState<ConfigAgente>({
    agente: 'expectimax',
    profundidad: 2,
    evaluacion: 'balanceada',
  })
  const [velocidad, setVelocidad] = useState(2)
  const [corriendo, setCorriendo] = useState(false)
  const [pensando, setPensando] = useState(false)
  const [ultimo, setUltimo] = useState<UltimoAnalisis | null>(null)
  const turno = useRef(0)
  const ocupado = useRef(false)

  const invalidar = useCallback(() => {
    turno.current++
    ocupado.current = false
    setPensando(false)
  }, [])

  const paso = useCallback(() => {
    if (ocupado.current || partida.terminada) return
    const tablero = tableroDeFichas(partida.fichas)
    const mio = ++turno.current
    ocupado.current = true
    setPensando(true)
    analizar(tablero, config).then(
      (analisis) => {
        if (mio !== turno.current) return
        ocupado.current = false
        setPensando(false)
        setUltimo({ analisis, tablero, config })
        if (analisis.elegida) jugar(analisis.elegida)
      },
      () => {
        // El error de carga ya lo muestra el panel; acá solo se frena el bucle.
        if (mio !== turno.current) return
        ocupado.current = false
        setPensando(false)
        setCorriendo(false)
      },
    )
  }, [partida, config, analizar, jugar])

  const activo = corriendo && listo && !partida.terminada
  const pausaMs = VELOCIDADES[velocidad].pausaMs

  // Cada jugada cambia la partida y agenda la siguiente.
  useEffect(() => {
    if (!activo) return
    const t = setTimeout(paso, pausaMs)
    return () => clearTimeout(t)
  }, [activo, paso, pausaMs])

  const setConfig = useCallback(
    (c: ConfigAgente) => {
      invalidar()
      setConfigEstado(c)
    },
    [invalidar],
  )

  const pausar = useCallback(() => {
    invalidar()
    setCorriendo(false)
  }, [invalidar])

  const alternar = useCallback(() => (activo ? pausar() : setCorriendo(true)), [activo, pausar])

  const nuevaPartida = useCallback(() => {
    pausar()
    setUltimo(null)
    nueva()
  }, [pausar, nueva])

  return {
    config,
    setConfig,
    velocidad,
    setVelocidad,
    corriendo: activo,
    pensando,
    ultimo,
    alternar,
    pausar,
    paso,
    nueva: nuevaPartida,
  }
}
