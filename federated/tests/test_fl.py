import json
from pathlib import Path

import numpy as np
import pytest

from azentio_fl import data, model
from azentio_fl.coordinator import MIN_COHORT, Scenario, run_programme, validate
from azentio_fl.schema import N_WEIGHTS


def upd(delta, n=500):
    return {"delta": list(delta), "n_samples": n}


def test_validate_rejects_bad_updates():
    good = np.full(N_WEIGHTS, 0.2)
    assert validate(upd(good), [good, good]) is None
    assert "shape" in validate(upd(np.ones(3)), [])
    assert "non-finite" in validate(upd([np.nan] * N_WEIGHTS), [])
    assert "clip bound" in validate(upd(good * 10), [])
    assert "sample count" in validate(upd(good, n=5), [])
    flipped = -good / np.linalg.norm(good)  # inside the bound but against consensus
    assert "poisoning" in validate(upd(flipped), [good, good, good])


def test_small_divergent_updates_are_not_flagged():
    good = np.full(N_WEIGHTS, 0.2)
    assert validate(upd(-good * 0.1), [good, good]) is None


@pytest.fixture(scope="module")
def workspace(tmp_path_factory) -> Path:
    root = tmp_path_factory.mktemp("ws")
    data.write_client_datasets(root)
    data.write_holdout(root)
    return root


def test_programme_handles_dropout_poisoning_and_min_cohort(workspace):
    slugs = [c.slug for c in data.CLIENTS]
    report = run_programme(
        workspace,
        slugs,
        Scenario(rounds=4, dropout={2: slugs[1]}, poison={3: slugs[2]}),
        None,
    )
    statuses = {
        (r["round"], p["client"]): p["status"]
        for r in report["rounds"]
        for p in r["participants"]
    }
    assert statuses[(2, slugs[1])] == "dropped"
    assert statuses[(3, slugs[2])] == "rejected"
    assert all(r["aggregated"] for r in report["rounds"])
    assert report["final"]["auc"] > 0.65  # better than the 0.5 prior baseline

    small = run_programme(workspace, slugs[: MIN_COHORT - 1], Scenario(rounds=1), None)
    assert small["rounds"][0]["aggregated"] is False


def test_report_contains_no_training_examples(workspace):
    report = run_programme(
        workspace, [c.slug for c in data.CLIENTS], Scenario(rounds=1), None
    )
    text = json.dumps(report)
    x = np.load(workspace / "clients" / data.CLIENTS[0].slug / "data.npz")["x_train"]
    # no raw feature row from a client appears in the coordinator's report
    assert not any(f"{v:.6f}" in text for v in x[:20, 0])
    assert set(report["controls"]) >= {"secure_aggregation", "differential_privacy"}
    assert report["controls"]["secure_aggregation"] is False


def test_auc():
    assert model.auc(np.array([0, 0, 1, 1.0]), np.array([0.1, 0.2, 0.8, 0.9])) == 1.0
