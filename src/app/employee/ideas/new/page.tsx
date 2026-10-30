import { requirePlatformRole } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { createIdea } from "@/app/actions/ideas";
import { EvidencePicker } from "@/components/evidence-picker";
import { Button, Card, Container, Notice, PageHeader } from "@/components/ui";

export default async function NewIdea({ searchParams }: PageProps<"/employee/ideas/new">) {
  const { error } = await searchParams;
  await requirePlatformRole("product_owner");
  const supabase = await createClient();
  const [{ data: offerings }, { data: themes }] = await Promise.all([supabase.from("offerings").select("id, name"), supabase.from("themes").select("id, title")]);
  return (
    <Container className="max-w-3xl pb-16">
      <PageHeader title="New improvement idea" />
      {typeof error === "string" && <div className="mb-4"><Notice tone="danger">{error}</Notice></div>}
      <Card>
        <form action={createIdea} className="grid gap-3">
          <label className="label" htmlFor="title">Title</label><input id="title" name="title" required className="input" />
          <label className="label" htmlFor="problem">Problem statement (internal)</label><textarea id="problem" name="problem" rows={3} required className="input" />
          <label className="label" htmlFor="proposed_outcome">Proposed outcome (internal)</label><textarea id="proposed_outcome" name="proposed_outcome" rows={3} required className="input" />
          <div className="grid gap-3 md:grid-cols-2">
            <div><label className="label" htmlFor="offering_id">Offering</label><select id="offering_id" name="offering_id" className="input"><option value="">None</option>{offerings?.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}</select></div>
            <div><label className="label" htmlFor="theme_id">Theme</label><select id="theme_id" name="theme_id" className="input"><option value="">None</option>{themes?.map((t) => <option key={t.id} value={t.id}>{t.title}</option>)}</select></div>
            <div><label className="label" htmlFor="owner_team">Owner team</label><input id="owner_team" name="owner_team" required className="input" /></div>
            <div><label className="label" htmlFor="priority">Priority</label><select id="priority" name="priority" defaultValue="medium" className="input"><option>low</option><option>medium</option><option>high</option></select></div>
          </div>
          <EvidencePicker />
          <div><Button>Create idea</Button></div>
        </form>
      </Card>
    </Container>
  );
}
