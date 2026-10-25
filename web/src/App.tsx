import { useEffect, useState } from 'react'
import { formatearNumero, medidoresDeAnalisis, medidoresDeLegalidad, medidoresDeValores } from './brujula'
import { Brujula } from './components/Brujula'
import { Cabecera, type Modo } from './components/Cabecera'
import { PanelControl } from './components/PanelControl'
import { PanelPartida } from './components/PanelPartida'
import { Tablero } from './components/Tablero'
import { useAgente } from './hooks/useAgente'
import { useAgenteJugando } from './hooks/useAgenteJugando'
import { usePartida } from './hooks/usePartida'
import { usePista } from './hooks/usePista'
import { useTeclado } from './hooks/useTeclado'
import { tableroDeFichas } from './motor/fichas'
import type { Partida } from './motor/partida'
import { exponenteMaximo, jugadasLegales, valorDeExponente } from './motor/tablero'
import './App.css'

function fichaMaximaDe(partida: Partida): number {
  return valorDeExponente(exponenteMaximo(tableroDeFichas(partida.fichas)))
}

/**
 * Texto de estado de una partida. No cambia hasta la próxima partida, así que
 * se anuncia una sola vez; por eso cada modo tiene el suyo siempre en el DOM.
 */
function textoEstado(partida: Partida, aviso2048: string): string {
  if (partida.terminada) {
    return `Sin movimientos. Ficha máxima ${fichaMaximaDe(partida)}, puntaje ${formatearNumero(partida.puntaje)}.`
  }
  return partida.llego2048 ? aviso2048 : ''
}

function App() {
  const [modo, setModo] = useState<Modo>('jugar')
  const jugando = modo === 'jugar'

  const persona = usePartida()
  useTeclado(persona.jugar, jugando)

  const agente = useAgente()
  const { iniciar } = agente
  const deAgente = usePartida()
  const bucle = useAgenteJugando({
    partida: deAgente.partida,
    jugar: deAgente.jugar,
    nueva: deAgente.nueva,
    analizar: agente.analizar,
    listo: agente.estado.fase === 'listo',
  })

  // Pyodide pesa: se carga en segundo plano recién cuando la página terminó de
  // cargar y queda ociosa, sin competir con el modo Jugar. Entrar al modo agente
  // la arranca antes.
  useEffect(() => {
    let cancelar = () => {}
    const programar = () => {
      if ('requestIdleCallback' in window) {
        const id = requestIdleCallback(iniciar, { timeout: 3000 })
        cancelar = () => cancelIdleCallback(id)
      } else {
        const id = setTimeout(iniciar, 1500)
        cancelar = () => clearTimeout(id)
      }
    }
    if (document.readyState === 'complete') programar()
    else window.addEventListener('load', programar, { once: true })
    return () => {
      window.removeEventListener('load', programar)
      cancelar()
    }
  }, [iniciar])

  const [pista, setPista] = useState(false)
  const analisisPista = usePista({
    tablero: tableroDeFichas(persona.partida.fichas),
    activa: pista && jugando,
    listo: agente.estado.fase === 'listo',
    analizar: agente.analizar,
  })

  function cambiarModo(m: Modo) {
    if (m === 'jugar') bucle.pausar()
    else iniciar()
    setModo(m)
  }

  const partida = jugando ? persona.partida : deAgente.partida
  const tablero = tableroDeFichas(partida.fichas)
  const fichaMaxima = fichaMaximaDe(partida)

  return (
    <div className="pagina">
      <Cabecera modo={modo} onModo={cambiarModo} puntaje={partida.puntaje} />
      <main className="escenario">
        <section className="escenario__juego" aria-label="Tablero">
          {jugando ? (
            <Brujula
              medidores={
                analisisPista?.elegida
                  ? medidoresDeValores(analisisPista.valores, analisisPista.elegida)
                  : // Con la pista activa, el ámbar queda para la sugerencia: así no parpadea mientras calcula.
                    medidoresDeLegalidad(jugadasLegales(tablero), pista ? null : partida.ultima)
              }
              etiqueta={analisisPista ? 'Pista: evaluación de cada jugada' : 'Jugadas posibles'}
            >
              <Tablero
                key="persona"
                fichas={partida.fichas}
                absorbidas={partida.absorbidas}
                etiqueta={`Tablero, ficha máxima ${fichaMaxima}`}
                onDeslizar={persona.jugar}
              />
            </Brujula>
          ) : (
            <Brujula medidores={medidoresDeAnalisis(bucle.ultimo, tablero)} etiqueta="Evaluación de cada jugada">
              <Tablero
                key="agente"
                fichas={partida.fichas}
                absorbidas={partida.absorbidas}
                etiqueta={`Tablero del agente, ficha máxima ${fichaMaxima}`}
              />
            </Brujula>
          )}
          <div className="escenario__estado">
            <p role="status" className={jugando ? 'escenario__mensaje' : 'solo-lectores'}>
              {textoEstado(persona.partida, 'Llegaste a 2048. Podés seguir jugando.')}
            </p>
            <p role="status" className={jugando ? 'solo-lectores' : 'escenario__mensaje'}>
              {textoEstado(deAgente.partida, 'El agente llegó a 2048 y sigue jugando.')}
            </p>
            {partida.terminada && (
              <button type="button" className="boton boton--principal" onClick={jugando ? persona.nueva : bucle.nueva}>
                Nueva partida
              </button>
            )}
          </div>
        </section>
        {jugando ? (
          <PanelPartida
            partida={partida}
            fichaMaxima={fichaMaxima}
            onNueva={persona.nueva}
            estadoAgente={agente.estado}
            pista={pista}
            onPista={() => setPista((p) => !p)}
            analisisPista={analisisPista}
          />
        ) : (
          <PanelControl
            estado={agente.estado}
            onReintentar={agente.reintentar}
            config={bucle.config}
            onConfig={bucle.setConfig}
            velocidad={bucle.velocidad}
            onVelocidad={bucle.setVelocidad}
            corriendo={bucle.corriendo}
            pensando={bucle.pensando}
            terminada={partida.terminada}
            ultimo={bucle.ultimo}
            movimientos={partida.movimientos}
            fichaMaxima={fichaMaxima}
            onAlternar={bucle.alternar}
            onPaso={bucle.paso}
            onNueva={bucle.nueva}
          />
        )}
      </main>
      <footer className="pie">
        <p>
          Los agentes son el código Python del proyecto, corriendo en el navegador con Pyodide.{' '}
          <a href="https://github.com/Gonzalo-Soba/cartpole-2048-ai-agents">Código y experimentos en GitHub</a>.
        </p>
      </footer>
    </div>
  )
}

export default App
