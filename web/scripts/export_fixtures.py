"""Exporta fixtures del motor de Python para testear el motor de TypeScript.

El motor de la web tiene que dar exactamente los mismos resultados que
``game2048/game2048/board.py``. Este script toma ese módulo tal cual, sin
reescribirlo, y guarda en JSON qué devuelve para un conjunto fijo de tableros.

Uso (desde la raíz del repo):

    cd game2048 && poetry run python ../web/scripts/export_fixtures.py

La salida es determinista: misma semilla, mismo archivo.
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

import numpy as np

RAIZ = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(RAIZ / "game2048"))

from game2048.board import (  # noqa: E402
    MOVE_NAMES,
    MOVES,
    empty_positions,
    legal_moves,
    move,
    move_score,
    spawn_tile,
)

SEMILLA = 2048
SALIDA = RAIZ / "web" / "src" / "motor" / "fixtures.json"


def a_bitboard(exps: list[int]) -> int:
    return sum(e << (4 * i) for i, e in enumerate(exps))


def a_exponentes(b: int) -> list[int]:
    return [(b >> (4 * i)) & 0xF for i in range(16)]


def casos_borde() -> list[list[int]]:
    """Casos donde es fácil equivocarse al reimplementar las reglas."""
    vacio = [0] * 16
    return [
        vacio,
        [1, 1, 1, 1] + [0] * 12,  # se fusiona una vez por ficha: 4 4 0 0
        [1, 1, 2, 2] + [0] * 12,
        [2, 1, 1, 0] + [0] * 12,  # la fusión nueva no se vuelve a fusionar
        [1, 0, 1, 0] + [0] * 12,
        [1, 0, 0, 1, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0],
        [15, 15, 0, 0] + [0] * 12,  # tope del exponente: no se fusiona
        [14, 14, 15, 15] + [0] * 12,
        [1, 2, 1, 2, 2, 1, 2, 1, 1, 2, 1, 2, 2, 1, 2, 1],  # lleno, sin jugadas
        [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 15],
        [1] * 16,
        [11, 10, 9, 8, 4, 5, 6, 7, 3, 2, 1, 0, 0, 0, 0, 0],
    ]


def tableros_aleatorios(rng: np.random.Generator, cantidad: int) -> list[list[int]]:
    """Mezcla tableros sueltos (cualquier densidad) y tableros de partidas reales."""
    tableros = []
    for _ in range(cantidad // 2):
        exps = [0] * 16
        ocupadas = rng.choice(16, size=int(rng.integers(1, 17)), replace=False)
        for i in ocupadas:
            exps[int(i)] = int(rng.integers(1, 12))
        tableros.append(exps)

    b = spawn_tile(spawn_tile(0, rng), rng)
    while len(tableros) < cantidad:
        legales = legal_moves(b)
        if not legales:
            b = spawn_tile(spawn_tile(0, rng), rng)
            continue
        _, b = legales[int(rng.integers(len(legales)))]
        b = spawn_tile(b, rng)
        tableros.append(a_exponentes(b))
    return tableros


def caso(exps: list[int]) -> dict:
    b = a_bitboard(exps)
    return {
        "tablero": exps,
        "movimientos": [
            {"tablero": a_exponentes(move(b, d)), "puntaje": move_score(b, d)} for d in MOVES
        ],
        "legales": [d for d, _ in legal_moves(b)],
        "vacias": empty_positions(b),
    }


def main() -> None:
    rng = np.random.default_rng(SEMILLA)
    casos = [caso(t) for t in casos_borde() + tableros_aleatorios(rng, 200)]
    # Un caso por línea: el archivo se versiona y así los diffs se pueden leer.
    lineas = ",\n    ".join(json.dumps(c, separators=(",", ":")) for c in casos)
    SALIDA.write_text(
        "{\n"
        f'  "generado_por": "web/scripts/export_fixtures.py",\n'
        f'  "semilla": {SEMILLA},\n'
        f'  "direcciones": {json.dumps(list(MOVE_NAMES))},\n'
        f'  "casos": [\n    {lineas}\n  ]\n'
        "}\n",
        encoding="utf-8",
    )
    print(f"{len(casos)} casos en {SALIDA.relative_to(RAIZ)}")


if __name__ == "__main__":
    main()
