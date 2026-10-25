import type { Analisis } from '../agentes/protocolo'
import { NOMBRES, formatearNumero } from '../brujula'
import type { EstadoAgente } from '../hooks/useAgente'
import type { Partida } from '../motor/partida'
import './PanelControl.css'

interface Props {
  partida: Partida
  fichaMaxima: number
  onNueva: () => void
  estadoAgente: EstadoAgente
  pista: boolean
  onPista: () => void
  analisisPista: Analisis | null
}

function textoPista(estado: EstadoAgente, pista: boolean, analisis: Analisis | null): string {
  if (estado.fase === 'error') return 'La pista no está disponible: no se pudieron cargar los agentes.'
  if (estado.fase !== 'listo') return 'La pista se habilita cuando terminan de cargar los agentes.'
  if (!pista) return 'Muestra lo que haría Expectimax con profundidad 2.'
  if (!analisis) return 'Calculando la pista.'
  return analisis.elegida ? `Pista: ${NOMBRES[analisis.elegida]}.` : 'Sin jugadas posibles.'
}

/** Panel del modo Jugar: datos de la partida, cómo se juega y la pista. */
export function PanelPartida({ partida, fichaMaxima, onNueva, estadoAgente, pista, onPista, analisisPista }: Props) {
  return (
    <aside className="panel" aria-labelledby="partida-titulo">
      <h2 id="partida-titulo" className="panel__titulo panel__titulo--siempre">
        Partida
      </h2>
      <div className="panel__cuerpo">
        <p className="campo__ayuda">Flechas o WASD. En el celular, deslizá sobre el tablero.</p>
        <dl className="panel__datos">
          <div>
            <dt>Movimientos</dt>
            <dd className="cifras">{formatearNumero(partida.movimientos)}</dd>
          </div>
          <div>
            <dt>Ficha máxima</dt>
            <dd className="cifras">{fichaMaxima}</dd>
          </div>
        </dl>
        <div className="panel__acciones">
          <button type="button" className="boton boton--principal" onClick={onNueva}>
            Nueva partida
          </button>
          {/* Botón y no checkbox: con el foco en un input, las flechas no juegan. */}
          <button
            type="button"
            className="boton boton--alternar"
            aria-pressed={pista}
            aria-describedby="pista-texto"
            disabled={estadoAgente.fase !== 'listo'}
            onClick={onPista}
          >
            Mostrar pista
          </button>
        </div>
        <p id="pista-texto" className="campo__ayuda" aria-live="polite">
          {textoPista(estadoAgente, pista, analisisPista)}
        </p>
      </div>
    </aside>
  )
}
