"""Experimentos de 2048.

Uso (desde la carpeta ``game2048/``)::

    python experiments.py --suite agents       # Random vs Minimax vs Expectimax y profundidad
    python experiments.py --suite alphabeta    # impacto de la poda alpha-beta
    python experiments.py --suite heuristics   # combinaciones de funciones de evaluación
    python experiments.py --suite all --workers 4

Todas las partidas usan semillas fijas (la partida ``i`` usa la semilla ``i``),
así que cada agente enfrenta exactamente la misma secuencia de fichas al azar
mientras sus decisiones coincidan. Los resultados quedan en ``results/``.
"""

from __future__ import annotations

import argparse
import json
import time
from multiprocessing import Pool
from pathlib import Path

import numpy as np

from game2048 import make_agent, play_game, summarize
from game2048.agents import MinimaxAgent
from game2048.board import legal_moves, spawn_tile

RESULTS = Path(__file__).resolve().parent / "results"


def _run_game(job: dict) -> dict:
    spec = job["spec"]
    agent = make_agent(spec["kind"], depth=spec.get("depth", 2), weights=spec.get("weights", "balanceada"),
                       min_prob=spec.get("min_prob", 0.0), seed=job["seed"])
    stats = play_game(agent, seed=job["seed"])
    stats["label"] = job["label"]
    return stats


def run_games(specs: dict[str, tuple[dict, int]], workers: int) -> dict:
    jobs = [{"label": label, "spec": spec, "seed": s} for label, (spec, n) in specs.items() for s in range(n)]
    # Primero las partidas más caras para repartir mejor la carga.
    jobs.sort(key=lambda j: -(j["spec"].get("depth", 0) * 10 + (j["spec"]["kind"] == "expectimax")))
    with Pool(workers) as pool:
        games = pool.map(_run_game, jobs, chunksize=1)
    out = {}
    for label, (spec, _) in specs.items():
        g = sorted([x for x in games if x["label"] == label], key=lambda x: x["seed"])
        out[label] = {"spec": spec, "summary": summarize(g), "games": g}
        s = out[label]["summary"]
        print(f"  {label:<28} win={s['win_rate']:.2f}  mediana={s['max_tile_median']:>6.0f}  "
              f"ms/mov={s['ms_per_move_mean']:8.2f}  nodos/mov={s['nodes_per_move_mean']:>9.1f}", flush=True)
    return out


def suite_agents(workers: int, scale: float) -> dict:
    n = lambda k: max(1, int(k * scale))  # noqa: E731
    specs = {
        "random": ({"kind": "random"}, n(100)),
        "minimax_ab_d1": ({"kind": "minimax_ab", "depth": 1}, n(30)),
        "minimax_ab_d2": ({"kind": "minimax_ab", "depth": 2}, n(30)),
        "minimax_ab_d3": ({"kind": "minimax_ab", "depth": 3}, n(10)),
        "expectimax_d1": ({"kind": "expectimax", "depth": 1}, n(30)),
        "expectimax_d2": ({"kind": "expectimax", "depth": 2}, n(30)),
        "expectimax_d3_p1e-3": ({"kind": "expectimax", "depth": 3, "min_prob": 1e-3}, n(10)),
    }
    return run_games(specs, workers)


def suite_heuristics(workers: int, scale: float) -> dict:
    from game2048.heuristics import PRESETS

    specs = {
        name: ({"kind": "expectimax", "depth": 2, "weights": name, "weights_values": w.to_dict()},
               max(1, int(20 * scale)))
        for name, w in PRESETS.items()
    }
    return run_games(specs, workers)


def _midgame_positions(n: int, seed: int = 123) -> list[int]:
    rng = np.random.default_rng(seed)
    boards = []
    while len(boards) < n:
        b = spawn_tile(spawn_tile(0, rng), rng)
        for _ in range(int(rng.integers(20, 120))):
            moves = legal_moves(b)
            if not moves:
                break
            b = spawn_tile(moves[int(rng.integers(len(moves)))][1], rng)
        if legal_moves(b):
            boards.append(b)
    return boards


def _alphabeta_depth(args: tuple[int, list[int]]) -> dict:
    depth, boards = args
    row = {"depth": depth, "positions": len(boards)}
    decisions = {}
    for use_ab in (False, True):
        agent = MinimaxAgent(depth=depth, use_alpha_beta=use_ab)
        start = time.perf_counter()
        decisions[use_ab] = [agent.choose(b) for b in boards]
        key = "ab" if use_ab else "plain"
        row[f"{key}_nodes_per_position"] = round(agent.nodes_explored / len(boards), 1)
        row[f"{key}_ms_per_position"] = round((time.perf_counter() - start) / len(boards) * 1000, 3)
        if use_ab:
            row["prunings_per_position"] = round(agent.pruning_count / len(boards), 1)
    row["same_decisions"] = decisions[False] == decisions[True]
    row["node_reduction_pct"] = round(100 * (1 - row["ab_nodes_per_position"] / row["plain_nodes_per_position"]), 1)
    row["speedup"] = round(row["plain_ms_per_position"] / row["ab_ms_per_position"], 2)
    print(f"  depth={depth}  nodos {row['plain_nodes_per_position']:.0f} -> {row['ab_nodes_per_position']:.0f} "
          f"(-{row['node_reduction_pct']}%)  speedup x{row['speedup']}  mismas decisiones={row['same_decisions']}",
          flush=True)
    return row


def suite_alphabeta(workers: int, scale: float) -> dict:
    boards = _midgame_positions(max(5, int(100 * scale)))
    with Pool(workers) as pool:
        rows = pool.map(_alphabeta_depth, [(d, boards) for d in (3, 2, 1)], chunksize=1)
    # Además: partidas completas con y sin poda deben ser idénticas.
    games = run_games({
        "minimax_d2": ({"kind": "minimax", "depth": 2}, max(1, int(5 * scale))),
        "minimax_ab_d2": ({"kind": "minimax_ab", "depth": 2}, max(1, int(5 * scale))),
    }, workers)
    identical = all(
        (a["moves"], a["score"], a["max_tile"]) == (b["moves"], b["score"], b["max_tile"])
        for a, b in zip(games["minimax_d2"]["games"], games["minimax_ab_d2"]["games"])
    )
    print(f"  partidas completas idénticas con y sin poda: {identical}")
    return {"positions": sorted(rows, key=lambda r: r["depth"]), "full_games": games,
            "full_games_identical": identical}


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--suite", choices=["agents", "alphabeta", "heuristics", "all"], default="all")
    parser.add_argument("--workers", type=int, default=2)
    parser.add_argument("--quick", action="store_true", help="pocas partidas, para verificar el pipeline")
    args = parser.parse_args()
    scale = 0.1 if args.quick else 1.0
    RESULTS.mkdir(exist_ok=True)

    suites = {"alphabeta": suite_alphabeta, "agents": suite_agents, "heuristics": suite_heuristics}
    for name, fn in suites.items():
        if args.suite not in (name, "all"):
            continue
        print(f"\n=== {name} ===", flush=True)
        start = time.time()
        data = fn(args.workers, scale)
        payload = {"suite": name, "wall_minutes": round((time.time() - start) / 60, 1), "results": data}
        (RESULTS / f"{name}.json").write_text(json.dumps(payload, indent=1, ensure_ascii=False))


if __name__ == "__main__":
    main()
