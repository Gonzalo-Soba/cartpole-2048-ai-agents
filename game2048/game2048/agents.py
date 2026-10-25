"""Agentes para 2048: Random, Minimax (con y sin poda alpha-beta) y Expectimax.

Profundidad: ``depth`` es la cantidad de jugadas propias que mira el agente.
Con ``depth=2`` el árbol es: MAX -> AZAR -> MAX -> AZAR -> evaluación.

* **Minimax** modela la aparición de fichas como un adversario que elige la
  peor celda y el peor valor (2 o 4) para el agente. Es pesimista: 2048 no
  tiene adversario, pero sirve como cota inferior y para estudiar la poda.
* **Expectimax** modela la aparición de fichas como lo que es, un evento
  aleatorio: celda uniforme entre las vacías, 2 con prob. 0.9 y 4 con 0.1.
  El valor del nodo de azar es la esperanza de sus hijos.

Ambos expanden *todas* las celdas vacías en los nodos de azar (la versión
original solo miraba las primeras 4 o 6 y sesgaba la búsqueda).
"""

from __future__ import annotations

import time
from abc import ABC, abstractmethod

import numpy as np

from .board import PROB_TWO, GameBoard, empty_positions, legal_moves
from .heuristics import PRESETS, Evaluator, Weights

NEG_INF = float("-inf")
POS_INF = float("inf")


class Agent(ABC):
    name = "agent"

    def __init__(self):
        self.nodes_explored = 0

    @abstractmethod
    def choose(self, b: int) -> int:
        """Devuelve el movimiento para el bitboard ``b``."""

    def play(self, board: GameBoard) -> int:
        """Interfaz original: recibe un ``GameBoard`` y devuelve el movimiento."""
        return self.choose(board.board)

    def heuristic_utility(self, board: GameBoard) -> float:
        return 0.0


class RandomAgent(Agent):
    name = "random"

    def __init__(self, seed: int | None = None):
        super().__init__()
        self.rng = np.random.default_rng(seed)

    def choose(self, b: int) -> int:
        # A diferencia del original, elige solo entre movimientos legales.
        moves = legal_moves(b)
        return moves[int(self.rng.integers(len(moves)))][0] if moves else 0

    def analyze(self, b: int) -> dict:
        """Misma forma que ``SearchAgent.analyze``; sin búsqueda no hay valores."""
        start = time.perf_counter()
        chosen = self.choose(b) if legal_moves(b) else None
        return {"move_values": [None] * 4, "chosen": chosen, "nodes": 0,
                "ms": round((time.perf_counter() - start) * 1000, 3)}


class SearchAgent(Agent):
    def __init__(self, depth: int = 2, weights: Weights | str = "balanceada"):
        super().__init__()
        if isinstance(weights, str):
            weights = PRESETS[weights]
        self.depth = depth
        self.weights = weights
        self.evaluate = Evaluator(weights)

    def heuristic_utility(self, board: GameBoard) -> float:
        return self.evaluate(board.board)

    @abstractmethod
    def _move_value(self, nb: int) -> float:
        """Valor exacto del tablero que deja una jugada (antes de la ficha nueva)."""

    def analyze(self, b: int) -> dict:
        """Valor de cada jugada en la raíz, para mostrar en qué se basa la decisión.

        ``move_values`` sigue el orden UP, DOWN, LEFT, RIGHT, con ``None`` en las
        jugadas ilegales. A diferencia de ``choose``, cada jugada se evalúa con
        ventana completa: con alpha-beta, ``choose`` solo obtiene cotas para las
        jugadas peores. La elección es la misma (ver ``tests/test_agents.py``).
        """
        start = time.perf_counter()
        nodes_before = self.nodes_explored
        values: list[float | None] = [None] * 4
        chosen, best = None, NEG_INF
        for d, nb in legal_moves(b):
            v = self._move_value(nb)
            values[d] = v
            if v > best:
                chosen, best = d, v
        return {
            "move_values": values,
            "chosen": chosen,
            "nodes": self.nodes_explored - nodes_before,
            "ms": round((time.perf_counter() - start) * 1000, 3),
        }


