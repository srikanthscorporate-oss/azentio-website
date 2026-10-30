"""Participant job. Runs as its own process inside the client's environment.

Reads ONLY its own local dataset and the published global model; writes ONLY a model update
(weight delta, sample count, local validation metrics). Training examples never leave this process.
Usage: python -m azentio_fl.client <client_dir> <global_model.json> <update_out.json> <round> [behaviour]
"""

import json
import sys
from pathlib import Path

import numpy as np

from azentio_fl import model

CLIP_NORM = 1.0
LOCAL_EPOCHS = 3
LR = 0.1
L2 = 1e-3


def run(
    client_dir: Path,
    global_path: Path,
    out_path: Path,
    rnd: int,
    behaviour: str = "honest",
) -> None:
    data = np.load(client_dir / "data.npz")
    g = np.asarray(json.loads(global_path.read_text())["weights"])
    w = model.train(
        g, data["x_train"], data["y_train"], epochs=LOCAL_EPOCHS, lr=LR, l2=L2, seed=rnd
    )
    delta = w - g
    norm = float(np.linalg.norm(delta))
    if norm > CLIP_NORM:  # bounded update
        delta *= CLIP_NORM / norm

    if (
        behaviour == "poison"
    ):  # simulated attacker: flipped update scaled to sit exactly at the clip bound
        delta = -delta * (CLIP_NORM / max(float(np.linalg.norm(delta)), 1e-12))
    elif behaviour == "inflate":  # simulated misbehaving client that skips clipping
        delta = 8.0 * delta

    update = {
        "client": client_dir.name,
        "round": rnd,
        "n_samples": len(data["y_train"]),
        "delta": delta.tolist(),
        "local_val": {
            "global": model.metrics(g, data["x_val"], data["y_val"]),
            "local": model.metrics(w, data["x_val"], data["y_val"]),
        },
        "pos_rate": round(float(data["y_train"].mean()), 4),
    }
    out_path.write_text(json.dumps(update))


if __name__ == "__main__":
    run(
        Path(sys.argv[1]),
        Path(sys.argv[2]),
        Path(sys.argv[3]),
        int(sys.argv[4]),
        sys.argv[5] if len(sys.argv) > 5 else "honest",
    )
