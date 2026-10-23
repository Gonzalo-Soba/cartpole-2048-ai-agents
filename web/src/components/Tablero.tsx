import { useRef, type CSSProperties, type PointerEvent } from 'react'
import { estiloFicha } from '../fichas'
import type { Ficha, FichaVisible } from '../motor/fichas'
import { tableroDeFichas } from '../motor/fichas'
import { valorDeExponente, type Direccion } from '../motor/tablero'
import './Tablero.css'

// Distancia mínima en px para que un arrastre cuente como jugada.
const UMBRAL_SWIPE = 24

interface Props {
  fichas: readonly FichaVisible[]
  /** Fichas que se fusionaron en la última jugada; se deslizan y desaparecen. */
  absorbidas?: readonly Ficha[]
  etiqueta: string
  descripcionId?: string
  /** Si está, el tablero acepta swipes y no hace scroll de la página al tocarlo. */
  onDeslizar?: (direccion: Direccion) => void
}

export function Tablero({ fichas, absorbidas = [], etiqueta, descripcionId, onDeslizar }: Props) {
  const inicio = useRef<{ x: number; y: number; id: number } | null>(null)
  const tablero = tableroDeFichas(fichas)

  function alApoyar(e: PointerEvent<HTMLDivElement>) {
    if (!e.isPrimary) return
    inicio.current = { x: e.clientX, y: e.clientY, id: e.pointerId }
    e.currentTarget.setPointerCapture(e.pointerId)
  }

  function alSoltar(e: PointerEvent<HTMLDivElement>) {
    const i = inicio.current
    inicio.current = null
    if (!i || i.id !== e.pointerId || !onDeslizar) return
    const dx = e.clientX - i.x
    const dy = e.clientY - i.y
    if (Math.max(Math.abs(dx), Math.abs(dy)) < UMBRAL_SWIPE) return
    if (Math.abs(dx) > Math.abs(dy)) onDeslizar(dx > 0 ? 'derecha' : 'izquierda')
    else onDeslizar(dy > 0 ? 'abajo' : 'arriba')
  }

  const tactil = onDeslizar
    ? { onPointerDown: alApoyar, onPointerUp: alSoltar, onPointerCancel: () => (inicio.current = null) }
    : {}

  return (
    <div className={onDeslizar ? 'tablero tablero--tactil' : 'tablero'} {...tactil}>
      <div role="grid" aria-label={etiqueta} aria-describedby={descripcionId} className="tablero__grilla">
        {[0, 1, 2, 3].map((f) => (
          <div role="row" className="tablero__fila" key={f}>
            {[0, 1, 2, 3].map((c) => {
              const valor = valorDeExponente(tablero[4 * f + c])
              return (
                <div role="gridcell" className="celda" key={c}>
                  <span className="solo-lectores">{valor || 'vacía'}</span>
                </div>
              )
            })}
          </div>
        ))}
      </div>
      {/* Capa visual: las fichas se posicionan por transform para poder deslizarse. */}
      <div className="tablero__capa" aria-hidden="true">
        {absorbidas.map((f) => (
          <FichaDibujada key={f.id} ficha={f} animacion="absorbida" />
        ))}
        {fichas.map((f) => (
          <FichaDibujada key={f.id} ficha={f} animacion={f.animacion} />
        ))}
      </div>
    </div>
  )
}

function FichaDibujada({ ficha, animacion }: { ficha: Ficha; animacion: string }) {
  const valor = valorDeExponente(ficha.exponente)
  const e = estiloFicha(valor)
  const estilo = {
    '--fila': Math.floor(ficha.indice / 4),
    '--col': ficha.indice % 4,
    '--ficha-fondo': e.fondo,
    '--ficha-texto': e.texto,
    '--ficha-wdth': e.wdth,
    '--ficha-peso': e.peso,
  } as CSSProperties
  return (
    <span className="ficha" data-cuerpo={e.cuerpo} data-animacion={animacion} style={estilo}>
      {valor}
    </span>
  )
}
