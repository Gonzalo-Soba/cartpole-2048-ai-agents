import { useEffect, useState } from 'react'
import type { Analisis, ConfigAgente } from '../agentes/protocolo'
import type { Tablero } from '../motor/tablero'

/** La pista usa el agente más rápido de los buenos: unos 15 ms por jugada en Pyodide. */
export const CONFIG_PISTA: ConfigAgente = { agente: 'expectimax', profundidad: 2, evaluacion: 'balanceada' }

// Espera tras la última jugada antes de pedir: si se mantiene apretada una
// flecha, no se encolan análisis de tableros que ya pasaron.
const ESPERA_MS = 80

interface Opciones {
  tablero: Tablero
  activa: boolean
  listo: boolean
  analizar: (tablero: Tablero, config: ConfigAgente) => Promise<Analisis>
}

/** Análisis del tablero actual, o `null` mientras no hay uno vigente. */
export function usePista({ tablero, activa, listo, analizar }: Opciones): Analisis | null {
  const [resultado, setResultado] = useState<{ clave: string; analisis: Analisis } | null>(null)
  const clave = tablero.join(',')

  useEffect(() => {
    if (!activa || !listo) return
    let vigente = true
    const t = setTimeout(() => {
      analizar(clave.split(',').map(Number), CONFIG_PISTA).then(
        (analisis) => vigente && setResultado({ clave, analisis }),
        () => {}, // el error de carga ya lo muestra el panel
      )
    }, ESPERA_MS)
    return () => {
      vigente = false
      clearTimeout(t)
    }
  }, [activa, listo, clave, analizar])

  return activa && resultado?.clave === clave ? resultado.analisis : null
}
