"""Discretización del espacio de observaciones de CartPole-v1.

Cada observación continua (posición del carro, velocidad del carro, ángulo del
poste, velocidad angular) se mapea a un índice entero único, que es la fila de
la tabla Q. Los rangos se recortan con ``np.clip``: fuera de ellos el episodio
termina (posición > 2.4, ángulo > 0.2095 rad) o los valores son muy raros
(velocidades).
"""

from __future__ import annotations

from dataclasses import dataclass, field

import numpy as np

# Límites usados para recortar cada variable antes de discretizar.
CART_POS_LIMIT = 2.4
CART_VEL_LIMIT = 3.0
POLE_ANGLE_LIMIT = 0.21
POLE_ANG_VEL_LIMIT = 3.0

LIMITS = np.array([CART_POS_LIMIT, CART_VEL_LIMIT, POLE_ANGLE_LIMIT, POLE_ANG_VEL_LIMIT])


def uniform_edges(limit: float, n_bins: int) -> np.ndarray:
    """Bordes internos de ``n_bins`` intervalos iguales en [-limit, limit]."""
    return np.linspace(-limit, limit, n_bins + 1)[1:-1]


def centered_edges(limit: float, n_bins: int, power: float = 2.0) -> np.ndarray:
    """Bordes internos más densos cerca de 0 que en los extremos.

    Se toma una grilla uniforme en [-1, 1] y se aplica ``sign(u) * |u|**power``.
    Con ``power > 1`` los intervalos centrales son más finos, que es donde el
    agente necesita distinguir estados para mantener el poste vertical.
    """
    u = np.linspace(-1.0, 1.0, n_bins + 1)[1:-1]
    return np.sign(u) * np.abs(u) ** power * limit


@dataclass
class Discretizer:
    """Mapea observaciones continuas a un índice de estado discreto."""

    name: str
    edges: list[np.ndarray]
    bins: tuple[int, ...] = field(init=False)
    n_states: int = field(init=False)

    def __post_init__(self) -> None:
        self.bins = tuple(len(e) + 1 for e in self.edges)
        self.n_states = int(np.prod(self.bins))
        # Multiplicadores para aplanar (i, j, k, l) a un único índice.
        self._strides = np.array(
            [int(np.prod(self.bins[i + 1:])) for i in range(len(self.bins))]
        )

    def __call__(self, obs: np.ndarray) -> int:
        clipped = np.clip(obs, -LIMITS, LIMITS)
        idx = 0
        for d in range(4):
            idx += int(np.searchsorted(self.edges[d], clipped[d], side="right")) * int(self._strides[d])
        return idx

    def describe(self) -> str:
        return f"{self.name} ({'x'.join(map(str, self.bins))} = {self.n_states} estados)"


def make_discretizer(name: str) -> Discretizer:
    """Discretizaciones evaluadas en los experimentos."""
    if name == "D1":
        # Uniforme, resolución media en todas las variables.
        bins = (10, 10, 20, 20)
        return Discretizer("D1 uniforme", [uniform_edges(l, b) for l, b in zip(LIMITS, bins)])
    if name == "D2":
        # Uniforme, menos resolución en el carro y más en el poste.
        bins = (8, 8, 25, 25)
        return Discretizer("D2 énfasis en el poste", [uniform_edges(l, b) for l, b in zip(LIMITS, bins)])
    if name == "D3":
        # No uniforme y compacta: intervalos finos cerca del equilibrio.
        bins = (6, 6, 12, 12)
        return Discretizer("D3 no uniforme compacta", [centered_edges(l, b) for l, b in zip(LIMITS, bins)])
    raise ValueError(f"Discretización desconocida: {name}")


DISCRETIZATIONS = ("D1", "D2", "D3")
