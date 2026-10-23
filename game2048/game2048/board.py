"""Motor de 2048 sobre un *bitboard* de 64 bits.

El tablero se guarda como un entero de 64 bits: 16 celdas de 4 bits cada una.
Cada celda guarda el exponente de la ficha (0 = vacía, 1 = 2, 2 = 4, 11 = 2048).
La fila ``r`` ocupa los bits ``16*r .. 16*r+15`` y la columna ``c`` de esa fila
los bits ``4*c .. 4*c+3`` (columna 0 = izquierda).

Mover una fila es una consulta a una tabla precomputada de 65536 entradas, así
que un movimiento completo cuesta 4 consultas (más una trasposición para
arriba/abajo). Esto reemplaza al ``GameBoard`` anterior basado en numpy +
numba, que clonaba y trasponía matrices en cada nodo del árbol y limitaba la
profundidad de búsqueda.

La clase ``GameBoard`` mantiene la misma interfaz que el tablero de la primera
versión del proyecto (``play``, ``move``, ``clone``, ``get_available_moves``,
``get_available_cells``, ``insert_tile``, ``get_max_tile``, ``render``, ``grid``).
"""

from __future__ import annotations

import numpy as np

# Mismo orden que el GameBoard original.
UP, DOWN, LEFT, RIGHT = range(4)
MOVES = (UP, DOWN, LEFT, RIGHT)
MOVE_NAMES = ("UP", "DOWN", "LEFT", "RIGHT")

PROB_TWO = 0.9  # probabilidad de que aparezca un 2 (si no, un 4)

ROW_MASK = 0xFFFF
COL_MASK = 0x000F_000F_000F_000F


def _unpack_row(row: int) -> list[int]:
    return [(row >> (4 * i)) & 0xF for i in range(4)]


def _pack_row(cells: list[int]) -> int:
    return cells[0] | (cells[1] << 4) | (cells[2] << 8) | (cells[3] << 12)


def _slide_left(cells: list[int]) -> tuple[list[int], int]:
    """Desliza y combina una fila hacia la izquierda. Devuelve (fila, puntaje)."""
    tiles = [c for c in cells if c]
    out: list[int] = []
    score = 0
    i = 0
    while i < len(tiles):
        if i + 1 < len(tiles) and tiles[i] == tiles[i + 1] and tiles[i] < 15:
            merged = tiles[i] + 1
            out.append(merged)
            score += 1 << merged
            i += 2
        else:
            out.append(tiles[i])
            i += 1
    out += [0] * (4 - len(out))
    return out, score


def _reverse_row(row: int) -> int:
    return ((row >> 12) & 0xF) | ((row >> 4) & 0xF0) | ((row << 4) & 0xF00) | ((row << 12) & 0xF000)


def _build_tables() -> tuple[list[int], list[int], list[int]]:
    left = [0] * 65536
    right = [0] * 65536
    score = [0] * 65536
    for row in range(65536):
        cells, sc = _slide_left(_unpack_row(row))
        left[row] = _pack_row(cells)
        score[row] = sc
    for row in range(65536):
        right[row] = _reverse_row(left[_reverse_row(row)])
    return left, right, score


ROW_LEFT, ROW_RIGHT, ROW_SCORE = _build_tables()


def transpose(b: int) -> int:
    """Traspone el tablero (filas <-> columnas) con operaciones de bits."""
    a1 = b & 0xF0F00F0FF0F00F0F
    a2 = b & 0x0000F0F00000F0F0
    a3 = b & 0x0F0F00000F0F0000
    a = a1 | (a2 << 12) | (a3 >> 12)
    b1 = a & 0xFF00FF0000FF00FF
    b2 = a & 0x00FF00FF00000000
    b3 = a & 0x00000000FF00FF00
    return b1 | (b2 >> 24) | (b3 << 24)


def _apply_rows(b: int, table: list[int]) -> int:
    return (
        table[b & ROW_MASK]
        | (table[(b >> 16) & ROW_MASK] << 16)
        | (table[(b >> 32) & ROW_MASK] << 32)
        | (table[(b >> 48) & ROW_MASK] << 48)
    )


