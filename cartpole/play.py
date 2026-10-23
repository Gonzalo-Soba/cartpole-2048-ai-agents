"""Carga un modelo entrenado y lo evalúa (opcionalmente con render en ventana).

Ejemplos (desde la carpeta ``cartpole/``)::

    python play.py                                   # evalúa el modelo por defecto, 100 episodios
    python play.py --model models/actions_D1_n11_stochq_s0.pkl
    python play.py --render --episodes 3             # requiere pygame
"""

from __future__ import annotations

import argparse
import pickle
from pathlib import Path

from cartpole_rl import evaluate, make_discretizer, make_env

DEFAULT_MODEL = Path(__file__).resolve().parent / "models" / "disc_D1_s0.pkl"


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--model", type=Path, default=DEFAULT_MODEL)
    parser.add_argument("--episodes", type=int, default=100)
    parser.add_argument("--render", action="store_true")
    args = parser.parse_args()

    with open(args.model, "rb") as f:
        model = pickle.load(f)
    disc = make_discretizer(model["discretization"])
    env = make_env(model["n_actions"], render_mode="human" if args.render else None)
    policy = "stochastic" if model["config"].get("stochastic") else "exact"
    stats = evaluate(env, model["Q"], disc, episodes=args.episodes, policy=policy, memory=model.get("memory"))
    env.close()

    print(f"Modelo: {args.model.name} | {disc.describe()} | {model['n_actions']} acciones | política {policy}")
    print(f"Reward medio {stats['mean']:.1f} ± {stats['std']:.1f} | mín {stats['min']:.0f} | "
          f"episodios con 500 pasos: {stats['success_rate']:.0%}")


if __name__ == "__main__":
    main()
