"""azentio-fl command line.

azentio-fl setup               generate isolated synthetic client datasets and the holdout
azentio-fl run [--publish]     run a programme with a dropout and a poisoning scenario
"""

import argparse
import json
from pathlib import Path

from azentio_fl import data, registry
from azentio_fl.coordinator import Scenario, run_programme

ROOT = Path(__file__).resolve().parents[2] / "workspace"


def main() -> None:
    ap = argparse.ArgumentParser(prog="azentio-fl")
    sub = ap.add_subparsers(dest="cmd", required=True)
    sub.add_parser("setup")
    r = sub.add_parser("run")
    r.add_argument(
        "--publish",
        action="store_true",
        help="read consent from and publish results to the portal",
    )
    r.add_argument("--rounds", type=int, default=10)
    args = ap.parse_args()

    if args.cmd == "setup":
        data.write_client_datasets(ROOT)
        data.write_holdout(ROOT)
        print(f"wrote {len(data.CLIENTS)} client datasets and a holdout under {ROOT}")
        return

    if args.publish and registry.configured():
        participants, parent = registry.opted_in_slugs(), registry.deployed_version()
    else:
        participants, parent = [c.slug for c in data.CLIENTS], None
    missing = [
        s for s in participants if not (ROOT / "clients" / s / "data.npz").exists()
    ]
    participants = [s for s in participants if s not in missing]
    print(
        f"participants (opted in): {', '.join(participants)}"
        + (f"; no local environment for {', '.join(missing)}" if missing else "")
    )

    scenario = Scenario(
        rounds=args.rounds,
        dropout={3: "meridian-finance"},
        poison={2: "sunda-coop"},
        inflate={5: "atlas-insurance"},
    )
    report = run_programme(ROOT, participants, scenario, parent)
    for rd in report["rounds"]:
        flags = [
            f"{p['client']}:{p['status']}"
            for p in rd["participants"]
            if p["status"] != "accepted"
        ]
        print(
            f"round {rd['round']}: aggregated={rd['aggregated']} holdout_auc={rd['holdout']['auc']} {' '.join(flags)}"
        )
    b = report["baselines"]
    print(
        f"final AUC {report['final']['auc']} | prior 0.5 | local-only "
        + ", ".join(f"{k} {v['auc']}" for k, v in b["local_only"].items())
        + f" | centralised reference {b['centralised_reference']['auc']}"
    )
    (ROOT / "last_report.json").write_text(json.dumps(report, indent=2))
    if args.publish:
        try:
            run_id = registry.publish(report)
        except RuntimeError as e:
            raise SystemExit(f"error: {e}") from None
        print(f"published run {run_id} with candidate {report['candidate']['version']}")
