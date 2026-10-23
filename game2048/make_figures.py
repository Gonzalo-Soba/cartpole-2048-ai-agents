"""Genera los gráficos de ``figures/`` a partir de ``results/``.

Uso: ``python make_figures.py`` (desde la carpeta ``game2048/``).
"""

from __future__ import annotations

import json
from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt  # noqa: E402
import numpy as np  # noqa: E402

ROOT = Path(__file__).resolve().parent
RESULTS = ROOT / "results"
FIGURES = ROOT / "figures"

SURFACE = "#fcfcfb"
INK = "#0b0b0b"
INK_2 = "#52514e"
GRID = "#e4e3df"
SERIES = ["#2a78d6", "#eb6834", "#1baf7a", "#eda100"]
# Rampa secuencial azul para la ficha máxima (más oscuro = mejor).
TILE_RAMP = {"<=128": "#dbe8f8", "256": "#b4cff0", "512": "#86b0e6", "1024": "#4f8edb", "2048": "#1d5fb0"}

plt.rcParams.update({
    "figure.facecolor": SURFACE, "axes.facecolor": SURFACE, "savefig.facecolor": SURFACE,
    "axes.edgecolor": GRID, "axes.labelcolor": INK_2, "xtick.color": INK_2, "ytick.color": INK_2,
    "text.color": INK, "axes.grid": True, "grid.color": GRID, "grid.linewidth": 0.8,
    "axes.spines.top": False, "axes.spines.right": False, "font.size": 10, "axes.titlesize": 11,
    "axes.titleweight": "bold", "legend.frameon": False,
})


def tile_shares(dist: dict[str, int]) -> dict[str, float]:
    total = sum(dist.values())
    shares = {k: 0.0 for k in TILE_RAMP}
    for tile, count in dist.items():
        key = tile if int(tile) >= 256 else "<=128"
        shares[key] += count / total
    return shares


def stacked_tiles(ax, rows: list[tuple[str, dict]]) -> None:
    """Barras horizontales apiladas: % de partidas por ficha máxima alcanzada."""
    y = np.arange(len(rows))[::-1]
    for yi, (label, summary) in zip(y, rows):
        left = 0.0
        for key, share in tile_shares(summary["max_tile_distribution"]).items():
            if share:
                ax.barh(yi, share * 100, left=left, color=TILE_RAMP[key], edgecolor=SURFACE, linewidth=2,
                        height=0.7)
                if share >= 0.1:
                    ax.text(left + share * 50, yi, f"{share:.0%}", ha="center", va="center", fontsize=8,
                            color="white" if key in ("1024", "2048") else INK)
                left += share * 100
        ax.text(101.5, yi, f"n={summary['games']}", va="center", fontsize=8, color=INK_2)
    ax.set_yticks(y, [r[0] for r in rows])
    ax.set_xlim(0, 108)
    ax.set_xlabel("% de partidas según la ficha máxima alcanzada")
    ax.grid(axis="y", visible=False)
    handles = [plt.Rectangle((0, 0), 1, 1, color=c) for c in TILE_RAMP.values()]
    ax.legend(handles, list(TILE_RAMP), ncol=5, loc="upper center", bbox_to_anchor=(0.5, -0.18), fontsize=8.5)


def fig_agents() -> None:
    res = json.loads((RESULTS / "agents.json").read_text())["results"]
    names = {
        "random": "Random", "minimax_ab_d1": "Minimax AB · d1", "minimax_ab_d2": "Minimax AB · d2",
        "minimax_ab_d3": "Minimax AB · d3", "expectimax_d1": "Expectimax · d1",
        "expectimax_d2": "Expectimax · d2", "expectimax_d3_p1e-3": "Expectimax · d3",
    }
    rows = [(names.get(k, k), v["summary"]) for k, v in res.items()]
    fig, ax = plt.subplots(figsize=(8, 4.4))
    stacked_tiles(ax, rows)
    ax.set_title("Ficha máxima por agente (2048 = victoria)")
    fig.tight_layout()
    fig.savefig(FIGURES / "agentes_ficha_maxima.png", dpi=150)
    plt.close(fig)


def fig_heuristics() -> None:
    res = json.loads((RESULTS / "heuristics.json").read_text())["results"]
    rows = sorted(((k, v["summary"]) for k, v in res.items()),
                  key=lambda r: (r[1]["win_rate"], r[1]["score_mean"]), reverse=True)
    fig, ax = plt.subplots(figsize=(8, 4.2))
    stacked_tiles(ax, rows)
    ax.set_title("Funciones de evaluación con Expectimax d2")
    fig.tight_layout()
    fig.savefig(FIGURES / "heuristicas.png", dpi=150)
    plt.close(fig)


def fig_alphabeta() -> None:
    rows = json.loads((RESULTS / "alphabeta.json").read_text())["results"]["positions"]
    depths = [r["depth"] for r in rows]
    x = np.arange(len(depths))
    fig, ax = plt.subplots(figsize=(7, 3.8))
    w = 0.36
    plain = [r["plain_nodes_per_position"] for r in rows]
    ab = [r["ab_nodes_per_position"] for r in rows]
    ax.bar(x - w / 2 - 0.01, plain, w, color=SERIES[1], label="Minimax sin poda")
    ax.bar(x + w / 2 + 0.01, ab, w, color=SERIES[0], label="Minimax con alpha-beta")
    for xi, r in zip(x, rows):
        ax.text(xi + w / 2, r["ab_nodes_per_position"] * 1.25, f"−{r['node_reduction_pct']:.0f}%",
                ha="center", fontsize=9, color=INK)
    ax.set_yscale("log")
    ax.set_xticks(x, [f"profundidad {d}" for d in depths])
    ax.set_ylabel("Nodos por decisión (escala log)")
    ax.set_title(f"Impacto de la poda ({rows[0]['positions']} posiciones, mismas decisiones)")
    ax.grid(axis="x", visible=False)
    ax.legend(loc="upper left")
    fig.tight_layout()
    fig.savefig(FIGURES / "alpha_beta_nodos.png", dpi=150)
    plt.close(fig)


if __name__ == "__main__":
    FIGURES.mkdir(exist_ok=True)
    for name, fn in (("agents", fig_agents), ("heuristics", fig_heuristics), ("alphabeta", fig_alphabeta)):
        if (RESULTS / f"{name}.json").exists():
            fn()
            print(f"ok: {name}")
