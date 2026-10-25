import { useCallback, useEffect, useRef, useState } from 'react'
import {
  analisisDesdePython,
  type Analisis,
  type ConfigAgente,
  type EtapaCarga,
  type MensajeAlWorker,
  type MensajeDelWorker,
} from '../agentes/protocolo'
import type { Tablero } from '../motor/tablero'

export type EstadoAgente =
  | { fase: 'inactivo' }
  | { fase: 'cargando'; etapa: EtapaCarga }
  | { fase: 'listo' }
  | { fase: 'error'; mensaje: string }

interface Pendiente {
  resolver: (a: Analisis) => void
  rechazar: (e: Error) => void
}

/**
 * Worker de Pyodide creado una sola vez, a pedido. `analizar` devuelve una
 * promesa por pedido; si el worker falla, se rechazan todas las pendientes.
 */
export function useAgente() {
  const [estado, setEstado] = useState<EstadoAgente>({ fase: 'inactivo' })
  const worker = useRef<Worker | null>(null)
  const pendientes = useRef(new Map<number, Pendiente>())
  const siguienteId = useRef(1)

  const fallar = useCallback((mensaje: string) => {
    setEstado({ fase: 'error', mensaje })
    for (const p of pendientes.current.values()) p.rechazar(new Error(mensaje))
    pendientes.current.clear()
    worker.current?.terminate()
    worker.current = null
  }, [])

  const obtenerWorker = useCallback(() => {
    if (worker.current) return worker.current
    const w = new Worker(new URL('../agentes/worker.ts', import.meta.url), { type: 'module' })
    w.onmessage = (e: MessageEvent<MensajeDelWorker>) => {
      const m = e.data
      if (m.tipo === 'progreso') setEstado({ fase: 'cargando', etapa: m.etapa })
      else if (m.tipo === 'listo') setEstado({ fase: 'listo' })
      else if (m.tipo === 'analisis') {
        pendientes.current.get(m.id)?.resolver(analisisDesdePython(m.resultado))
        pendientes.current.delete(m.id)
      } else if (m.id === undefined) fallar(m.mensaje)
      else {
        pendientes.current.get(m.id)?.rechazar(new Error(m.mensaje))
        pendientes.current.delete(m.id)
      }
    }
    w.onerror = (e) => fallar(e.message || 'El worker de los agentes se detuvo.')
    worker.current = w
    return w
  }, [fallar])

  const enviar = useCallback((m: MensajeAlWorker) => obtenerWorker().postMessage(m), [obtenerWorker])

  /** Empieza la carga sin pedir nada todavía; repetirlo no hace nada. */
  const iniciar = useCallback(() => {
    if (worker.current) return
    setEstado({ fase: 'cargando', etapa: 'pyodide' })
    enviar({ tipo: 'iniciar' })
  }, [enviar])

  const analizar = useCallback(
    (tablero: Tablero, config: ConfigAgente) =>
      new Promise<Analisis>((resolver, rechazar) => {
        const id = siguienteId.current++
        pendientes.current.set(id, { resolver, rechazar })
        enviar({ tipo: 'analizar', id, tablero: [...tablero], config })
      }),
    [enviar],
  )

  const reintentar = useCallback(() => {
    worker.current?.terminate()
    worker.current = null
    iniciar()
  }, [iniciar])

  useEffect(() => () => worker.current?.terminate(), [])

  return { estado, iniciar, analizar, reintentar }
}
