import type { CSSProperties, ReactNode } from 'react'
import { DIRECCIONES, formatearNumero, rellenoBrujula, type Direccion, type ValoresBrujula } from '../brujula'
import './Brujula.css'

const ROTULOS: Record<Direccion, { largo: string; corto: string }> = {
  arriba: { largo: 'Arriba', corto: 'Arriba' },
  abajo: { largo: 'Abajo', corto: 'Abajo' },
  izquierda: { largo: 'Izquierda', corto: 'Izq.' },
  derecha: { largo: 'Derecha', corto: 'Der.' },
}

interface Props {
  valores: ValoresBrujula
  elegida: Direccion
  descripcionId?: string
  children: ReactNode
}

/** Medidores en los 4 lados del tablero con el valor de cada jugada. */
export function Brujula({ valores, elegida, descripcionId, children }: Props) {
  const relleno = rellenoBrujula(valores)
  return (
    <div className="brujula" role="group" aria-label="Evaluación de cada jugada" aria-describedby={descripcionId}>
      {DIRECCIONES.map((d) => {
        const valor = valores[d]
        const estado = valor === null ? 'ilegal' : d === elegida ? 'elegida' : 'legal'
        const texto = valor === null ? 'ilegal' : formatearNumero(valor)
        const { largo, corto } = ROTULOS[d]
        return (
          <div
            key={d}
            className={`medidor medidor--${d}`}
            data-estado={estado}
            role="group"
            aria-label={`${largo}: ${texto}${estado === 'elegida' ? ', jugada elegida' : ''}`}
          >
            <span className="medidor__rotulo" aria-hidden="true">
              <span className="medidor__largo">{largo}</span>
              <span className="medidor__corto">{corto}</span>
            </span>
            <span className="medidor__valor" aria-hidden="true">
              {texto}
            </span>
            <span className="medidor__barra" aria-hidden="true">
              <span className="medidor__relleno" style={{ '--relleno': relleno[d] } as CSSProperties} />
            </span>
          </div>
        )
      })}
      <div className="brujula__centro">{children}</div>
    </div>
  )
}
