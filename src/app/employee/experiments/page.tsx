import { requirePlatformRole } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { setExperimentStatus, submitExperiment } from "@/app/actions/collab";
import { Badge, Button, Card, Container, Empty, Notice, PageHeader, fmtDate, label } from "@/components/ui";

export default async function Experiments({ searchParams }: PageProps<"/employee/experiments">) {
  const { error } = await searchParams;
  const v = await requirePlatformRole("employee");
  const supabase = await createClient();
  const [{ data }, { data: offerings }] = await Promise.all([
    supabase.from("experiments").select("id, title, summary, team, status, owner_id, updated_at, offerings(name), profiles(full_name)").order("updated_at", { ascending: false }),
    supabase.from("offerings").select("id, name").order("name"),
  ]);
  return (
    <Container className="pb-16">
      <PageHeader eyebrow="Employee" title="Experiments & team spaces">Internal prototypes and hackathon team work. Never shown to clients or the public.</PageHeader>
      {typeof error === "string" && <div className="mb-4"><Notice tone="danger">{error}</Notice></div>}
      <div className="grid gap-6 lg:grid-cols-[1fr_1.4fr]">
        <Card className="content-start">
          <form action={submitExperiment} className="grid gap-2">
            <p className="font-semibold">Submit an experiment</p>
            <input name="title" required minLength={5} maxLength={160} placeholder="Title" className="input" />
            <textarea name="summary" required minLength={10} maxLength={2000} rows={4} placeholder="What are you testing and how will you know it worked?" className="input" />
            <input name="team" required placeholder="Team (e.g. Build Labs team 7)" className="input" />
            <select name="offering_id" className="input"><option value="">No specific offering</option>{offerings?.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}</select>
            <div><Button>Submit</Button></div>
          </form>
        </Card>
        <div className="grid content-start gap-3">
          {!data?.length && <Empty title="No experiments yet" />}
          {data?.map((x) => (
            <Card key={x.id}>
              <div className="flex flex-wrap justify-between gap-2">
                <p className="font-medium">{x.title}</p>
                <Badge tone={x.status === "running" ? "brand" : x.status === "stopped" ? "danger" : "neutral"}>{label(x.status)}</Badge>
              </div>
              <p className="mt-1 text-sm text-muted">{x.summary}</p>
              <p className="mt-2 text-xs text-muted">
                {x.team} · {(x.profiles as unknown as { full_name: string } | null)?.full_name}
                {x.offerings && ` · ${(x.offerings as unknown as { name: string }).name}`} · updated {fmtDate(x.updated_at)}
              </p>
              {x.owner_id === v.id && (
                <form action={setExperimentStatus} className="mt-3 flex flex-wrap gap-2">
                  <input type="hidden" name="id" value={x.id} />
                  {["running", "concluded", "stopped"].filter((s) => s !== x.status).map((s) => <Button key={s} name="status" value={s} variant="outline">Mark {s}</Button>)}
                </form>
              )}
            </Card>
          ))}
        </div>
      </div>
    </Container>
  );
}
