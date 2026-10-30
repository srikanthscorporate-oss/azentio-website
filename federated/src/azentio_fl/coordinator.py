"""Programme coordinator: invites consenting participants, validates and aggregates updates,
evaluates on a separate holdout and registers a candidate model.

The coordinator never opens a participant's data directory. It only reads update files, which
contain a weight delta, a sample count and aggregate metrics.
"""

import hashlib
import json
import subprocess
import sys
import tempfile
from dataclasses import dataclass, field
from datetime import UTC, datetime
from pathlib import Path

import numpy as np

from azentio_fl import model
from azentio_fl.client import CLIP_NORM, L2, LOCAL_EPOCHS, LR
from azentio_fl.schema import FEATURES, N_WEIGHTS, TASK

MIN_COHORT = 3
MAX_WEIGHT_SAMPLES = 1000  # caps any single participant's influence on the average
MIN_SAMPLES = 50
COSINE_FLOOR = (
    -0.2
)  # a large update pointing against the consensus is treated as suspect
DIRECTION_CHECK_MIN_NORM = (
    0.5 * CLIP_NORM
)  # small updates are harmless; skewed honest clients often diverge near convergence


@dataclass
class Scenario:
    rounds: int = 6
    dropout: dict[int, str] = field(
        default_factory=dict
    )  # round -> client that fails to respond
    poison: dict[int, str] = field(
        default_factory=dict
    )  # round -> client that sends a flipped update inside the bound
    inflate: dict[int, str] = field(
        default_factory=dict
    )  # round -> client that sends an unclipped, inflated update


def validate(update: dict, others: list[np.ndarray]) -> str | None:
    """Return a rejection reason, or None if the update is acceptable."""
    delta = np.asarray(update.get("delta", []), dtype=float)
    if delta.shape != (N_WEIGHTS,):
        return f"wrong shape {delta.shape}, expected ({N_WEIGHTS},)"
    if not np.all(np.isfinite(delta)):
        return "non-finite values"
    if np.linalg.norm(delta) > CLIP_NORM * 1.01:
        return f"update norm {np.linalg.norm(delta):.2f} exceeds clip bound {CLIP_NORM}"
    n = update.get("n_samples", 0)
    if not isinstance(n, int) or n < MIN_SAMPLES:
        return f"sample count {n} below minimum {MIN_SAMPLES}"
    if others and np.linalg.norm(delta) >= DIRECTION_CHECK_MIN_NORM:
        median = np.median(np.stack(others), axis=0)
        denom = np.linalg.norm(delta) * np.linalg.norm(median)
        if denom > 0 and float(delta @ median / denom) < COSINE_FLOOR:
            return "direction inconsistent with other participants (possible poisoning)"
    return None


