"""Juega una partida de 2048 en consola con el agente elegido.

Ejemplos (desde la carpeta ``game2048/``)::

    python play.py                                  # Expectimax profundidad 2
    python play.py --agent minimax_ab --depth 3
    python play.py --agent expectimax --weights enfasis_vacias --seed 7 --quiet
"""

from __future__ import annotations

import argparse

from game2048 import MOVE_NAMES, GameBoard, make_agent
from game2048.board import legal_moves
from game2048.heuristics import PRESETS


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--agent", choices=["random", "minimax", "minimax_ab", "expectimax"], default="expectimax")
    parser.add_argument("--depth", type=int, default=2)
    parser.add_argument("--weights", choices=list(PRESETS), default="balanceada")
    parser.add_argument("--seed", type=int, default=0)
    parser.add_argument("--quiet", action="store_true", help="mostrar solo el resultado final")
    args = parser.parse_args()

    agent = make_agent(args.agent, depth=args.depth, weights=args.weights, seed=args.seed)
    board = GameBoard(seed=args.seed)
    moves = 0
    if not args.quiet:
        board.render()
    while legal_moves(board.board) and board.get_max_tile() < 2048:
        action = agent.play(board)
        board.play(action)
        moves += 1
        if not args.quiet:
            print(f"Movimiento {moves}: {MOVE_NAMES[action]}")
            board.render()

    board.render()
    result = "GANÓ (2048)" if board.get_max_tile() >= 2048 else "PERDIÓ"
    print(f"{result} | ficha máxima {board.get_max_tile()} | puntaje {board.score} | {moves} movimientos")


if __name__ == "__main__":
    main()
