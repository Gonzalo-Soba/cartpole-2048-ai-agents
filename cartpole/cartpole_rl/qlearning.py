"""Q-learning tabular y Stochastic Q-learning (Fourati et al., ICML 2024).

Ambos algoritmos comparten el mismo loop. La única diferencia es cómo se
calcula el máximo sobre las acciones:

* **Q-learning**: ``max_a Q(s, a)`` y ``argmax_a Q(s, a)`` sobre las ``n``
  acciones (costo O(n)).
* **Stochastic Q-learning**: ``stoch max`` y ``stoch argmax`` sobre
  ``C = R ∪ M(s)``, donde ``R`` son ``⌈log n⌉`` acciones sorteadas
  uniformemente y ``M(s)`` son las dos últimas acciones explotadas en el estado
  ``s`` (variante con memoria del paper, sección 4.1). Costo O(log n).

La actualización es la de Q-learning off-policy (Algoritmo 1 del paper)::

    b* = stoch argmax_b Q(s', b)
    Q(s, a) += alpha * (r + gamma * Q(s', b*) - Q(s, a))
"""

from __future__ import annotations

import math
import random
import time
from dataclasses import asdict, dataclass, field
from typing import Callable

import gymnasium as gym
import numpy as np

MEMORY_SIZE = 2  # El paper usa las dos últimas acciones explotadas por estado.


@dataclass
class QLearningConfig:
    episodes: int = 20_000
    alpha: float = 0.2
    gamma: float = 0.999
    epsilon_start: float = 1.0
    epsilon_end: float = 0.001
    epsilon_decay: float = 0.9995
    stochastic: bool = False
    seed: int = 0

    def to_dict(self) -> dict:
        return asdict(self)


@dataclass
class TrainingResult:
    config: dict
    discretization: str
    n_actions: int
    rewards: list[float]
    train_seconds: float
    steps: int
    q_evaluations: int = 0
    # Diagnóstico de stoch max (solo en la variante estocástica).
    stoch_max_exact_ratio: float | None = None
    stoch_max_mean_gap: float | None = None
    extra: dict = field(default_factory=dict)


class ActionMaximizer:
    """Encapsula ``max``/``argmax`` exacto o estocástico sobre las acciones."""

    def __init__(self, n_states: int, n_actions: int, stochastic: bool, rng: np.random.Generator):
        self.n_actions = n_actions
        self.stochastic = stochastic
        self.rng = rng
        self.subset_size = max(1, math.ceil(math.log(n_actions)))
        # Memoria M(s): últimas acciones explotadas en cada estado (-1 = vacío).
        self.memory = np.full((n_states, MEMORY_SIZE), -1, dtype=np.int64)
        # random.sample es bastante más rápido que Generator.choice para subconjuntos chicos.
        self._py_rng = random.Random(int(rng.integers(2**31)))
        self._actions = range(n_actions)
        self.q_evaluations = 0
        # Diagnóstico: cuántas veces stoch max coincide con el max exacto.
        self.diag_calls = 0
        self.diag_exact = 0
        self.diag_gap = 0.0

    def candidates(self, state: int) -> list[int]:
        """C = R ∪ M(s): ⌈ln n⌉ acciones al azar sin reemplazo + memoria del estado."""
        cand = set(self._py_rng.sample(self._actions, self.subset_size))
        for a in self.memory[state]:
            if a >= 0:
                cand.add(int(a))
        return list(cand)

    def argmax(self, Q: np.ndarray, state: int, remember: bool = True) -> int:
        """Acción greedy. En la variante estocástica actualiza la memoria."""
        row = Q[state]
        if not self.stochastic:
            self.q_evaluations += self.n_actions
            return int(np.argmax(row))
        cand = self.candidates(state)
        self.q_evaluations += len(cand)
        best = int(cand[np.argmax(row[cand])])
        if remember:
            mem = self.memory[state]
            if mem[0] != best:
                mem[1] = mem[0]
                mem[0] = best
        return best

    def max(self, Q: np.ndarray, state: int) -> float:
        row = Q[state]
        if not self.stochastic:
            self.q_evaluations += self.n_actions
            return float(row.max())
        cand = self.candidates(state)
        self.q_evaluations += len(cand)
        value = float(row[cand].max())
        exact = float(row.max())  # solo para diagnóstico, no se usa en la actualización
        self.diag_calls += 1
        self.diag_exact += value == exact
        self.diag_gap += exact - value
        return value


