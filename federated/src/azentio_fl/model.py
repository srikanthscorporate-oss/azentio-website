"""Logistic regression primitives in plain numpy."""

import numpy as np

from azentio_fl.schema import MEANS, N_WEIGHTS, SCALES


def standardise(x: np.ndarray) -> np.ndarray:
    return (x - np.asarray(MEANS)) / np.asarray(SCALES)


def predict(w: np.ndarray, x: np.ndarray) -> np.ndarray:
    z = standardise(x) @ w[:-1] + w[-1]
    return 1.0 / (1.0 + np.exp(-np.clip(z, -30, 30)))


def train(
    w: np.ndarray,
    x: np.ndarray,
    y: np.ndarray,
    *,
    epochs: int,
    lr: float,
    l2: float,
    seed: int,
) -> np.ndarray:
    """Mini-batch SGD starting from w. Returns new weights."""
    rng = np.random.default_rng(seed)
    w = w.copy()
    xs = standardise(x)
    for _ in range(epochs):
        order = rng.permutation(len(y))
        for start in range(0, len(y), 32):
            idx = order[start : start + 32]
            p = 1.0 / (1.0 + np.exp(-np.clip(xs[idx] @ w[:-1] + w[-1], -30, 30)))
            err = p - y[idx]
            grad = np.append(xs[idx].T @ err / len(idx) + l2 * w[:-1], err.mean())
            w -= lr * grad
    return w


def zeros() -> np.ndarray:
    return np.zeros(N_WEIGHTS)


def auc(y: np.ndarray, p: np.ndarray) -> float:
    """Rank-based ROC AUC (Mann-Whitney U)."""
    order = np.argsort(p)
    ranks = np.empty(len(p))
    ranks[order] = np.arange(1, len(p) + 1)
    pos = y == 1
    n_pos, n_neg = pos.sum(), (~pos).sum()
    if n_pos == 0 or n_neg == 0:
        return float("nan")
    return float((ranks[pos].sum() - n_pos * (n_pos + 1) / 2) / (n_pos * n_neg))


def log_loss(y: np.ndarray, p: np.ndarray) -> float:
    p = np.clip(p, 1e-7, 1 - 1e-7)
    return float(-(y * np.log(p) + (1 - y) * np.log(1 - p)).mean())


def metrics(w: np.ndarray, x: np.ndarray, y: np.ndarray) -> dict[str, float]:
    p = predict(w, x)
    return {
        "auc": round(auc(y, p), 4),
        "log_loss": round(log_loss(y, p), 4),
        "accuracy": round(float(((p >= 0.5) == y).mean()), 4),
    }