class MinimaxAgent(SearchAgent):
    """Minimax con poda alpha-beta opcional.

    La poda no cambia la decisión (ver ``tests/test_agents.py``), solo la
    cantidad de nodos explorados.
    """

    def __init__(self, depth: int = 2, use_alpha_beta: bool = True, weights: Weights | str = "balanceada"):
        super().__init__(depth, weights)
        self.use_alpha_beta = use_alpha_beta
        self.pruning_count = 0
        self.name = f"minimax{'_ab' if use_alpha_beta else ''}_d{depth}"

    def choose(self, b: int) -> int:
        moves = legal_moves(b)
        if not moves:
            return 0
        best_move, best_value = moves[0][0], NEG_INF
        alpha = NEG_INF
        for d, nb in moves:
            if self.use_alpha_beta:
                v = self._min_ab(nb, self.depth, alpha, POS_INF)
            else:
                v = self._min(nb, self.depth)
            if v > best_value:
                best_move, best_value = d, v
            alpha = max(alpha, best_value)
        return best_move

    def _move_value(self, nb: int) -> float:
        if self.use_alpha_beta:
            return self._min_ab(nb, self.depth, NEG_INF, POS_INF)
        return self._min(nb, self.depth)

    # --- sin poda ------------------------------------------------------------
    def _max(self, b: int, depth: int) -> float:
        self.nodes_explored += 1
        if depth == 0:
            return self.evaluate(b)
        moves = legal_moves(b)
        if not moves:
            return self.evaluate(b)
        return max(self._min(nb, depth) for _, nb in moves)

    def _min(self, b: int, depth: int) -> float:
        self.nodes_explored += 1
        value = POS_INF
        for pos in empty_positions(b):
            for exp in (1, 2):
                value = min(value, self._max(b | (exp << (4 * pos)), depth - 1))
        return value

    # --- con poda alpha-beta -------------------------------------------------
    def _max_ab(self, b: int, depth: int, alpha: float, beta: float) -> float:
        self.nodes_explored += 1
        if depth == 0:
            return self.evaluate(b)
        moves = legal_moves(b)
        if not moves:
            return self.evaluate(b)
        value = NEG_INF
        for _, nb in moves:
            value = max(value, self._min_ab(nb, depth, alpha, beta))
            if value >= beta:
                self.pruning_count += 1
                return value  # corte beta: MIN ya tiene algo mejor en otra rama
            alpha = max(alpha, value)
        return value

    def _min_ab(self, b: int, depth: int, alpha: float, beta: float) -> float:
        self.nodes_explored += 1
        value = POS_INF
        for pos in empty_positions(b):
            for exp in (1, 2):
                value = min(value, self._max_ab(b | (exp << (4 * pos)), depth - 1, alpha, beta))
                if value <= alpha:
                    self.pruning_count += 1
                    return value  # corte alpha: MAX ya tiene algo mejor en otra rama
                beta = min(beta, value)
        return value


class ExpectimaxAgent(SearchAgent):
    """Expectimax con tabla de transposición por jugada.

    ``min_prob`` permite podar ramas de azar muy improbables (por ejemplo
    ``1e-3``): si la probabilidad acumulada de llegar a un nodo es menor, se
    evalúa con la heurística en lugar de seguir expandiendo. Con ``0`` la
    búsqueda es exacta.
    """

    def __init__(self, depth: int = 2, weights: Weights | str = "balanceada", min_prob: float = 0.0):
        super().__init__(depth, weights)
        self.min_prob = min_prob
        self.name = f"expectimax_d{depth}"
        self._cache: dict[tuple[int, int], float] = {}

    def choose(self, b: int) -> int:
        moves = legal_moves(b)
        if not moves:
            return 0
        self._cache = {}
        best_move, best_value = moves[0][0], NEG_INF
        for d, nb in moves:
            v = self._chance(nb, self.depth, 1.0)
            if v > best_value:
                best_move, best_value = d, v
        return best_move

    def analyze(self, b: int) -> dict:
        self._cache = {}  # igual que choose: la tabla vale para una sola jugada
        return super().analyze(b)

    def _move_value(self, nb: int) -> float:
        return self._chance(nb, self.depth, 1.0)

    def _max(self, b: int, depth: int, prob: float) -> float:
        self.nodes_explored += 1
        if depth == 0 or prob < self.min_prob:
            return self.evaluate(b)
        key = (b, depth)
        cached = self._cache.get(key)
        if cached is not None:
            return cached
        moves = legal_moves(b)
        value = max((self._chance(nb, depth, prob) for _, nb in moves), default=None)
        if value is None:
            value = self.evaluate(b)
        self._cache[key] = value
        return value

    def _chance(self, b: int, depth: int, prob: float) -> float:
        self.nodes_explored += 1
        empties = empty_positions(b)
        n = len(empties)
        total = 0.0
        p2 = prob * PROB_TWO / n
        p4 = prob * (1 - PROB_TWO) / n
        for pos in empties:
            shift = 4 * pos
            total += PROB_TWO * self._max(b | (1 << shift), depth - 1, p2)
            total += (1 - PROB_TWO) * self._max(b | (2 << shift), depth - 1, p4)
        return total / n


def make_agent(kind: str, depth: int = 2, weights: str = "balanceada", **kwargs) -> Agent:
    if kind == "random":
        return RandomAgent(seed=kwargs.get("seed"))
    if kind == "minimax":
        return MinimaxAgent(depth, use_alpha_beta=False, weights=weights)
    if kind == "minimax_ab":
        return MinimaxAgent(depth, use_alpha_beta=True, weights=weights)
    if kind == "expectimax":
        return ExpectimaxAgent(depth, weights=weights, min_prob=kwargs.get("min_prob", 0.0))
    raise ValueError(f"Agente desconocido: {kind}")
