import { createClient } from "@/lib/supabase/server";
import { SCENARIOS } from "@/lib/sandbox";
import { rateRun, runSandbox } from "@/app/actions/sandbox";
import { Badge, Button, Card, Empty, Notice, fmtDate } from "@/components/ui";

type Off = { id: string; slug: string; name: string };

export async function Sandbox({ offerings, context, error }: { offerings: Off[]; context: "client" | "employee"; error?: string }) {
  const supabase = await createClient();
  const { data: runs } = await supabase.from("sandbox_runs").select("id, scenario, output, inputs, feedback_rating, created_at, offerings(name)").order("created_at", { ascending: false }).limit(10);
  const path = context === "employee" ? "/employee/playground" : "/client/sandbox";
  if (!offerings.length) return <Empty title="No sandboxes are enabled for your organisation">Ask your Azentio contact about product entitlements.</Empty>;

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="grid min-w-0 grid-cols-1 content-start gap-4">
        {error && <Notice tone="danger">{error}</Notice>}
        <Notice tone="warn">Sample data only. Outputs are simulated and are not approved credit or business decisions.</Notice>
        {offerings.map((o) => (
          <Card key={o.id}>
            <p className="font-semibold">{o.name}</p>
            <div className="mt-3 grid grid-cols-1 gap-3">
              {(SCENARIOS[o.slug] ?? []).map((s) => (
                <form key={s.id} action={runSandbox} className="rounded-xl border border-line p-3">
                  <input type="hidden" name="context" value={context} />
                  <input type="hidden" name="offering" value={o.slug} />
                  <input type="hidden" name="scenario" value={s.id} />
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0"><p className="font-medium">{s.name} <Badge>synthetic</Badge></p><p className="text-sm text-muted">{s.description}</p></div>
                    <Button variant="outline">Run</Button>
                  </div>
                  <pre className="mt-2 whitespace-pre-wrap break-all rounded bg-bg p-2 text-xs">{JSON.stringify(s.inputs)}</pre>
                </form>
              ))}
            </div>
          </Card>
        ))}
      </div>
      <div className="grid min-w-0 grid-cols-1 content-start gap-3">
        <p className="font-semibold">Your runs</p>
        {!runs?.length && <Empty title="No runs yet" />}
        {runs?.map((r) => {
          const out = r.output as { headline: string; evidence: string[]; caveat: string };
          return (
            <Card key={r.id}>
              <p className="text-xs text-muted">{(r.offerings as unknown as { name: string })?.name} · {r.scenario} · {fmtDate(r.created_at)}</p>
              <p className="mt-1 font-medium">{out.headline}</p>
              <ul className="mt-2 list-disc pl-5 text-sm text-muted">{out.evidence.map((e) => <li key={e}>{e}</li>)}</ul>
              <p className="mt-2 text-xs text-warn">{out.caveat}</p>
              {r.feedback_rating ? <p className="mt-2 text-xs">Your feedback: <Badge tone="brand">{r.feedback_rating.replace("_", " ")}</Badge></p> : (
                <form action={rateRun} className="mt-3 flex flex-wrap gap-2">
                  <input type="hidden" name="id" value={r.id} /><input type="hidden" name="path" value={path} />
                  <input name="note" placeholder="Optional note" maxLength={1000} className="input max-w-xs" />
                  {["useful", "needs_evidence", "not_useful"].map((x) => <Button key={x} name="rating" value={x} variant="outline">{x.replace("_", " ")}</Button>)}
                </form>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
