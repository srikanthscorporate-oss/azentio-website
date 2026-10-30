import { requirePlatformRole } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { createTheme } from "@/app/actions/ideas";
import { EvidencePicker } from "@/components/evidence-picker";
import { Button, Card, Container, Notice, PageHeader } from "@/components/ui";

export default async function NewTheme({ searchParams }: PageProps<"/employee/themes">) {
  const { error } = await searchParams;
  await requirePlatformRole("product_owner");
  const supabase = await createClient();
  const { data: offerings } = await supabase.from("offerings").select("id, name");
  return (
    <Container className="max-w-3xl pb-16">
      <PageHeader title="New theme">Group approved contributions. Distinct-organisation counts are computed automatically and suppressed below the minimum cohort.</PageHeader>
      {typeof error === "string" && <div className="mb-4"><Notice tone="danger">{error}</Notice></div>}
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
