import { useState } from 'react'
import { formatearNumero, medidoresDeLegalidad, medidoresDeValores } from './brujula'
import { Brujula } from './components/Brujula'
import { Cabecera, type Modo } from './components/Cabecera'
import { PanelControl } from './components/PanelControl'
import { PanelPartida } from './components/PanelPartida'
import { Tablero } from './components/Tablero'
import { BRUJULA_EJEMPLO, FICHAS_EJEMPLO } from './datos/ejemplo'
import { usePartida } from './hooks/usePartida'
import { useTeclado } from './hooks/useTeclado'
import { tableroDeFichas } from './motor/fichas'
import { exponenteMaximo, jugadasLegales, valorDeExponente } from './motor/tablero'
import './App.css'

function App() {
  const [modo, setModo] = useState<Modo>('jugar')
  const { partida, jugar, nueva } = usePartida()
  const jugando = modo === 'jugar'
  useTeclado(jugar, jugando)

  const tablero = tableroDeFichas(partida.fichas)
  const fichaMaxima = valorDeExponente(exponenteMaximo(tablero))

  // El texto no cambia hasta la próxima partida, así que se anuncia una sola vez.
  // Por eso queda en el DOM también en modo agente: si se vaciara, se repetiría al volver.
  let estado = ''
  if (partida.terminada) {
    estado = `Sin movimientos. Ficha máxima ${fichaMaxima}, puntaje ${formatearNumero(partida.puntaje)}.`
  } else if (partida.llego2048) {
    estado = 'Llegaste a 2048. Podés seguir jugando.'
  }

  return (
    <div className="pagina">
      <Cabecera modo={modo} onModo={setModo} puntaje={jugando ? partida.puntaje : 0} />
      <main className="escenario">
        <section className="escenario__juego" aria-label="Tablero">
          {jugando ? (
            <Brujula medidores={medidoresDeLegalidad(jugadasLegales(tablero), partida.ultima)} etiqueta="Jugadas posibles">
              <Tablero
                fichas={partida.fichas}
                absorbidas={partida.absorbidas}
                etiqueta={`Tablero, ficha máxima ${fichaMaxima}`}
                onDeslizar={jugar}
              />
            </Brujula>
          ) : (
            <Brujula
              medidores={medidoresDeValores(BRUJULA_EJEMPLO.valores, BRUJULA_EJEMPLO.elegida)}
              etiqueta="Evaluación de cada jugada"
              descripcionId="leyenda-ejemplo"
            >
              <Tablero fichas={FICHAS_EJEMPLO} etiqueta="Tablero de ejemplo, ficha máxima 4096" descripcionId="leyenda-ejemplo" />
            </Brujula>
          )}
          <div className="escenario__estado">
            <p role="status" className={jugando ? 'escenario__mensaje' : 'solo-lectores'}>
              {estado}
            </p>
            {!jugando && (
              <p id="leyenda-ejemplo" className="escenario__leyenda">
                Valores de ejemplo
              </p>
            )}
            {jugando && partida.terminada && (
              <button type="button" className="boton boton--principal" onClick={nueva}>
                Nueva partida
              </button>
            )}
          </div>
        </section>
        {jugando ? <PanelPartida partida={partida} fichaMaxima={fichaMaxima} onNueva={nueva} /> : <PanelControl />}
      </main>
    </div>
  )
}

export default App