def train(
    env: gym.Env,
    get_state: Callable[[np.ndarray], int],
    n_states: int,
    config: QLearningConfig,
    discretization_name: str = "",
    log_every: int = 0,
) -> tuple[np.ndarray, TrainingResult]:
    """Entrena una tabla Q con Q-learning o Stochastic Q-learning."""
    rng = np.random.default_rng(config.seed)
    n_actions = env.action_space.n
    Q = np.zeros((n_states, n_actions))
    maximizer = ActionMaximizer(n_states, n_actions, config.stochastic, rng)

    epsilon = config.epsilon_start
    alpha, gamma = config.alpha, config.gamma
    rewards: list[float] = []
    steps = 0
    start = time.perf_counter()

    obs, _ = env.reset(seed=config.seed)
    for episode in range(config.episodes):
        if episode > 0:
            obs, _ = env.reset()
        state = get_state(obs)
        total = 0.0
        while True:
            if rng.random() < epsilon:
                action = int(rng.integers(n_actions))
            else:
                action = maximizer.argmax(Q, state)

            obs, reward, terminated, truncated, _ = env.step(action)
            next_state = get_state(obs)

            # Si el episodio terminó por caída no hay valor futuro.
            # Si se cortó por el límite de 500 pasos (truncated) sí se hace bootstrap.
            target = reward if terminated else reward + gamma * maximizer.max(Q, next_state)
            Q[state, action] += alpha * (target - Q[state, action])

            state = next_state
            total += reward
            steps += 1
            if terminated or truncated:
                break

        rewards.append(total)
        epsilon = max(config.epsilon_end, epsilon * config.epsilon_decay)
        if log_every and (episode + 1) % log_every == 0:
            print(f"  ep {episode + 1:>6}  media(100)={np.mean(rewards[-100:]):6.1f}  eps={epsilon:.4f}")

    result = TrainingResult(
        config=config.to_dict(),
        discretization=discretization_name,
        n_actions=n_actions,
        rewards=rewards,
        train_seconds=time.perf_counter() - start,
        steps=steps,
        q_evaluations=maximizer.q_evaluations,
    )
    if config.stochastic:
        result.extra["memory"] = maximizer.memory
    if config.stochastic and maximizer.diag_calls:
        result.stoch_max_exact_ratio = maximizer.diag_exact / maximizer.diag_calls
        result.stoch_max_mean_gap = maximizer.diag_gap / maximizer.diag_calls
    return Q, result


def evaluate(
    env: gym.Env,
    Q: np.ndarray,
    get_state: Callable[[np.ndarray], int],
    episodes: int = 100,
    seed: int = 10_000,
    policy: str = "exact",
    memory: np.ndarray | None = None,
) -> dict:
    """Evalúa la política greedy (sin exploración) con semillas de ambiente fijas.

    ``policy="exact"`` usa ``argmax`` sobre todas las acciones.
    ``policy="stochastic"`` usa ``stoch argmax`` con la memoria aprendida en el
    entrenamiento, que es la política que el paper define para el agente.
    """
    maximizer = None
    if policy == "stochastic":
        maximizer = ActionMaximizer(Q.shape[0], Q.shape[1], True, np.random.default_rng(seed))
        if memory is not None:
            maximizer.memory = memory.copy()
    rewards = []
    for i in range(episodes):
        obs, _ = env.reset(seed=seed + i)
        state = get_state(obs)
        total = 0.0
        while True:
            action = int(np.argmax(Q[state])) if maximizer is None else maximizer.argmax(Q, state)
            obs, reward, terminated, truncated, _ = env.step(action)
            state = get_state(obs)
            total += reward
            if terminated or truncated:
                break
        rewards.append(total)
    r = np.array(rewards)
    return {
        "policy": policy,
        "rewards": r.tolist(),
        "mean": float(r.mean()),
        "std": float(r.std()),
        "min": float(r.min()),
        "max": float(r.max()),
        "success_rate": float((r >= 500).mean()),
    }
