"""Reads programme consent from, and publishes run reports to, the azentio.ai portal (Supabase REST).
Only metrics, participation and validation outcomes are sent. Never training examples."""

import json
import os
import urllib.error
import urllib.request


def _req(path: str, method: str = "GET", body: object | None = None) -> object:
    url = os.environ["NEXT_PUBLIC_SUPABASE_URL"].rstrip("/") + "/rest/v1/" + path
    key = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
    req = urllib.request.Request(
        url,
        method=method,
        data=json.dumps(body).encode() if body is not None else None,
        headers={
            "apikey": key,
            "authorization": f"Bearer {key}",
            "content-type": "application/json",
            "prefer": "return=representation",
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            return json.loads(r.read() or b"null")
    except urllib.error.HTTPError as e:
        detail = e.read().decode(errors="replace")[:300]
        msg = f"portal API {method} {path.split('?')[0]} failed: HTTP {e.code} {detail}"
        raise RuntimeError(msg) from None


def configured() -> bool:
    return bool(
        os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
        and os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    )


def opted_in_slugs() -> list[str]:
    rows = _req("fl_participants?status=eq.opted_in&select=organizations(slug)")
    return sorted(r["organizations"]["slug"] for r in rows)  # type: ignore[index, union-attr]


def deployed_version() -> str | None:
    rows = _req("fl_models?status=eq.deployed&select=version")
    return rows[0]["version"] if rows else None  # type: ignore[index]


def publish(report: dict) -> str:
    public = {k: v for k, v in report.items() if k != "candidate"} | {
        "candidate": {k: v for k, v in report["candidate"].items() if k != "weights"}
    }
    [run] = _req("fl_runs", "POST", {"task": report["task"], "report": public})  # type: ignore[misc]
    c = report["candidate"]
    try:
        _req(
            "fl_models",
            "POST",
            {
                "version": c["version"],
                "run_id": run["id"],
                "parent_version": c["parent_version"],
                "metrics": report["final"],
            },
        )
    except RuntimeError:
        _req(
            f"fl_runs?id=eq.{run['id']}", "DELETE"
        )  # don't leave a run without its candidate
        raise
    return run["id"]
