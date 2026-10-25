import { useState } from 'react'
import type { ConfigAgente, EtapaCarga, IdAgente } from '../agentes/protocolo'
import { NOMBRES, formatearMs, formatearNumero } from '../brujula'
import { AGENTES, EVALUACIONES, PROFUNDIDADES } from '../datos/agentes'
import type { EstadoAgente } from '../hooks/useAgente'
import { VELOCIDADES, type UltimoAnalisis } from '../hooks/useAgenteJugando'
import './PanelControl.css'

const ETAPAS: Record<EtapaCarga, string> = {
  pyodide: 'Paso 1 de 3: Python en el navegador.',
  numpy: 'Paso 2 de 3: numpy.',
  agentes: 'Paso 3 de 3: los agentes.',
}

interface Props {
  estado: EstadoAgente
  onReintentar: () => void
  config: ConfigAgente
  onConfig: (config: ConfigAgente) => void
  velocidad: number
  onVelocidad: (velocidad: number) => void
  corriendo: boolean
  pensando: boolean
  terminada: boolean
  ultimo: UltimoAnalisis | null
  movimientos: number
  fichaMaxima: number
  onAlternar: () => void
  onPaso: () => void
  onNueva: () => void
}

function textoUltimo(ultimo: UltimoAnalisis | null): string {
  if (!ultimo) return 'Sin datos todavía.'
  const { analisis, config } = ultimo
  if (!analisis.elegida) return 'Sin jugadas posibles.'
  const nombre = NOMBRES[analisis.elegida]
  if (config.agente === 'random') return `${nombre}, al azar.`
  return `${nombre}. ${formatearNumero(analisis.nodos)} nodos en ${formatearMs(analisis.ms)} ms.`
}

/** Controles del agente y lo que decidió en la última jugada. */
export function PanelControl(props: Props) {
  const { estado, config, onConfig, velocidad, corriendo, pensando, terminada, ultimo } = props
  const [abierto, setAbierto] = useState(false)
  const listo = estado.fase === 'listo'
  const agente = AGENTES.find((a) => a.id === config.agente)!
  const sinBusqueda = config.agente === 'random'

  return (
    <aside className="panel" aria-labelledby="panel-titulo">
      <h2 id="panel-titulo" className="panel__titulo panel__titulo--siempre">
        Controles del agente
      </h2>

      <div className="panel__cuerpo">
        {/* Listo: el aviso solo se anuncia, no ocupa lugar. */}
        <div className={listo ? 'solo-lectores' : 'panel__aviso'} role="status">
          {listo && <p>Agentes listos.</p>}
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
          <button type="button" className="boton panel__reintentar" onClick={props.onReintentar}>
            Reintentar
          </button>
        )}

        {/* En móvil la configuración se pliega; los botones quedan siempre a la vista. */}
        <div className="panel__config">
          <button
            type="button"
            className="panel__desplegar panel__desplegar--chico"
            aria-expanded={abierto}
            aria-controls="panel-config"
            onClick={() => setAbierto((a) => !a)}
          >
            Configuración
            <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
              <path d="M4 6l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>

          <div id="panel-config" className="panel__cuerpo panel__plegable" data-abierto={abierto}>
            <div className="campo">
              <label htmlFor="campo-agente">Agente</label>
              <div className="selector">
                <select
                  id="campo-agente"
                  value={config.agente}
                  disabled={!listo}
                  aria-describedby="agente-descripcion"
                  onChange={(e) => onConfig({ ...config, agente: e.target.value as IdAgente })}
                >
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

            <fieldset className="campo" disabled={!listo || sinBusqueda}>
              <legend>Profundidad</legend>
              <div className="segmentado segmentado--compacto">
                {PROFUNDIDADES.map((p) => (
                  <label key={p} className="segmentado__opcion segmentado__radio">
                    <input
                      type="radio"
                      name="profundidad"
                      value={p}
                      checked={config.profundidad === p}
                      onChange={() => onConfig({ ...config, profundidad: p })}
                    />
                    <span className="cifras">{p}</span>
                  </label>
                ))}
              </div>
            </fieldset>

            <div className="campo">
              <label htmlFor="campo-evaluacion">Evaluación</label>
              <div className="selector">
                <select
                  id="campo-evaluacion"
                  value={config.evaluacion}
                  disabled={!listo || sinBusqueda}
                  onChange={(e) => onConfig({ ...config, evaluacion: e.target.value })}
                >
                  {EVALUACIONES.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.nombre}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="campo">
              <label htmlFor="campo-velocidad">
                Velocidad <span className="campo__valor">{VELOCIDADES[velocidad].nombre}</span>
              </label>
              <input
                id="campo-velocidad"
                type="range"
                min={0}
                max={VELOCIDADES.length - 1}
                value={velocidad}
                aria-valuetext={VELOCIDADES[velocidad].nombre}
                onChange={(e) => props.onVelocidad(Number(e.target.value))}
              />
            </div>
          </div>
        </div>

        <div className="panel__acciones">
          <button type="button" className="boton boton--principal" disabled={!listo || terminada} onClick={props.onAlternar}>
            {corriendo ? 'Pausar' : 'Iniciar'}
          </button>
          <button type="button" className="boton" disabled={!listo || corriendo || pensando || terminada} onClick={props.onPaso}>
            Un paso
          </button>
          <button type="button" className="boton panel__ancho" onClick={props.onNueva}>
            Nueva partida
          </button>
        </div>

        <section className="panel__seccion" aria-labelledby="ultima-jugada">
          <h3 id="ultima-jugada">Última jugada</h3>
          <p className="campo__ayuda" aria-live="polite">
            {textoUltimo(ultimo)}
          </p>
          <dl className="panel__datos">
            <div>
              <dt>Movimientos</dt>
              <dd className="cifras">{formatearNumero(props.movimientos)}</dd>
            </div>
            <div>
              <dt>Ficha máxima</dt>
              <dd className="cifras">{props.fichaMaxima}</dd>
            </div>
          </dl>
        </section>
      </div>
    </aside>
  )
}
