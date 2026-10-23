import numpy as np
import pytest

from game2048.board import (
    DOWN, LEFT, MOVES, RIGHT, UP, GameBoard, from_grid, legal_moves, move, move_score, to_grid, transpose,
)


def reference_move(grid: np.ndarray, direction: int) -> tuple[np.ndarray, int]:
    """Implementación directa (y lenta) de las reglas de 2048 para comparar."""
    g = grid.copy()
    # Llevamos todo a "mover a la izquierda".
    if direction == RIGHT:
        g = g[:, ::-1]
    elif direction == UP:
        g = g.T
    elif direction == DOWN:
        g = g.T[:, ::-1]
    out = np.zeros_like(g)
    score = 0
    for i in range(4):
        tiles = [x for x in g[i] if x]
        row = []
        j = 0
        while j < len(tiles):
            if j + 1 < len(tiles) and tiles[j] == tiles[j + 1]:
                row.append(tiles[j] * 2)
                score += tiles[j] * 2
                j += 2
            else:
                row.append(tiles[j])
                j += 1
        out[i, : len(row)] = row
    if direction == RIGHT:
        out = out[:, ::-1]
    elif direction == UP:
        out = out.T
    elif direction == DOWN:
        out = out[:, ::-1].T
    return out, score


def random_grid(rng: np.random.Generator) -> np.ndarray:
    exps = rng.integers(0, 8, size=(4, 4))
    exps[rng.random((4, 4)) < 0.3] = 0
    return np.where(exps > 0, 1 << exps, 0)


def test_grid_roundtrip():
    rng = np.random.default_rng(0)
    for _ in range(200):
        g = random_grid(rng)
        assert (to_grid(from_grid(g)) == g).all()


def test_transpose():
    rng = np.random.default_rng(1)
    for _ in range(200):
        g = random_grid(rng)
        assert (to_grid(transpose(from_grid(g))) == g.T).all()


@pytest.mark.parametrize("direction", MOVES)
def test_moves_match_reference(direction):
    rng = np.random.default_rng(2)
    for _ in range(500):
        g = random_grid(rng)
        expected, expected_score = reference_move(g, direction)
        b = from_grid(g)
        assert (to_grid(move(b, direction)) == expected).all()
        assert move_score(b, direction) == expected_score


def test_known_example():
    # Ejemplo del docstring original: solo se puede mover a la izquierda.
    g = np.array([[0, 0, 0, 2], [0, 0, 0, 4], [0, 0, 0, 2], [0, 0, 0, 4]])
    assert [d for d, _ in legal_moves(from_grid(g))] == [LEFT]


def test_merge_only_once_per_move():
    g = np.array([[2, 2, 4, 8], [0] * 4, [0] * 4, [0] * 4])
    out = to_grid(move(from_grid(g), LEFT))
    assert out[0].tolist() == [4, 4, 8, 0]


def test_gameboard_interface():
    board = GameBoard(seed=0)
    assert len(board.get_available_cells()) == 14
    clone = board.clone()
    clone.insert_tile((0, 0), 1024)
    assert board.get_max_tile() < 1024 and clone.get_max_tile() == 1024
    done = board.play(board.get_available_moves()[0])
    assert done is False
