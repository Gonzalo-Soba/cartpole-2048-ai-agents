"""Construcción del ambiente CartPole-v1 con acciones discretizadas.

CartPole-v1 tiene solo 2 acciones (empujar a la izquierda o a la derecha con
fuerza 10 N). Para estudiar Stochastic Q-learning, que está pensado para
espacios de acciones grandes, se discretiza la *fuerza* aplicada en ``n``
niveles equiespaciados en [-10, 10] N. Con ``n_actions=2`` el ambiente es
exactamente el CartPole-v1 original.
"""

from __future__ import annotations

import gymnasium as gym
import numpy as np

MAX_FORCE = 10.0


class DiscreteForceCartPole(gym.ActionWrapper):
    """CartPole donde la acción ``i`` aplica la fuerza ``forces[i]``."""

    def __init__(self, env: gym.Env, n_actions: int):
        super().__init__(env)
        if n_actions < 2:
            raise ValueError("Se necesitan al menos 2 acciones")
        self.forces = np.linspace(-MAX_FORCE, MAX_FORCE, n_actions)
        self.action_space = gym.spaces.Discrete(n_actions)

    def action(self, action: int) -> int:
        force = float(self.forces[action])
        # CartPole aplica ``force_mag`` hacia la derecha si la acción es 1 y
        # ``-force_mag`` si es 0. Ajustamos la magnitud en cada paso.
        self.env.unwrapped.force_mag = abs(force)
        return 1 if force > 0 else 0


def make_env(n_actions: int = 2, render_mode: str | None = None) -> gym.Env:
    env = gym.make("CartPole-v1", render_mode=render_mode)
    if n_actions == 2:
        return env
    return DiscreteForceCartPole(env, n_actions)
