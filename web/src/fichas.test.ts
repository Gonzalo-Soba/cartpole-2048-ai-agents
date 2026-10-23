import { describe, expect, it } from 'vitest'
import { esValorDeFicha, estiloFicha } from './fichas'

describe('estiloFicha', () => {
  it('usa el token de la rampa hasta 2048 y tmax después', () => {
    expect(estiloFicha(2).fondo).toBe('var(--t2)')
    expect(estiloFicha(1024).fondo).toBe('var(--t1024)')
    expect(estiloFicha(2048).fondo).toBe('var(--t2048)')
    expect(estiloFicha(4096).fondo).toBe('var(--tmax)')
    expect(estiloFicha(65536).fondo).toBe('var(--tmax)')
  })

  it('elige el color del texto por contraste', () => {
    const oscuras = [2, 4, 8, 16, 32, 2048, 4096]
    const claras = [64, 128, 256, 512, 1024]
    for (const v of oscuras) expect(estiloFicha(v).texto).toBe('var(--ficha-oscura)')
    for (const v of claras) expect(estiloFicha(v).texto).toBe('var(--ficha-clara)')
  })

  it('condensa el ancho según la cantidad de dígitos', () => {
    expect(estiloFicha(2)).toMatchObject({ wdth: 112, peso: 800, cuerpo: 'normal' })
    expect(estiloFicha(64)).toMatchObject({ wdth: 104, cuerpo: 'normal' })
    expect(estiloFicha(128)).toMatchObject({ wdth: 95, cuerpo: 'normal' })
    expect(estiloFicha(2048)).toMatchObject({ wdth: 72, cuerpo: 'normal' })
    expect(estiloFicha(16384)).toMatchObject({ wdth: 62, cuerpo: 'reducido' })
  })

  it('rechaza valores que no son fichas', () => {
    for (const v of [0, 1, 3, 6, -2, 2.5]) {
      expect(esValorDeFicha(v)).toBe(false)
      expect(() => estiloFicha(v)).toThrow(RangeError)
    }
  })
})
