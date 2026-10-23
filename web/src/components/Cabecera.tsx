import { formatearNumero } from '../brujula'
import './Cabecera.css'

export type Modo = 'jugar' | 'agente'

const MODOS: { id: Modo; nombre: string }[] = [
  { id: 'jugar', nombre: 'Jugar' },
  { id: 'agente', nombre: 'Ver al agente' },
]

interface Props {
  modo: Modo
  onModo: (modo: Modo) => void
  puntaje: number
}

export function Cabecera({ modo, onModo, puntaje }: Props) {
  return (
    <header className="cabecera">
      <div className="cabecera__titulo">
        <h1>2048 con agentes</h1>
        <p>Minimax y Expectimax deciden en vivo. También podés jugar vos.</p>
      </div>
      <div className="segmentado cabecera__modo" role="group" aria-label="Modo">
        {MODOS.map((m) => (
          <button
            key={m.id}
            type="button"
            className="segmentado__opcion"
            aria-pressed={modo === m.id}
            onClick={() => onModo(m.id)}
          >
            {m.nombre}
          </button>
        ))}
      </div>
      <p className="cabecera__puntaje">
        <span>Puntaje</span>
        <span className="cabecera__cifra cifras">{formatearNumero(puntaje)}</span>
      </p>
    </header>
  )
}
