# Federated learning programme (P2, optional track)

A separate, opt-in programme. It is not the collective learning hub, and it never uses contributions
from the hub. Each participating client environment trains locally on its own records; only bounded
model updates reach the coordinator.

Everything here runs on **synthetic data**. All controls are labelled for what they are.

## Learning task
| | |
|---|---|
| Task | `sme-stress-12m`: will a synthetic SME borrower reach 90+ days past due within 12 months |
| Model | Logistic regression (8 weights incl. bias), so updates are fixed-length vectors |
| Features | `dscr`, `leverage`, `revenue_volatility`, `seasonality_index`, `log_months_trading`, `overdue_days_90d`, `seasonal_sector` |
| Compatibility | Same features, order, units and programme-fixed standardisation constants (`schema.py`). Updates with another shape are rejected. |
| Participants | 4 isolated synthetic datasets: Northwind (agri, seasonal), Meridian (retail, leveraged), Sunda (harvest cooperatives), Atlas (flat-revenue trade credit) |
| Holdout | 2,000 synthetic records from the overall population, held by the programme evaluator |

## How a round works
1. The coordinator reads which organisations have **opted in** (`fl_participants`, set by each client admin in the portal; separate from membership and from contribution consent).
2. It publishes the current global weights. Each participant runs `azentio_fl.client` **as its own process**, reading only its own directory. It trains 3 local epochs, clips the update to L2 norm 1.0, and returns the delta, its sample count and local validation metrics. No records.
3. The coordinator validates each update: shape, finite values, norm within the clip bound, minimum sample count, and for large updates a direction check against the median of the other updates.
4. If fewer than **3** valid updates arrive, the round is skipped and the global model carries forward.
5. Otherwise it averages the valid deltas, weighted by sample count capped at 1,000 (limits any one participant's influence).
6. After the final round the model is evaluated on the holdout and registered as a **candidate**. It is never deployed automatically.

## Result on the demo run (10 rounds)
| Model | Holdout AUC |
|---|---|
| Always predict the base rate | 0.500 |
| Local-only: Sunda / Northwind / Atlas / Meridian | 0.720 / 0.737 / 0.745 / 0.759 |
| **Federated (FedAvg)** | **0.755** |
| Centralised reference (lab only, pools data) | about 0.76 |

The federated model beats three of the four local-only models and is close to the pooled reference
without pooling data. Meridian's local-only model is slightly better because its population happens
to resemble the holdout. Federated learning helps most for small or skewed participants (Sunda: +0.035).

### Scenarios included in every run
- **Round 2, poisoning**: Sunda sends a flipped update scaled to sit exactly inside the clip bound. Rejected by the direction check.
- **Round 3, dropout**: Meridian does not respond. 3 valid updates remain, so the round proceeds.
- **Round 5, misbehaving client**: Atlas sends an unclipped, inflated update. Rejected by the norm bound.

### Skewed (non-IID) data
Clients differ in sector mix, leverage and base rate. Seasonal clients see high revenue volatility
that is not risk, so a seasonal-heavy local model learns a different volatility weight from a
flat-revenue one. Effects we observed and handled:
- Near convergence, skewed honest clients send small updates in legitimately different directions. An early version flagged one as poisoning; the direction check now applies only to updates of at least half the clip bound.
- Sample weighting favours large participants; the 1,000-sample cap limits that.
- One global model may serve a skewed participant less well than its own local model. The report includes each participant's local validation metrics for the global and local model so this is visible.

## Threat model (honest summary)
| Threat | Status in this demo |
|---|---|
| Raw data leaving a client | Mitigated by design: client process returns only a delta, count and aggregate metrics. Tested (`test_report_contains_no_training_examples`). |
| Update leakage (inferring records from updates) | **Not mitigated.** Gradients and deltas can leak information. Production needs secure aggregation and differential privacy. |
| Poisoning / backdoors by a malicious client | Partly mitigated: clipping, norm bound, direction check, influence cap, minimum cohort. A careful attacker can still evade simple checks. |
| Unauthenticated participants | Simulated: participants are local processes. Production needs mutual TLS or signed updates per enrolled participant. |
| Small cohorts | Minimum of 3 valid updates per round. |
| Coordinator compromise | Not addressed in the demo; production needs secure aggregation so the coordinator never sees individual updates. |

**Not implemented and not claimed:** secure aggregation, differential privacy, formal privacy
guarantees. The run report states `secure_aggregation: false` and `differential_privacy: false`.
A production design would add secure aggregation (e.g. pairwise masking) and DP-FedAvg with
per-round Gaussian noise on clipped updates and a declared privacy accountant (epsilon, delta).

## Consent, withdrawal and lineage
- Joining a workspace, or consenting to contribution publishing, does not enrol an organisation. Only a client admin's explicit opt-in does, with history in `fl_consent_history`.
- **Withdrawal** stops future participation: the coordinator only invites currently opted-in organisations. Updates already aggregated into earlier model versions cannot be removed ("untraining" is not promised). The programme policy is to retire any deployed model that a withdrawn participant contributed to at the next scheduled retrain, and to record that decision.
- **Lineage**: each candidate records its version (task + weights hash), parent (the deployed version at run time), participants, round log, aggregation settings and metrics. Training examples are never in the coordinator logs or in what is published to the portal.
- **Deployment**: candidate, then approved or rejected, then deployed, each with a mandatory human decision note, audited. Rollback marks the deployed version `rolled_back` and redeploys the previous approved version.

## Run it
```bash
cd federated
uv sync
uv run azentio-fl setup            # create isolated synthetic client datasets + holdout in ./workspace
uv run azentio-fl run              # local run, report in workspace/last_report.json
uv run --env-file ../.env.local azentio-fl run --publish   # use portal consent and publish to the portal
uv run pytest
```
Optional hosting: `render.yaml` (repo root) deploys `azentio_fl.server` as a Render free web service.
`POST /run` with `Authorization: Bearer $FL_TRIGGER_SECRET` runs and publishes a programme.
