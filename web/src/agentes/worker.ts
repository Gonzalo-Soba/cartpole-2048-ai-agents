/// <reference lib="webworker" />
/*
 * Corre los agentes de game2048/ con Pyodide, sin reescribirlos: los .py se
 * importan como texto y se escriben en el sistema de archivos de Pyodide.
 */
import initPy from '../../../game2048/game2048/__init__.py?raw'
import agentsPy from '../../../game2048/game2048/agents.py?raw'
import boardPy from '../../../game2048/game2048/board.py?raw'
import gamePy from '../../../game2048/game2048/game.py?raw'
import heuristicsPy from '../../../game2048/game2048/heuristics.py?raw'
import { minProb, type MensajeAlWorker, type MensajeDelWorker } from './protocolo'

const PYODIDE = 'https://cdn.jsdelivr.net/pyodide/v314.0.7/full/'

// Solo lo que se usa de la API de Pyodide.
interface Pyodide {
  loadPackage(nombres: string[]): Promise<unknown>
  runPythonAsync(codigo: string): Promise<unknown>
  FS: { mkdirTree(ruta: string): void; writeFile(ruta: string, datos: string): void }
  globals: { get(nombre: string): unknown }
}

const ARCHIVOS: Record<string, string> = {
  '__init__.py': initPy,
  'agents.py': agentsPy,
  'board.py': boardPy,
  'game.py': gamePy,
  'heuristics.py': heuristicsPy,
}

// Cachea un agente por configuración: construir el Evaluator arma tablas de 65536 entradas.
const PUENTE = `
import json, sys
sys.path.insert(0, "/agentes")
from game2048 import make_agent

_agentes = {}

def analizar(pedido_json):
    p = json.loads(pedido_json)
    clave = (p["agente"], p["profundidad"], p["evaluacion"], p["min_prob"])
    agente = _agentes.get(clave)
    if agente is None:
        agente = make_agent(p["agente"], depth=p["profundidad"], weights=p["evaluacion"], min_prob=p["min_prob"])
        _agentes[clave] = agente
    b = sum(int(e) << (4 * i) for i, e in enumerate(p["tablero"]))
    return json.dumps(agente.analyze(b))
`

const ctx = self as unknown as DedicatedWorkerGlobalScope
const enviar = (m: MensajeDelWorker) => ctx.postMessage(m)

let carga: Promise<(pedido: string) => string> | null = null

async function cargar() {
  enviar({ tipo: 'progreso', etapa: 'pyodide' })
  const { loadPyodide } = (await import(/* @vite-ignore */ `${PYODIDE}pyodide.mjs`)) as {
    loadPyodide: (opciones: { indexURL: string }) => Promise<Pyodide>
  }
  const py = await loadPyodide({ indexURL: PYODIDE })

  enviar({ tipo: 'progreso', etapa: 'numpy' })
  await py.loadPackage(['numpy'])

  enviar({ tipo: 'progreso', etapa: 'agentes' })
  py.FS.mkdirTree('/agentes/game2048')
  for (const [nombre, codigo] of Object.entries(ARCHIVOS)) py.FS.writeFile(`/agentes/game2048/${nombre}`, codigo)
  await py.runPythonAsync(PUENTE)
  const analizar = py.globals.get('analizar') as (pedido: string) => string

  enviar({ tipo: 'listo' })
  return analizar
}

ctx.onmessage = async (e: MessageEvent<MensajeAlWorker>) => {
  const m = e.data
  carga ??= cargar()
  try {
    const analizar = await carga
    if (m.tipo !== 'analizar') return
    const pedido = JSON.stringify({ ...m.config, min_prob: minProb(m.config), tablero: m.tablero })
    enviar({ tipo: 'analisis', id: m.id, resultado: JSON.parse(analizar(pedido)) })
  } catch (error) {
    enviar({ tipo: 'error', id: m.tipo === 'analizar' ? m.id : undefined, mensaje: String(error) })
  }
}
