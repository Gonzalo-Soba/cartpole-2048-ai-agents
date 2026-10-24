import { useState } from 'react'
import type { EtapaCarga } from '../agentes/protocolo'
import { AGENTES, EVALUACIONES, PROFUNDIDADES } from '../datos/agentes'
import type { EstadoAgente } from '../hooks/useAgente'
import './PanelControl.css'

const ETAPAS: Record<EtapaCarga, string> = {
  pyodide: 'Paso 1 de 3: Python en el navegador.',
  numpy: 'Paso 2 de 3: numpy.',
  agentes: 'Paso 3 de 3: los agentes.',
}

interface Props {
  estado: EstadoAgente
  onReintentar: () => void
}

/** Controles del agente. Todavía deshabilitados: solo se muestra la carga. */
export function PanelControl({ estado, onReintentar }: Props) {
  const [abierto, setAbierto] = useState(false)
  const conectado = false
  const agente = AGENTES.find((a) => a.id === 'expectimax')!

  return (
    <aside className="panel" aria-labelledby="panel-titulo">
      <h2 id="panel-titulo" className="panel__titulo">
        Controles del agente
      </h2>
      <button
        type="button"
        className="panel__desplegar"
        aria-expanded={abierto}
        aria-controls="panel-cuerpo"
        onClick={() => setAbierto((a) => !a)}
      >
        Controles del agente
        <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
          <path d="M4 6l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      <div id="panel-cuerpo" className="panel__cuerpo" data-abierto={abierto}>
        <div className="panel__aviso" role="status">
          {estado.fase === 'listo' && <p>Agentes listos.</p>}
          {(estado.fase === 'inactivo' || estado.fase === 'cargando') && (
            <>
              <p>Cargando los agentes. Pasa una sola vez y puede tardar unos segundos.</p>
              {estado.fase === 'cargando' && <p>{ETAPAS[estado.etapa]}</p>}
            </>
          )}
          {estado.fase === 'error' && (
            <>
              <p>No se pudieron cargar los agentes. Revisá la conexión y probá de nuevo.</p>
              <p className="panel__detalle">{estado.mensaje}</p>
            </>
          )}
        </div>
        {estado.fase === 'error' && (
          <button type="button" className="boton panel__reintentar" onClick={onReintentar}>
            Reintentar
          </button>
        )}

        <div className="campo">
          <label htmlFor="campo-agente">Agente</label>
          <div className="selector">
            <select id="campo-agente" defaultValue={agente.id} disabled={!conectado} aria-describedby="agente-descripcion">
              {AGENTES.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.nombre}
                </option>
              ))}
            </select>
          </div>
          <p id="agente-descripcion" className="campo__ayuda">
            {agente.descripcion}
          </p>
        </div>

        <fieldset className="campo" disabled={!conectado}>
          <legend>Profundidad</legend>
          <div className="segmentado segmentado--compacto">
            {PROFUNDIDADES.map((p) => (
              <label key={p} className="segmentado__opcion segmentado__radio">
                <input type="radio" name="profundidad" value={p} defaultChecked={p === 2} />
                <span className="cifras">{p}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <div className="campo">
          <label htmlFor="campo-evaluacion">Evaluación</label>
          <div className="selector">
            <select id="campo-evaluacion" defaultValue="balanceada" disabled={!conectado}>
              {EVALUACIONES.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.nombre}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="campo">
          <label htmlFor="campo-velocidad">Velocidad</label>
          <input id="campo-velocidad" type="range" min={1} max={5} defaultValue={3} disabled={!conectado} />
        </div>

        <div className="panel__acciones">
          <button type="button" className="boton boton--principal" disabled={!conectado}>
            Pausar
          </button>
          <button type="button" className="boton" disabled={!conectado}>
            Un paso
          </button>
        </div>

        <section className="panel__seccion" aria-labelledby="ultima-jugada">
          <h3 id="ultima-jugada">Última jugada</h3>
          <p className="campo__ayuda">Sin datos todavía.</p>
        </section>
      </div>
    </aside>
  )
}
