"""Genera los gráficos de ``figures/`` a partir de ``results/``.

Uso: ``python make_figures.py`` (desde la carpeta ``cartpole/``).
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
SERIES = ["#2a78d6", "#eb6834", "#1baf7a", "#eda100", "#e87ba4", "#008300", "#6250d6", "#e34948"]

plt.rcParams.update({
    "figure.facecolor": SURFACE, "axes.facecolor": SURFACE, "savefig.facecolor": SURFACE,
    "axes.edgecolor": GRID, "axes.labelcolor": INK_2, "xtick.color": INK_2, "ytick.color": INK_2,
    "text.color": INK, "axes.grid": True, "grid.color": GRID, "grid.linewidth": 0.8,
    "axes.spines.top": False, "axes.spines.right": False, "font.size": 10, "axes.titlesize": 11,
    "axes.titleweight": "bold", "legend.frameon": False, "lines.linewidth": 2,
})


def load_runs(ids: list[str]) -> list[dict]:
    return [json.loads((RESULTS / "runs" / f"{i}.json").read_text()) for i in ids]


def plot_curves(ax, runs: list[dict], color: str, label: str) -> None:
    curves = np.array([r["curve_ma100_every50"] for r in runs])
    x = np.arange(curves.shape[1]) * 50 + 100
    ax.fill_between(x, curves.min(0), curves.max(0), color=color, alpha=0.15, linewidth=0)
    ax.plot(x, curves.mean(0), color=color, label=label)


def fig_discretization() -> None:
    data = json.loads((RESULTS / "discretization.json").read_text())["groups"]
    fig, ax = plt.subplots(figsize=(8, 5))
    for i, (label, g) in enumerate(data.items()):
        plot_curves(ax, load_runs(g["runs"]), SERIES[i],
                    f"{g['discretization']} · eval {g['eval_exact_mean']:.0f}")
    ax.axhline(500, color=INK_2, linestyle=":", linewidth=1)
    ax.set(xlabel="Episodio", ylabel="Reward (media móvil 100 ep.)", ylim=(0, 520),
           title="Q-learning por discretización (media de 3 semillas, banda = mín-máx)")
    ax.legend(loc="upper center", bbox_to_anchor=(0.5, -0.14), ncol=1, fontsize=9)
    fig.tight_layout()
    fig.savefig(FIGURES / "discretizacion_curvas.png", dpi=150)
    plt.close(fig)


def fig_hyperparams() -> None:
    data = json.loads((RESULTS / "hyperparams.json").read_text())["groups"]
    labels = list(data)
    fig, ax = plt.subplots(figsize=(8, 4.2))
    y = np.arange(len(labels))[::-1]
    for yi, label in zip(y, labels):
        g = data[label]
        ax.scatter(g["eval_exact_per_seed"], [yi] * len(g["eval_exact_per_seed"]), s=36, color=SERIES[0],
                   alpha=0.45, zorder=3, linewidths=0)
        ax.scatter([g["eval_exact_mean"]], [yi], s=90, marker="|", color=INK, zorder=4, linewidths=2)
        ax.text(515, yi, f"{g['eval_exact_mean']:.0f}", va="center", color=INK_2)
    ax.set_yticks(y, labels)
    ax.set(xlim=(0, 540), xlabel="Reward medio en 100 episodios de evaluación (máx. 500)",
           title="Hiperparámetros (10.000 episodios; puntos = semillas, barra = media)")
    ax.grid(axis="y", visible=False)
    fig.tight_layout()
    fig.savefig(FIGURES / "hiperparametros.png", dpi=150)
    plt.close(fig)


def fig_actions() -> None:
    data = json.loads((RESULTS / "actions.json").read_text())["groups"]
    ns = sorted({g["n_actions"] for g in data.values()})
    fig, axes = plt.subplots(1, len(ns), figsize=(9, 3.8), sharey=True)
    for ax, n in zip(np.atleast_1d(axes), ns):
        for i, (algo, name) in enumerate((("q", "Q-learning"), ("stochq", "Stochastic Q-learning"))):
            g = data[f"{algo} n={n}"]
            plot_curves(ax, load_runs(g["runs"]), SERIES[i], f"{name} · {g['q_evals_per_step_mean']:.1f} Q/paso")
        ax.axhline(500, color=INK_2, linestyle=":", linewidth=1)
        ax.set(title=f"{n} niveles de fuerza", xlabel="Episodio", ylim=(0, 520))
        ax.legend(loc="lower right", fontsize=8.5)
    np.atleast_1d(axes)[0].set_ylabel("Reward (media móvil 100 ep.)")
    fig.tight_layout()
    fig.savefig(FIGURES / "stochastic_vs_q.png", dpi=150)
    plt.close(fig)


if __name__ == "__main__":
    FIGURES.mkdir(exist_ok=True)
    for name, fn in (("discretization", fig_discretization), ("hyperparams", fig_hyperparams),
                     ("actions", fig_actions)):
        if (RESULTS / f"{name}.json").exists():
            fn()
            print(f"ok: {name}")
