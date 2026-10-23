/** Opciones del panel; los `id` coinciden con `make_agent` y `PRESETS` en Python. */

export const AGENTES = [
  { id: 'random', nombre: 'Aleatorio', descripcion: 'Aleatorio: elige al azar entre las jugadas legales.' },
  {
    id: 'minimax_ab',
    nombre: 'Minimax con poda alfa-beta',
    descripcion: 'Minimax: supone que la ficha nueva cae en el peor lugar y poda lo que no cambia la decisión.',
  },
  {
    id: 'expectimax',
    nombre: 'Expectimax',
    descripcion: 'Expectimax: promedia sobre las fichas que pueden aparecer.',
  },
] as const

export const EVALUACIONES = [
  { id: 'balanceada', nombre: 'Balanceada' },
  { id: 'original', nombre: 'Original' },
  { id: 'enfasis_vacias', nombre: 'Énfasis en celdas vacías' },
  { id: 'enfasis_mono', nombre: 'Énfasis en monotonía' },
  { id: 'mono_y_vacias', nombre: 'Monotonía y celdas vacías' },
  { id: 'solo_vacias', nombre: 'Solo celdas vacías' },
  { id: 'solo_sumsq', nombre: 'Solo suma de cuadrados' },
] as const

export const PROFUNDIDADES = [1, 2, 3] as const
