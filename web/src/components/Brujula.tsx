import type { CSSProperties, ReactNode } from 'react'
import { DIRECCIONES, type Direccion, type Medidor } from '../brujula'
import './Brujula.css'

const ROTULOS: Record<Direccion, { largo: string; corto: string }> = {
  arriba: { largo: 'Arriba', corto: 'Arriba' },
  abajo: { largo: 'Abajo', corto: 'Abajo' },
  izquierda: { largo: 'Izquierda', corto: 'Izq.' },
  derecha: { largo: 'Derecha', corto: 'Der.' },
}

interface Props {
  medidores: Record<Direccion, Medidor>
  etiqueta: string
  descripcionId?: string
  children: ReactNode
}

/** Medidores en los 4 lados del tablero, uno por jugada. */
export function Brujula({ medidores, etiqueta, descripcionId, children }: Props) {
  return (
    <div className="brujula" role="group" aria-label={etiqueta} aria-describedby={descripcionId}>
      {DIRECCIONES.map((d) => {
        const m = medidores[d]
        const { largo, corto } = ROTULOS[d]
        return (
          <div key={d} className={`medidor medidor--${d}`} data-estado={m.estado} role="group" aria-label={m.etiqueta}>
            <span className="medidor__rotulo" aria-hidden="true">
              <span className="medidor__largo">{largo}</span>
              <span className="medidor__corto">{corto}</span>
            </span>
            <span className="medidor__valor" aria-hidden="true">
              {m.texto}
            </span>
            <span className="medidor__barra" aria-hidden="true">
              <span className="medidor__relleno" style={{ '--relleno': m.relleno } as CSSProperties} />
            </span>
          </div>
        )
      })}
      <div className="brujula__centro">{children}</div>
    </div>
  )
}
