import { useState } from 'react'
import { Brujula } from './components/Brujula'
import { Cabecera, type Modo } from './components/Cabecera'
import { PanelControl } from './components/PanelControl'
import { Tablero } from './components/Tablero'
import { BRUJULA_EJEMPLO, TABLERO_EJEMPLO } from './datos/ejemplo'
import './App.css'

function App() {
  // El modo todavía no cambia nada más que el selector.
  const [modo, setModo] = useState<Modo>('jugar')

  return (
    <div className="pagina">
      <Cabecera modo={modo} onModo={setModo} puntaje={0} />
      <main className="escenario">
        <section className="escenario__juego" aria-label="Tablero">
          <Brujula
            valores={BRUJULA_EJEMPLO.valores}
            elegida={BRUJULA_EJEMPLO.elegida}
            descripcionId="leyenda-ejemplo"
          >
            <Tablero
              celdas={TABLERO_EJEMPLO}
              etiqueta="Tablero de ejemplo, ficha máxima 4096"
              descripcionId="leyenda-ejemplo"
            />
          </Brujula>
          <p id="leyenda-ejemplo" className="escenario__leyenda">
            Valores de ejemplo
          </p>
        </section>
        <PanelControl />
      </main>
    </div>
  )
}

export default App
