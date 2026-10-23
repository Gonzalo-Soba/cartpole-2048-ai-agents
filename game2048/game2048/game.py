"""Ejecución de partidas completas y cálculo de estadísticas."""

from __future__ import annotations

import time

import numpy as np

from .agents import Agent
from .board import GameBoard, legal_moves, max_exponent

WIN_TILE = 2048


def play_game(agent: Agent, seed: int, stop_at_win: bool = True, max_moves: int = 20_000,
              verbose: bool = False) -> dict:
    """Juega una partida con semilla fija y devuelve sus estadísticas."""
    board = GameBoard(seed=seed)
    agent.nodes_explored = 0
    if hasattr(agent, "pruning_count"):
        agent.pruning_count = 0
    moves = 0
    start = time.perf_counter()
    while moves < max_moves:
        if not legal_moves(board.board):
            break
        action = agent.play(board)
        board.play(action)
        moves += 1
        if verbose:
            board.render()
        if stop_at_win and board.get_max_tile() >= WIN_TILE:
            break
    elapsed = time.perf_counter() - start
    max_tile = board.get_max_tile()
    stats = {
        "seed": seed,
        "moves": moves,
        "max_tile": int(max_tile),
        "score": int(board.score),
        "tile_sum": int(board.grid.sum()),
        "won": bool(max_tile >= WIN_TILE),  # bool nativo: json.dump falla con numpy.bool_
        "seconds": round(elapsed, 3),
        "ms_per_move": round(elapsed / max(moves, 1) * 1000, 3),
        "nodes": int(agent.nodes_explored),
        "nodes_per_move": round(agent.nodes_explored / max(moves, 1), 1),
    }
    if hasattr(agent, "pruning_count"):
        stats["prunings"] = int(agent.pruning_count)
    return stats


def summarize(games: list[dict]) -> dict:
    """Agrega las estadísticas de varias partidas."""
    tiles = [g["max_tile"] for g in games]
    dist: dict[str, int] = {}
    for t in sorted(tiles):
        dist[str(t)] = dist.get(str(t), 0) + 1
    out = {
        "games": len(games),
        "win_rate": round(float(np.mean([g["won"] for g in games])), 3),
        "max_tile_median": float(np.median(tiles)),
        "max_tile_distribution": dist,
        "score_mean": round(float(np.mean([g["score"] for g in games])), 1),
        "score_std": round(float(np.std([g["score"] for g in games])), 1),
        "moves_mean": round(float(np.mean([g["moves"] for g in games])), 1),
        "ms_per_move_mean": round(float(np.mean([g["ms_per_move"] for g in games])), 3),
        "nodes_per_move_mean": round(float(np.mean([g["nodes_per_move"] for g in games])), 1),
        "seconds_total": round(float(np.sum([g["seconds"] for g in games])), 1),
    }
    if "prunings" in games[0]:
        out["prunings_per_move_mean"] = round(
            float(np.mean([g["prunings"] / max(g["moves"], 1) for g in games])), 1
        )
    return out
