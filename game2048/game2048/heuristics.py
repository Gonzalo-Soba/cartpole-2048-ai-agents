"""Funciones de evaluación para tableros de 2048.

La utilidad de un tablero es una combinación lineal de componentes::

    U = w_smooth * suavidad + w_empty * vacías + w_mono * monotonicidad
        + w_max * log2(ficha máxima) + w_sumsq * Σ ficha² + w_corner * esquina

Componentes (todas sobre exponentes, es decir log2 de las fichas, salvo Σ ficha²):

* **suavidad** (≤ 0): menos la suma de |log2(a) - log2(b)| entre vecinas no vacías.
  Tableros suaves tienen fichas parecidas juntas, fáciles de combinar.
* **vacías**: cantidad de celdas libres. Más espacio = menos riesgo de perder.
* **monotonicidad** (≤ 0): penaliza filas y columnas que no son crecientes ni
  decrecientes. Por eje se toma la dirección con menor penalización.
* **ficha máxima**: log2 de la ficha más grande.
* **Σ ficha²**: "valor del tablero", la heurística clásica más simple. Crece mucho al
  fusionar fichas grandes, así que con peso alto domina a las demás.
* **esquina**: log2 de la ficha máxima si está en una esquina, 0 si no.

Para que la evaluación sea rápida, las componentes que se descomponen por fila
se precomputan para las 65536 filas posibles.
"""

from __future__ import annotations

from dataclasses import asdict, dataclass

from .board import ROW_MASK, transpose


def _row_cells(row: int) -> list[int]:
    return [(row >> (4 * i)) & 0xF for i in range(4)]


def _build_row_features():
    empty, smooth, mono_inc, mono_dec, sumsq, rowmax = ([0.0] * 65536 for _ in range(6))
    for row in range(65536):
        c = _row_cells(row)
        empty[row] = float(sum(1 for x in c if x == 0))
        smooth[row] = -float(sum(abs(c[i] - c[i + 1]) for i in range(3) if c[i] and c[i + 1]))
        # Penalización si la fila NO es creciente (izq -> der) o NO es decreciente.
        mono_inc[row] = float(sum(max(0, c[i] - c[i + 1]) for i in range(3)))
        mono_dec[row] = float(sum(max(0, c[i + 1] - c[i]) for i in range(3)))
        sumsq[row] = float(sum((1 << x) ** 2 for x in c if x))
        rowmax[row] = float(max(c))
    return empty, smooth, mono_inc, mono_dec, sumsq, rowmax


EMPTY, SMOOTH, MONO_INC, MONO_DEC, SUMSQ, ROWMAX = _build_row_features()


@dataclass(frozen=True)
class Weights:
    smooth: float = 0.1
    empty: float = 2.7
    mono: float = 1.0
    max_tile: float = 1.0
    sumsq: float = 0.0
    corner: float = 0.5

    def to_dict(self) -> dict:
        return asdict(self)


# Configuraciones evaluadas en los experimentos.
PRESETS: dict[str, Weights] = {
    # Pesos de la primera versión (Σ ficha² con peso 0.01 domina al resto).
    "original": Weights(smooth=0.1, empty=2.7, mono=1.0, max_tile=1.0, sumsq=0.01, corner=0.5),
    # La misma combinación sin Σ ficha²: las demás componentes pasan a pesar.
    "balanceada": Weights(smooth=0.1, empty=2.7, mono=1.0, max_tile=1.0, sumsq=0.0, corner=0.5),
    "solo_vacias": Weights(smooth=0.0, empty=1.0, mono=0.0, max_tile=0.0, sumsq=0.0, corner=0.0),
    "solo_sumsq": Weights(smooth=0.0, empty=0.0, mono=0.0, max_tile=0.0, sumsq=1.0, corner=0.0),
    "enfasis_vacias": Weights(smooth=0.1, empty=5.0, mono=1.0, max_tile=1.0, sumsq=0.0, corner=0.5),
    "enfasis_mono": Weights(smooth=0.1, empty=2.7, mono=3.0, max_tile=1.0, sumsq=0.0, corner=0.5),
    "mono_y_vacias": Weights(smooth=0.5, empty=4.0, mono=3.0, max_tile=0.0, sumsq=0.0, corner=1.0),
}


class Evaluator:
    """Evalúa tableros con pesos fijos usando tablas por fila."""

    def __init__(self, weights: Weights):
        self.w = weights
        w = weights
        # Componentes que se suman una sola vez por celda: se cuentan en las filas.
        self._row_table = [
            w.empty * EMPTY[r] + w.smooth * SMOOTH[r] + w.sumsq * SUMSQ[r] for r in range(65536)
        ]
        # La suavidad vertical se calcula sobre las filas del tablero traspuesto.
        self._col_table = [w.smooth * SMOOTH[r] for r in range(65536)]
        self.calls = 0

    def __call__(self, b: int) -> float:
        self.calls += 1
        w = self.w
        r0 = b & ROW_MASK
        r1 = (b >> 16) & ROW_MASK
        r2 = (b >> 32) & ROW_MASK
        r3 = (b >> 48) & ROW_MASK
        t = transpose(b)
        c0 = t & ROW_MASK
        c1 = (t >> 16) & ROW_MASK
        c2 = (t >> 32) & ROW_MASK
        c3 = (t >> 48) & ROW_MASK
        rt, ct = self._row_table, self._col_table
        value = rt[r0] + rt[r1] + rt[r2] + rt[r3] + ct[c0] + ct[c1] + ct[c2] + ct[c3]

        if w.mono:
            rows = -min(MONO_INC[r0] + MONO_INC[r1] + MONO_INC[r2] + MONO_INC[r3],
                        MONO_DEC[r0] + MONO_DEC[r1] + MONO_DEC[r2] + MONO_DEC[r3])
            cols = -min(MONO_INC[c0] + MONO_INC[c1] + MONO_INC[c2] + MONO_INC[c3],
                        MONO_DEC[c0] + MONO_DEC[c1] + MONO_DEC[c2] + MONO_DEC[c3])
            value += w.mono * (rows + cols)

        if w.max_tile or w.corner:
            m = max(ROWMAX[r0], ROWMAX[r1], ROWMAX[r2], ROWMAX[r3])
            value += w.max_tile * m
            if w.corner:
                corners = (r0 & 0xF, r0 >> 12, r3 & 0xF, r3 >> 12)
                if m in corners:
                    value += w.corner * m
        return value

    def components(self, b: int) -> dict[str, float]:
        """Valor de cada componente sin ponderar (útil para explicar decisiones)."""
        rows = [(b >> (16 * i)) & ROW_MASK for i in range(4)]
        t = transpose(b)
        cols = [(t >> (16 * i)) & ROW_MASK for i in range(4)]
        m = max(ROWMAX[r] for r in rows)
        return {
            "smooth": sum(SMOOTH[r] for r in rows + cols),
            "empty": sum(EMPTY[r] for r in rows),
            "mono": -min(sum(MONO_INC[r] for r in rows), sum(MONO_DEC[r] for r in rows))
            - min(sum(MONO_INC[c] for c in cols), sum(MONO_DEC[c] for c in cols)),
            "max_tile": m,
            "sumsq": sum(SUMSQ[r] for r in rows),
            "corner": m if m in (rows[0] & 0xF, rows[0] >> 12, rows[3] & 0xF, rows[3] >> 12) else 0.0,
        }
