import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

// GitHub Pages sirve el sitio bajo el nombre del repositorio.
export default defineConfig({
  base: '/cartpole-2048-ai-agents/',
  plugins: [react()],
  // El worker importa los .py de game2048/, que está fuera de web/.
  server: {
    fs: { allow: ['..'] },
  },
  // Módulo ES: el worker carga Pyodide con import() dinámico.
  worker: {
    format: 'es',
  },
  test: {
    include: ['src/**/*.test.ts'],
    passWithNoTests: true,
  },
})
