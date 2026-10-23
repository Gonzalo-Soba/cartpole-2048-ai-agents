import type { Partida } from '../motor/partida'
import { formatearNumero } from '../brujula'
import './PanelControl.css'

interface Props {
  partida: Partida
  fichaMaxima: number
  onNueva: () => void
}

/** Panel del modo Jugar: datos de la partida y cómo se juega. */
export function PanelPartida({ partida, fichaMaxima, onNueva }: Props) {
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
        <button type="button" className="boton boton--principal" onClick={onNueva}>
          Nueva partida
        </button>
      </div>
    </aside>
  )
}
