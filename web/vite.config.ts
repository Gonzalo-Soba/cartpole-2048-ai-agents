import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

// GitHub Pages sirve el sitio bajo el nombre del repositorio.
export default defineConfig({
  base: '/cartpole-2048-ai-agents/',
  plugins: [react()],
  test: {
    include: ['src/**/*.test.ts'],
    passWithNoTests: true,
  },
})
