"""Minimal HTTP trigger for hosting the simulated coordinator (e.g. a Render free web service).

POST /run with header "Authorization: Bearer $FL_TRIGGER_SECRET" runs a programme on synthetic
data and publishes the report to the portal. GET /health returns ok.
"""

import json
import os
import threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

from azentio_fl import data, registry
from azentio_fl.cli import ROOT
from azentio_fl.coordinator import Scenario, run_programme

_lock = threading.Lock()


class Handler(BaseHTTPRequestHandler):
    def _send(self, code: int, body: dict) -> None:
        self.send_response(code)
        self.send_header("content-type", "application/json")
        self.end_headers()
        self.wfile.write(json.dumps(body).encode())

    def do_GET(self) -> None:
        self._send(200, {"ok": True}) if self.path == "/health" else self._send(
            404, {"error": "not found"}
        )

    def do_POST(self) -> None:
        secret = os.environ.get("FL_TRIGGER_SECRET")
        if (
            self.path != "/run"
            or not secret
            or self.headers.get("authorization") != f"Bearer {secret}"
        ):
            return self._send(401, {"error": "unauthorized"})
        if not _lock.acquire(blocking=False):
            return self._send(409, {"error": "a run is already in progress"})
        try:
            if not (ROOT / "holdout" / "holdout.npz").exists():
                data.write_client_datasets(ROOT)
                data.write_holdout(ROOT)
            participants = [
                s
                for s in registry.opted_in_slugs()
                if (ROOT / "clients" / s / "data.npz").exists()
            ]
            report = run_programme(
                ROOT,
                participants,
                Scenario(
                    rounds=10, dropout={3: "meridian-finance"}, poison={2: "sunda-coop"}
                ),
                registry.deployed_version(),
            )
            run_id = registry.publish(report)
            self._send(
                200,
                {
                    "run_id": run_id,
                    "candidate": report["candidate"]["version"],
                    "final": report["final"],
                },
            )
        finally:
            _lock.release()


def serve() -> None:
    port = int(os.environ.get("PORT", "8000"))
    ThreadingHTTPServer(("0.0.0.0", port), Handler).serve_forever()


if __name__ == "__main__":
    serve()