def run_programme(
    root: Path, participants: list[str], scenario: Scenario, parent_version: str | None
) -> dict:
    holdout = np.load(root / "holdout" / "holdout.npz")
    w = model.zeros()
    rounds = []

    with tempfile.TemporaryDirectory() as tmp:
        tmpdir = Path(tmp)
        for rnd in range(1, scenario.rounds + 1):
            gpath = tmpdir / f"global_{rnd}.json"
            gpath.write_text(json.dumps({"weights": w.tolist()}))
            received, log = [], []
            for slug in participants:
                if scenario.dropout.get(rnd) == slug:
                    log.append(
                        {
                            "client": slug,
                            "status": "dropped",
                            "reason": "no response before round deadline",
                        }
                    )
                    continue
                out = tmpdir / f"{slug}_{rnd}.json"
                behaviour = (
                    "poison"
                    if scenario.poison.get(rnd) == slug
                    else "inflate"
                    if scenario.inflate.get(rnd) == slug
                    else "honest"
                )
                # Each participant runs in a separate process with access to its own directory only.
                proc = subprocess.run(
                    [
                        sys.executable,
                        "-m",
                        "azentio_fl.client",
                        str(root / "clients" / slug),
                        str(gpath),
                        str(out),
                        str(rnd),
                        behaviour,
                    ],
                    capture_output=True,
                    timeout=120,
                    check=False,
                )
                if proc.returncode != 0 or not out.exists():
                    log.append(
                        {
                            "client": slug,
                            "status": "dropped",
                            "reason": "participant job failed",
                        }
                    )
                    continue
                received.append(json.loads(out.read_text()))

            accepted = []
            for u in received:
                others = [np.asarray(o["delta"]) for o in received if o is not u]
                reason = validate(u, others)
                entry = {
                    "client": u["client"],
                    "n_samples": u["n_samples"],
                    "update_norm": round(float(np.linalg.norm(u["delta"])), 4),
                }
                if reason:
                    log.append({**entry, "status": "rejected", "reason": reason})
                else:
                    log.append(
                        {
                            **entry,
                            "status": "accepted",
                            "local_val": u["local_val"],
                            "pos_rate": u["pos_rate"],
                        }
                    )
                    accepted.append(u)

            if len(accepted) < MIN_COHORT:
                rounds.append(
                    {
                        "round": rnd,
                        "aggregated": False,
                        "reason": f"only {len(accepted)} valid updates, minimum cohort is {MIN_COHORT}; global model carried forward",
                        "participants": log,
                        "holdout": model.metrics(w, holdout["x"], holdout["y"]),
                    }
                )
                continue

            weights = np.array(
                [min(u["n_samples"], MAX_WEIGHT_SAMPLES) for u in accepted], dtype=float
            )
            w = w + np.average(
                np.stack([np.asarray(u["delta"]) for u in accepted]),
                axis=0,
                weights=weights,
            )
            rounds.append(
                {
                    "round": rnd,
                    "aggregated": True,
                    "contributors": len(accepted),
                    "participants": log,
                    "holdout": model.metrics(w, holdout["x"], holdout["y"]),
                }
            )

    baselines = evaluate_baselines(root, participants, holdout)
    final = model.metrics(w, holdout["x"], holdout["y"])
    digest = hashlib.sha256(np.round(w, 8).tobytes()).hexdigest()[:12]
    return {
        "task": TASK,
        "features": list(FEATURES),
        "model": "logistic regression",
        "aggregation": {
            "method": "FedAvg (sample-weighted mean of clipped deltas)",
            "weight_cap_samples": MAX_WEIGHT_SAMPLES,
            "clip_norm": CLIP_NORM,
            "min_cohort": MIN_COHORT,
            "local_epochs": LOCAL_EPOCHS,
            "lr": LR,
            "l2": L2,
        },
        "controls": {
            "update_clipping": True,
            "update_validation": True,
            "poisoning_check": "cosine similarity to median update",
            "secure_aggregation": False,
            "differential_privacy": False,
            "note": "Simulated programme on synthetic data. Plain averaging without secure aggregation or differential privacy; "
            "no formal privacy guarantee is claimed.",
        },
        "participants": participants,
        "rounds": rounds,
        "final": final,
        "baselines": baselines,
        "candidate": {
            # weights are deterministic on synthetic data, so the timestamp keeps each registration unique
            "version": f"{TASK}-{datetime.now(UTC):%Y%m%d%H%M%S}-{digest}",
            "parent_version": parent_version,
            "weights_sha256_12": digest,
            "weights": np.round(w, 6).tolist(),
        },
    }


def evaluate_baselines(root: Path, participants: list[str], holdout: dict) -> dict:
    """Comparison points, computed by the programme evaluator in a lab setting on synthetic data."""
    x, y = holdout["x"], holdout["y"]
    prior = float(y.mean())
    local_only = {}
    for slug in participants:
        d = np.load(root / "clients" / slug / "data.npz")
        w = model.train(
            model.zeros(),
            d["x_train"],
            d["y_train"],
            epochs=LOCAL_EPOCHS * 6,
            lr=LR,
            l2=L2,
            seed=0,
        )
        local_only[slug] = model.metrics(w, x, y)
    pooled_x = np.concatenate(
        [np.load(root / "clients" / s / "data.npz")["x_train"] for s in participants]
    )
    pooled_y = np.concatenate(
        [np.load(root / "clients" / s / "data.npz")["y_train"] for s in participants]
    )
    central = model.train(
        model.zeros(), pooled_x, pooled_y, epochs=LOCAL_EPOCHS * 6, lr=LR, l2=L2, seed=0
    )
    return {
        "always_prior": {
            "auc": 0.5,
            "log_loss": round(model.log_loss(y, np.full(len(y), prior)), 4),
            "accuracy": round(max(prior, 1 - prior), 4),
        },
        "local_only": local_only,
        "centralised_reference": {
            **model.metrics(central, x, y),
            "note": "Lab-only upper reference on synthetic data. Pooling client data is exactly what the programme avoids.",
        },
    }
