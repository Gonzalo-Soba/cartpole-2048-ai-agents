"""Experimentos de CartPole: discretización, hiperparámetros y Stochastic Q-learning.

Uso (desde la carpeta ``cartpole/``)::

    python -m experiments.run_experiments --suite discretization
    python -m experiments.run_experiments --suite hyperparams
    python -m experiments.run_experiments --suite actions
    python -m experiments.run_experiments --suite all --workers 4

``--quick`` corre una versión reducida (pocos episodios, 1 semilla) para
verificar que todo funciona. Cada corrida guarda un JSON en ``results/runs/``
y el resumen de cada suite queda en ``results/<suite>.json``.
"""

from __future__ import annotations

import argparse
import json
import pickle
import sys
import time
from multiprocessing import Pool
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from cartpole_rl import QLearningConfig, evaluate, make_discretizer, make_env, train  # noqa: E402

RESULTS = ROOT / "results"
RUNS = RESULTS / "runs"
MODELS = ROOT / "models"

SEEDS = (0, 1, 2)

# Configuración base: la del modelo final de la primera versión.
BASE = dict(alpha=0.2, gamma=0.9995, epsilon_start=1.0, epsilon_end=0.001, epsilon_decay=0.9995)


def curve(rewards: list[float], every: int = 50, window: int = 100) -> list[float]:
    """Media móvil de ``window`` episodios muestreada cada ``every`` episodios."""
    r = np.asarray(rewards)
    c = np.convolve(r, np.ones(window) / window, mode="valid")
    return [round(float(x), 2) for x in c[::every]]


def run_job(job: dict) -> dict:
    disc = make_discretizer(job["discretization"])
    env = make_env(job["n_actions"])
    cfg = QLearningConfig(**job["config"])
    Q, res = train(env, disc, disc.n_states, cfg, discretization_name=disc.describe())

    eval_exact = evaluate(env, Q, disc, episodes=job["eval_episodes"], policy="exact")
    summary = {
        "id": job["id"],
        "suite": job["suite"],
        "label": job["label"],
        "discretization": job["discretization"],
        "discretization_desc": disc.describe(),
        "n_actions": job["n_actions"],
        "algorithm": "stochastic_q_learning" if cfg.stochastic else "q_learning",
        "config": cfg.to_dict(),
        "train_seconds": round(res.train_seconds, 2),
        "train_steps": res.steps,
        "us_per_step": round(res.train_seconds / res.steps * 1e6, 2),
        "q_evals_per_step": round(res.q_evaluations / res.steps, 3),
        "train_mean_last_1000": round(float(np.mean(res.rewards[-1000:])), 2),
        "first_episode_ma100_ge_475": next(
            (i + 100 for i, v in enumerate(np.convolve(res.rewards, np.ones(100) / 100, "valid")) if v >= 475),
            None,
        ),
        "curve_ma100_every50": curve(res.rewards),
        "eval_exact": {k: v for k, v in eval_exact.items() if k != "rewards"},
        "eval_exact_rewards": eval_exact["rewards"],
    }
    if cfg.stochastic:
        eval_stoch = evaluate(
            env, Q, disc, episodes=job["eval_episodes"], policy="stochastic", memory=res.extra["memory"]
        )
        summary["eval_stochastic"] = {k: v for k, v in eval_stoch.items() if k != "rewards"}
        summary["stoch_max_exact_ratio"] = round(res.stoch_max_exact_ratio, 4)
        summary["stoch_max_mean_gap"] = round(res.stoch_max_mean_gap, 4)

    RUNS.mkdir(parents=True, exist_ok=True)
    (RUNS / f"{job['id']}.json").write_text(json.dumps(summary, indent=1, ensure_ascii=False))

    if job.get("save_model"):
        MODELS.mkdir(parents=True, exist_ok=True)
        model = {
            "Q": Q.astype(np.float32),
            "memory": res.extra.get("memory"),
            "discretization": job["discretization"],
            "n_actions": job["n_actions"],
            "config": cfg.to_dict(),
            "eval_exact": summary["eval_exact"],
            "eval_stochastic": summary.get("eval_stochastic"),
        }
        with open(MODELS / f"{job['id']}.pkl", "wb") as f:
            pickle.dump(model, f)

    print(f"[ok] {job['id']:<45} eval={eval_exact['mean']:6.1f}  {res.train_seconds:6.0f}s", flush=True)
    return summary


def jobs_discretization(episodes: int, seeds, eval_episodes: int) -> list[dict]:
    jobs = []
    for d in ("D1", "D2", "D3"):
        for s in seeds:
            jobs.append(dict(
                id=f"disc_{d}_s{s}", suite="discretization", label=d, discretization=d, n_actions=2,
                config={**BASE, "episodes": episodes, "seed": s}, eval_episodes=eval_episodes,
                save_model=(s == 0),
            ))
    return jobs


HYPER_GRID = [
    ("base", {}),
    ("alpha=0.05", {"alpha": 0.05}),
    ("alpha=0.1", {"alpha": 0.1}),
    ("alpha=0.4", {"alpha": 0.4}),
    ("gamma=0.99", {"gamma": 0.99}),
    ("gamma=0.999", {"gamma": 0.999}),
    ("decay=0.999", {"epsilon_decay": 0.999}),
    ("decay=0.9998", {"epsilon_decay": 0.9998}),
]