def move(b: int, direction: int) -> int:
    """Aplica un movimiento sin agregar ficha nueva."""
    if direction == LEFT:
        return _apply_rows(b, ROW_LEFT)
    if direction == RIGHT:
        return _apply_rows(b, ROW_RIGHT)
    t = transpose(b)
    if direction == UP:
        return transpose(_apply_rows(t, ROW_LEFT))
    return transpose(_apply_rows(t, ROW_RIGHT))


def move_score(b: int, direction: int) -> int:
    """Puntaje obtenido por las fusiones de un movimiento (regla oficial de 2048)."""
    src = b if direction in (LEFT, RIGHT) else transpose(b)
    return sum(ROW_SCORE[(src >> (16 * r)) & ROW_MASK] for r in range(4))


def legal_moves(b: int) -> list[tuple[int, int]]:
    """Lista de (movimiento, tablero resultante) que cambian el tablero."""
    out = []
    t = None
    for d in MOVES:
        if d == LEFT:
            nb = _apply_rows(b, ROW_LEFT)
        elif d == RIGHT:
            nb = _apply_rows(b, ROW_RIGHT)
        else:
            if t is None:
                t = transpose(b)
            nb = transpose(_apply_rows(t, ROW_LEFT if d == UP else ROW_RIGHT))
        if nb != b:
            out.append((d, nb))
    return out


def empty_positions(b: int) -> list[int]:
    """Índices (0..15) de las celdas vacías."""
    return [i for i in range(16) if not (b >> (4 * i)) & 0xF]


def count_empty(b: int) -> int:
    return sum(1 for i in range(16) if not (b >> (4 * i)) & 0xF)


def max_exponent(b: int) -> int:
    return max((b >> (4 * i)) & 0xF for i in range(16))


def to_grid(b: int) -> np.ndarray:
    """Matriz 4x4 con los valores de las fichas (0, 2, 4, 8, ...)."""
    exps = np.array([(b >> (4 * i)) & 0xF for i in range(16)], dtype=np.int64).reshape(4, 4)
    return np.where(exps > 0, 1 << exps, 0)


def from_grid(grid) -> int:
    b = 0
    for i, v in enumerate(np.asarray(grid, dtype=np.int64).reshape(-1)):
        if v:
            b |= int(np.log2(v)) << (4 * i)
    return b


def spawn_tile(b: int, rng: np.random.Generator) -> int:
    empties = empty_positions(b)
    if not empties:
        return b
    pos = empties[int(rng.integers(len(empties)))]
    exp = 1 if rng.random() < PROB_TWO else 2
    return b | (exp << (4 * pos))


class GameBoard:
    """Tablero con la misma interfaz que el de la primera versión."""

    def __init__(self, seed: int | None = None, rng: np.random.Generator | None = None, board: int | None = None):
        self.rng = rng if rng is not None else np.random.default_rng(seed)
        self.score = 0
        if board is None:
            board = spawn_tile(spawn_tile(0, self.rng), self.rng)
        self.board = board

    # --- interfaz original -------------------------------------------------
    @property
    def grid(self) -> np.ndarray:
        return to_grid(self.board)

    def render(self) -> None:
        for row in self.grid:
            print("".join(f"{v:6d}  " for v in row))
        print()

    def clone(self) -> "GameBoard":
        c = GameBoard(rng=self.rng, board=self.board)
        c.score = self.score
        return c

    def insert_tile(self, pos: tuple[int, int], value: int) -> None:
        idx = 4 * pos[0] + pos[1]
        exp = int(np.log2(value))
        self.board = (self.board & ~(0xF << (4 * idx))) | (exp << (4 * idx))

    def get_available_cells(self) -> list[tuple[int, int]]:
        return [divmod(i, 4) for i in empty_positions(self.board)]

    def get_max_tile(self) -> int:
        e = max_exponent(self.board)
        return 1 << e if e else 0

    def get_available_moves(self) -> list[int]:
        return [d for d, _ in legal_moves(self.board)]

    def move(self, direction: int, get_avail_call: bool = False):
        new = move(self.board, direction)
        changed = new != self.board
        self.score += move_score(self.board, direction)
        self.board = new
        return changed if get_avail_call else None

    def play(self, direction: int) -> bool:
        """Mueve, agrega una ficha al azar y devuelve True si el juego terminó."""
        self.move(direction)
        self.board = spawn_tile(self.board, self.rng)
        return not legal_moves(self.board)
