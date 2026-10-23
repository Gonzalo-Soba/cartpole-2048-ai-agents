import { useEffect } from 'react'
import type { Direccion } from '../motor/tablero'

const TECLAS: Record<string, Direccion> = {
  ArrowUp: 'arriba',
  ArrowDown: 'abajo',
  ArrowLeft: 'izquierda',
  ArrowRight: 'derecha',
  w: 'arriba',
  s: 'abajo',
  a: 'izquierda',
  d: 'derecha',
}

/** Flechas y WASD en toda la página, salvo mientras se usa un control de formulario. */
export function useTeclado(onJugada: (direccion: Direccion) => void, activo: boolean) {
  useEffect(() => {
    if (!activo) return
    function alPresionar(e: KeyboardEvent) {
      if (e.ctrlKey || e.metaKey || e.altKey) return
      const destino = e.target as HTMLElement | null
      if (destino?.closest('input, select, textarea, [contenteditable="true"]')) return
      const direccion = TECLAS[e.key.length === 1 ? e.key.toLowerCase() : e.key]
      if (!direccion) return
      e.preventDefault() // que las flechas no hagan scroll
      onJugada(direccion)
    }
    window.addEventListener('keydown', alPresionar)
    return () => window.removeEventListener('keydown', alPresionar)
  }, [onJugada, activo])
}