def jobs_hyperparams(disc: str, episodes: int, seeds, eval_episodes: int) -> list[dict]:
    jobs = []
    for label, override in HYPER_GRID:
        for s in seeds:
            jobs.append(dict(
                id=f"hyper_{disc}_{label}_s{s}", suite="hyperparams", label=label, discretization=disc,
                n_actions=2, config={**BASE, **override, "episodes": episodes, "seed": s},
                eval_episodes=eval_episodes,
            ))
    return jobs


def jobs_actions(disc: str, n_actions_list, episodes: int, seeds, eval_episodes: int) -> list[dict]:
    jobs = []
    for n in n_actions_list:
        for stochastic in (False, True):
            algo = "stochq" if stochastic else "q"
            for s in seeds:
                jobs.append(dict(
                    id=f"actions_{disc}_n{n}_{algo}_s{s}", suite="actions", label=f"{algo} n={n}",
                    discretization=disc, n_actions=n,
                    config={**BASE, "episodes": episodes, "seed": s, "stochastic": stochastic},
                    eval_episodes=eval_episodes, save_model=(s == 0 and n == n_actions_list[0]),
                ))
    return jobs


def aggregate(summaries: list[dict]) -> dict:
    """Agrupa corridas por etiqueta y calcula media y desvío entre semillas."""
    groups: dict[str, list[dict]] = {}
    for s in summaries:
        groups.setdefault(s["label"], []).append(s)
    out = {}
    for label, runs in groups.items():
        evals = [r["eval_exact"]["mean"] for r in runs]
        entry = {
            "runs": [r["id"] for r in runs],
            "n_seeds": len(runs),
            "algorithm": runs[0]["algorithm"],
            "n_actions": runs[0]["n_actions"],
            "discretization": runs[0]["discretization_desc"],
            "config": {k: v for k, v in runs[0]["config"].items() if k != "seed"},
            "eval_exact_mean": round(float(np.mean(evals)), 2),
            "eval_exact_std_between_seeds": round(float(np.std(evals)), 2),
            "eval_exact_per_seed": evals,
            "success_rate_mean": round(float(np.mean([r["eval_exact"]["success_rate"] for r in runs])), 3),
            "train_mean_last_1000": round(float(np.mean([r["train_mean_last_1000"] for r in runs])), 2),
            "first_episode_ma100_ge_475": [r["first_episode_ma100_ge_475"] for r in runs],
            "train_seconds_mean": round(float(np.mean([r["train_seconds"] for r in runs])), 1),
            "us_per_step_mean": round(float(np.mean([r["us_per_step"] for r in runs])), 2),
            "q_evals_per_step_mean": round(float(np.mean([r["q_evals_per_step"] for r in runs])), 3),
        }
        if "eval_stochastic" in runs[0]:
            ev = [r["eval_stochastic"]["mean"] for r in runs]
            entry["eval_stochastic_mean"] = round(float(np.mean(ev)), 2)
            entry["eval_stochastic_std_between_seeds"] = round(float(np.std(ev)), 2)
            entry["eval_stochastic_per_seed"] = ev
            entry["stoch_max_exact_ratio_mean"] = round(float(np.mean([r["stoch_max_exact_ratio"] for r in runs])), 4)
        out[label] = entry
    return out


def run_suite(name: str, jobs: list[dict], workers: int) -> dict:
    print(f"\n=== Suite {name}: {len(jobs)} corridas ===", flush=True)
    start = time.time()
    with Pool(workers) as pool:
        summaries = pool.map(run_job, jobs, chunksize=1)
    result = {
        "suite": name,
        "wall_minutes": round((time.time() - start) / 60, 1),
        "seeds": sorted({j["config"]["seed"] for j in jobs}),
        "groups": aggregate(summaries),
    }
    (RESULTS / f"{name}.json").write_text(json.dumps(result, indent=2, ensure_ascii=False))
    return result


def best_discretization() -> str:
    path = RESULTS / "discretization.json"
    if not path.exists():
        return "D2"
    groups = json.loads(path.read_text())["groups"]
    return max(groups, key=lambda k: groups[k]["eval_exact_mean"])


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--suite", choices=["discretization", "hyperparams", "actions", "all"], default="all")
    parser.add_argument("--workers", type=int, default=2)
    parser.add_argument("--quick", action="store_true", help="corrida corta para verificar el pipeline")
    args = parser.parse_args()

    RESULTS.mkdir(parents=True, exist_ok=True)
    seeds = (0,) if args.quick else SEEDS
    ev = 10 if args.quick else 100
    scale = 0.05 if args.quick else 1.0

    if args.suite in ("discretization", "all"):
        run_suite("discretization", jobs_discretization(int(20_000 * scale), seeds, ev), args.workers)
    if args.suite in ("hyperparams", "all"):
        disc = best_discretization()
        run_suite("hyperparams", jobs_hyperparams(disc, int(10_000 * scale), seeds, ev), args.workers)
    if args.suite in ("actions", "all"):
        run_suite("actions", jobs_actions(best_discretization(), (11, 51), int(15_000 * scale), seeds, ev), args.workers)


if __name__ == "__main__":
    main()
