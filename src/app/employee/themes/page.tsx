import { requirePlatformRole } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { createTheme } from "@/app/actions/ideas";
import { EvidencePicker } from "@/components/evidence-picker";
import { Badge, Button, Card, Container, Notice, PageHeader } from "@/components/ui";
import { suggestThemes } from "@/lib/clustering";

export default async function NewTheme({ searchParams }: PageProps<"/employee/themes">) {
  const { error } = await searchParams;
  await requirePlatformRole("product_owner");
  const supabase = await createClient();
  const [{ data: offerings }, { data: shared }, { data: linked }] = await Promise.all([
    supabase.from("offerings").select("id, name"),
    supabase.from("shared_contributions").select("id, title, body").eq("status", "published"),
    supabase.from("theme_links").select("shared_id"),
  ]);
  // Suggest groupings among contributions not yet linked to any theme.
  const used = new Set(linked?.map((l) => l.shared_id));
  const suggestions = suggestThemes((shared ?? []).filter((d) => !used.has(d.id)));
  return (
    <Container className="max-w-3xl pb-16">
      <PageHeader title="New theme">Group approved contributions. Distinct-organisation counts are computed automatically and suppressed below the minimum cohort.</PageHeader>
      {typeof error === "string" && <div className="mb-4"><Notice tone="danger">{error}</Notice></div>}
      <section className="mb-10">
        <h2 className="title-sm mb-1">Suggested groupings</h2>
        <p className="mb-4 text-sm text-muted">
          Computed from the wording of approved, unthemed contributions. Similar wording is not proof of a shared cause or of market prevalence.
          Distinct-organisation counts are calculated (and suppressed below the minimum) once a theme is created.
        </p>
        {!suggestions.length ? <p className="text-sm text-muted">No groupings found among unthemed contributions.</p> : (
          <div className="grid gap-3">
            {suggestions.map((g) => (
              <Card key={g.members.map((m) => m.id).join()}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold">{g.label || "Related contributions"}</p>
                    <p className="mt-1 text-xs text-muted">{g.members.length} contributions · wording similarity {g.cohesion} · <Badge tone="warn">Uncertain: text similarity only</Badge></p>
                    <ul className="mt-2 list-disc pl-5 text-sm">{g.members.map((m) => <li key={m.id}><a href={`/learning/${m.id}`} className="underline">{m.title}</a></li>)}</ul>
                  </div>
                  <form action={createTheme}>
                    <input type="hidden" name="title" value={g.label || "Related contributions"} />
                    <input type="hidden" name="summary" value={`Contributions that discuss ${g.terms.join(", ")}. Review the linked evidence before relying on this theme.`} />
                    <input type="hidden" name="limitations" value="Suggested by text similarity on a small, self-reported sample. Not evidence of market prevalence or causation." />
                    {g.members.map((m) => <input key={m.id} type="hidden" name="evidence" value={m.id} />)}
                    <Button variant="outline">Create theme from this</Button>
                  </form>
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>
      <Card>
        <form action={createTheme} className="grid gap-3">
          <label className="label" htmlFor="title">Title</label><input id="title" name="title" required className="input" />
          <label className="label" htmlFor="summary">Summary (visible to participants)</label><textarea id="summary" name="summary" rows={3} required className="input" />
          <label className="label" htmlFor="limitations">Limitations & confidence</label>
          <textarea id="limitations" name="limitations" rows={2} required className="input" defaultValue="Small, self-selected sample. Not evidence of market prevalence or causation." />
          <label className="label" htmlFor="offering_id">Offering</label>
          <select id="offering_id" name="offering_id" className="input"><option value="">Cross-offering</option>{offerings?.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}</select>
          <EvidencePicker />
          <div><Button>Create theme</Button></div>
        </form>
      </Card>
    </Container>
  );
}
