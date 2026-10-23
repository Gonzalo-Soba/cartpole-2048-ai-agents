import type { CSSProperties } from 'react'
import { estiloFicha } from '../fichas'
import './Tablero.css'

interface Props {
  /** 16 celdas por filas; 0 es una celda vacía. */
  celdas: readonly number[]
  etiqueta: string
  descripcionId?: string
}

export function Tablero({ celdas, etiqueta, descripcionId }: Props) {
  const filas = [0, 1, 2, 3].map((f) => celdas.slice(f * 4, f * 4 + 4))
  return (
    <div className="tablero">
      <div role="grid" aria-label={etiqueta} aria-describedby={descripcionId} className="tablero__grilla">
        {filas.map((fila, f) => (
          <div role="row" className="tablero__fila" key={f}>
            {fila.map((valor, c) => (
              <div role="gridcell" className="celda" key={c} aria-label={valor ? undefined : 'vacía'}>
                {valor > 0 && <Ficha valor={valor} />}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

function Ficha({ valor }: { valor: number }) {
  const e = estiloFicha(valor)
  const estilo = {
    '--ficha-fondo': e.fondo,
    '--ficha-texto': e.texto,
    '--ficha-wdth': e.wdth,
    '--ficha-peso': e.peso,
  } as CSSProperties
  return (
    <span className="ficha" data-cuerpo={e.cuerpo} style={estilo}>
      {valor}
    </span>
  )
}
