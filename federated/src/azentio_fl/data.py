"""Synthetic data generation. Each client's records are written only to its own directory."""

from dataclasses import dataclass
from pathlib import Path

import numpy as np


@dataclass(frozen=True)
class ClientProfile:
    slug: str
    n: int
    seasonal_share: float  # share of borrowers in seasonal sectors
    dscr_shift: float
    leverage_shift: float
    seed: int


# Deliberately skewed populations so non-IID effects are visible.
CLIENTS = (
    ClientProfile(
        "northwind-bank", 1200, 0.75, 0.10, -0.1, 11
    ),  # agri-supply heavy, seasonal
    ClientProfile(
        "meridian-finance", 800, 0.35, -0.05, 0.5, 22
    ),  # retail, more leveraged
    ClientProfile(
        "sunda-coop", 500, 0.85, -0.25, 0.0, 33
    ),  # harvest-cycle cooperatives
    ClientProfile(
        "atlas-insurance", 600, 0.15, 0.20, -0.3, 44
    ),  # trade-credit SME book, flat revenue
)


def generate(
    profile: ClientProfile | None, n: int, seed: int
) -> tuple[np.ndarray, np.ndarray]:
    rng = np.random.default_rng(seed)
    seasonal_share = profile.seasonal_share if profile else 0.45
    seasonal = (rng.random(n) < seasonal_share).astype(float)
    dscr = np.clip(
        rng.normal(1.4 + (profile.dscr_shift if profile else 0), 0.45, n), 0.2, 4
    )
    leverage = np.clip(
        rng.normal(1.8 + (profile.leverage_shift if profile else 0), 0.7, n), 0.1, 6
    )
    seasonality = np.clip(
        0.27 + seasonal * rng.normal(0.15, 0.05, n) + rng.normal(0, 0.03, n), 0.25, 0.7
    )
    # Seasonal businesses have high revenue volatility that is NOT a risk signal on its own.
    volatility = np.clip(
        rng.normal(0.22, 0.08, n) + 0.9 * (seasonality - 0.27) + rng.normal(0, 0.03, n),
        0.02,
        1,
    )
    months = np.clip(rng.lognormal(3.6, 0.7, n), 6, 400)
    overdue = np.clip(rng.exponential(0.25, n) * (rng.random(n) < 0.4), 0, 4)

    # True risk: volatility in excess of what seasonality explains is the real signal.
    excess_vol = volatility - 0.9 * (seasonality - 0.27)
    logit = (
        -2.2
        - 1.4 * (dscr - 1.4)
        + 0.7 * (leverage - 1.8)
        + 6.0 * (excess_vol - 0.22)
        + 1.3 * overdue
        - 0.35 * (np.log(months) - 3.6)
    )
    y = (rng.random(n) < 1 / (1 + np.exp(-logit))).astype(float)
    x = np.column_stack(
        [dscr, leverage, volatility, seasonality, np.log(months), overdue, seasonal]
    )
    return x, y


def write_client_datasets(root: Path) -> None:
    for c in CLIENTS:
        x, y = generate(c, c.n, c.seed)
        d = root / "clients" / c.slug
        d.mkdir(parents=True, exist_ok=True)
        cut = int(0.8 * len(y))  # local validation split stays local too
        np.savez(
            d / "data.npz",
            x_train=x[:cut],
            y_train=y[:cut],
            x_val=x[cut:],
            y_val=y[cut:],
        )


def write_holdout(root: Path) -> None:
    """Separate synthetic holdout from the overall population, held by the programme evaluator."""
    x, y = generate(None, 2000, 999)
    (root / "holdout").mkdir(parents=True, exist_ok=True)
    np.savez(root / "holdout" / "holdout.npz", x=x, y=y)
