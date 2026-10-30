import { Fragment } from "react";
import { hasPlatformRole, requirePlatformRole } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { decideModel } from "@/app/actions/federated";
import { Badge, Button, Card, Container, Empty, Notice, PageHeader, Stat, fmtDate, label } from "@/components/ui";

type Metrics = { auc: number; log_loss: number; accuracy: number };
type Participant = { client: string; status: string; reason?: string; n_samples?: number; update_norm?: number };
type Report = {
  task: string; model: string; features: string[]; participants: string[];
  aggregation: Record<string, string | number>; controls: Record<string, string | boolean>;
  rounds: { round: number; aggregated: boolean; reason?: string; contributors?: number; participants: Participant[]; holdout: Metrics }[];
  final: Metrics; baselines: { always_prior: Metrics; local_only: Record<string, Metrics>; centralised_reference: Metrics & { note: string } };
  candidate: { version: string; parent_version: string | null };
};

const NEXT: Record<string, string[]> = { candidate: ["approve", "reject"], approved: ["deploy"], deployed: ["rollback"] };

export default async function Federated({ searchParams }: PageProps<"/employee/federated">) {
  const { error } = await searchParams;
  const v = await requirePlatformRole("employee");
  const canDecide = hasPlatformRole(v, "product_owner") || hasPlatformRole(v, "portal_admin");
  const supabase = await createClient();
  const [{ data: runs }, { data: models }, { data: parts }] = await Promise.all([
    supabase.from("fl_runs").select("id, report, created_at").order("created_at", { ascending: false }).limit(1),
    supabase.from("fl_models").select("*").order("created_at", { ascending: false }),
    supabase.rpc("fl_participant_list"),
  ]);
  const run = runs?.[0];
  const r = run?.report as Report | undefined;

  return (
    <Container className="pb-16">
      <PageHeader eyebrow="Advanced track · P2" title="Federated learning programme">
        Separate opt-in programme. Clients train locally on their own records; only clipped model updates are aggregated. Synthetic data only.
        This is not the collective learning hub and uses none of its contributions.
      </PageHeader>
      {typeof error === "string" && <div className="mb-4"><Notice tone="danger">{error}</Notice></div>}

      <section className="mb-10">
        <h2 className="mb-3 font-semibold">Programme participants</h2>
        <div className="flex flex-wrap gap-2">
          {(parts as { org_name: string; status: string }[] | null)?.map((p) => (
            <Badge key={p.org_name} tone={p.status === "opted_in" ? "brand" : "neutral"}>
              {p.org_name}: {p.status === "opted_in" ? "opted in" : "withdrawn"}
            </Badge>
          ))}
          {!parts?.length && <p className="text-sm text-muted">No organisation has opted in.</p>}
        </div>
      </section>

      {!r ? <Empty title="No programme runs yet">Run <code>uv run azentio-fl run --publish</code> in <code>federated/</code>.</Empty> : (
        <>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
            <Stat label="Federated AUC" value={r.final.auc} hint={`${r.rounds.length} rounds · ${r.participants.length} participants`} />
            <Stat label="Base rate baseline" value={r.baselines.always_prior.auc} />
            <Stat label="Best local-only" value={Math.max(...Object.values(r.baselines.local_only).map((m) => m.auc))} />
            <Stat label="Centralised reference" value={r.baselines.centralised_reference.auc} hint="Lab only. Pools data." />
          </div>

          <div className="mt-4">
            <Notice tone="warn">
              <b>Controls:</b> clipping and update validation are on. Secure aggregation: <b>{String(r.controls.secure_aggregation)}</b>.
              Differential privacy: <b>{String(r.controls.differential_privacy)}</b>. {String(r.controls.note)}
            </Notice>
          </div>

          <div className="mt-8 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
            <Card>
              <h2 className="mb-3 font-semibold">Round log</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="border-b border-line text-left text-muted"><th className="py-2 pr-3">Round</th><th className="pr-3">Holdout AUC</th><th>Participation</th></tr></thead>
                  <tbody>
                    {r.rounds.map((rd) => (
                      <tr key={rd.round} className="border-b border-line align-top last:border-0">
                        <td className="py-2 pr-3">{rd.round}</td>
                        <td className="pr-3">{rd.holdout.auc}{!rd.aggregated && <span className="block text-xs text-warn">skipped</span>}</td>
                        <td className="py-2">
                          <div className="flex flex-wrap gap-1">
                            {rd.participants.map((p) => (
                              <span key={p.client} title={p.reason}>
                                <Badge tone={p.status === "accepted" ? "brand" : p.status === "rejected" ? "danger" : "warn"}>{p.client.split("-")[0]}: {p.status}</Badge>
                              </span>
                            ))}
                          </div>
                          {rd.participants.filter((p) => p.reason).map((p) => <p key={p.client} className="mt-1 text-xs text-muted">{p.client}: {p.reason}</p>)}
                          {rd.reason && <p className="mt-1 text-xs text-warn">{rd.reason}</p>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
            <div className="grid content-start gap-4">
              <Card>
                <h2 className="mb-3 font-semibold">Holdout comparison</h2>
                <dl className="grid grid-cols-[1fr_auto] gap-y-1 text-sm">
                  <dt>Always base rate</dt><dd>{r.baselines.always_prior.auc}</dd>
                  {Object.entries(r.baselines.local_only).map(([k, m]) => <Fragment key={k}><dt>Local only: {k}</dt><dd>{m.auc}</dd></Fragment>)}
                  <dt className="font-semibold">Federated</dt><dd className="font-semibold">{r.final.auc}</dd>
                  <dt className="text-muted">Centralised reference</dt><dd className="text-muted">{r.baselines.centralised_reference.auc}</dd>
                </dl>
              </Card>
              <Card className="text-sm">
                <h2 className="mb-2 font-semibold">Task</h2>
                <p>{r.task} · {r.model}</p>
                <p className="mt-1 text-muted">Features: {r.features.join(", ")}</p>
                <p className="mt-1 text-muted">Aggregation: {String(r.aggregation.method)}; clip {r.aggregation.clip_norm}; min cohort {r.aggregation.min_cohort}; weight cap {r.aggregation.weight_cap_samples} samples</p>
                <p className="mt-1 text-muted">Run {fmtDate(run?.created_at)}</p>
              </Card>
            </div>
          </div>
        </>
      )}

      <h2 className="mb-3 mt-10 font-semibold">Model registry</h2>
      <p className="mb-3 text-sm text-muted">Candidates are never deployed automatically. Every decision needs a note and is audited. Rollback restores the previous approved version.</p>
      {!models?.length ? <Empty title="No candidate models" /> : (
        <div className="grid gap-3">
          {models.map((m) => (
            <Card key={m.id} className="grid gap-3 md:grid-cols-[1fr_auto] md:items-center">
              <div>
                <div className="flex flex-wrap items-center gap-2"><p className="font-mono text-sm">{m.version}</p><Badge tone={m.status === "deployed" ? "brand" : m.status === "rejected" || m.status === "rolled_back" ? "danger" : "warn"}>{label(m.status)}</Badge></div>
                <p className="mt-1 text-xs text-muted">AUC {(m.metrics as Metrics).auc} · parent {m.parent_version ?? "none"} · created {fmtDate(m.created_at)}{m.decision_note && ` · note: ${m.decision_note}`}</p>
              </div>
              {canDecide && NEXT[m.status] && (
                <form action={decideModel} className="flex flex-wrap gap-2">
                  <input type="hidden" name="id" value={m.id} />
                  <input name="note" required placeholder="Decision note" className="input w-56" />
                  {NEXT[m.status].map((a) => <Button key={a} name="action" value={a} variant={a === "reject" || a === "rollback" ? "danger" : "primary"}>{label(a)}</Button>)}
                </form>
              )}
            </Card>
          ))}
        </div>
      )}
    </Container>
  );
}
