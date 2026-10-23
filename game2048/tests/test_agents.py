import json

import numpy as np

from game2048 import ExpectimaxAgent, MinimaxAgent, RandomAgent, play_game, summarize
from game2048.board import from_grid, legal_moves, spawn_tile
from game2048.heuristics import PRESETS, Evaluator, Weights


def random_midgame_boards(n: int, seed: int = 0) -> list[int]:
    """Tableros alcanzables jugando al azar unas decenas de movimientos."""
    rng = np.random.default_rng(seed)
    boards = []
    while len(boards) < n:
        b = spawn_tile(spawn_tile(0, rng), rng)
        for _ in range(int(rng.integers(10, 60))):
            moves = legal_moves(b)
            if not moves:
                break
            b = spawn_tile(moves[int(rng.integers(len(moves)))][1], rng)
        if legal_moves(b):
            boards.append(b)
    return boards


def test_alpha_beta_matches_plain_minimax():
    """La poda alpha-beta debe dar exactamente la misma decisión y el mismo valor."""
    plain = MinimaxAgent(depth=2, use_alpha_beta=False)
    pruned = MinimaxAgent(depth=2, use_alpha_beta=True)
    for b in random_midgame_boards(30):
        for d, nb in legal_moves(b):
            v_plain = plain._min(nb, 2)
            v_ab = pruned._min_ab(nb, 2, float("-inf"), float("inf"))
            assert abs(v_plain - v_ab) < 1e-9
        assert plain.choose(b) == pruned.choose(b)
    assert pruned.nodes_explored < plain.nodes_explored


def test_minimax_is_pessimistic_vs_expectimax():
    """El valor minimax de un nodo de azar nunca supera al valor esperado."""
    mm = MinimaxAgent(depth=1, use_alpha_beta=False)
    em = ExpectimaxAgent(depth=1)
    for b in random_midgame_boards(20, seed=3):
        for _, nb in legal_moves(b):
            assert mm._min(nb, 1) <= em._chance(nb, 1, 1.0) + 1e-9


def test_agents_choose_legal_moves():
    for agent in (RandomAgent(seed=0), MinimaxAgent(depth=1), ExpectimaxAgent(depth=1)):
        for b in random_midgame_boards(10, seed=5):
            assert agent.choose(b) in [d for d, _ in legal_moves(b)]


def test_heuristic_components():
    g = np.array([[2, 4, 8, 16], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 2]])
    comp = Evaluator(Weights()).components(from_grid(g))
    assert comp["empty"] == 11
    assert comp["max_tile"] == 4  # 16 = 2^4
    assert comp["corner"] == 4
    assert comp["smooth"] == -3  # |1-2| + |2-3| + |3-4| en la primera fila
    assert comp["sumsq"] == 4 + 16 + 64 + 256 + 4


def test_weighted_evaluation_is_linear_combination():
    b = random_midgame_boards(1, seed=7)[0]
    for w in PRESETS.values():
        comp = Evaluator(w).components(b)
        expected = sum(getattr(w, k) * v for k, v in comp.items())
        assert abs(Evaluator(w)(b) - expected) < 1e-6


def test_game_stats_are_json_serializable():
    """El JSON de resultados original quedaba cortado por tipos de numpy."""
    games = [play_game(RandomAgent(seed=s), seed=s) for s in range(3)]
    json.dumps(summarize(games))
    json.dumps(games)
