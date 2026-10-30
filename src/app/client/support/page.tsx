import { requireClientWorkspace } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { createTicket } from "@/app/actions/support";
import { Badge, Button, Card, Container, Empty, Notice, PageHeader, fmtDate, label } from "@/components/ui";

export default async function Support({ searchParams }: PageProps<"/client/support">) {
  const { error, created } = await searchParams;
  const { org } = await requireClientWorkspace();
  const supabase = await createClient();
  const [{ data: tickets }, { data: ent }] = await Promise.all([
    supabase.from("support_tickets").select("id, subject, priority, status, external_ref, created_at, offerings(name)").eq("org_id", org.orgId).order("created_at", { ascending: false }),
    supabase.from("entitlements").select("offerings(id, name)").eq("org_id", org.orgId),
  ]);
  const offerings = (ent ?? []).map((e) => e.offerings as unknown as { id: string; name: string });

  return (
    <Container className="pb-16">
      <PageHeader eyebrow={org.orgName} title="Support">Tickets are visible to members of {org.orgName} and to the Azentio support team. Please don't include customer data or credentials.</PageHeader>
      {typeof error === "string" && <div className="mb-4"><Notice tone="danger">{error}</Notice></div>}
      {created && <div className="mb-4"><Notice>Ticket created. You'll see status changes here.</Notice></div>}
      <div className="grid gap-6 lg:grid-cols-[1fr_1.3fr]">
        <Card className="content-start">
          <form action={createTicket} className="grid gap-3">
            <p className="font-semibold">New ticket</p>
            <label className="label" htmlFor="subject">Subject</label>
            <input id="subject" name="subject" required minLength={5} maxLength={160} className="input" />
            <label className="label" htmlFor="body">Description</label>
            <textarea id="body" name="body" required minLength={10} maxLength={4000} rows={5} className="input" />
            <div className="grid gap-3 sm:grid-cols-2">
              <div><label className="label" htmlFor="offering_id">Product</label>
                <select id="offering_id" name="offering_id" className="input"><option value="">General</option>{offerings.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}</select></div>
              <div><label className="label" htmlFor="priority">Priority</label>
                <select id="priority" name="priority" defaultValue="normal" className="input"><option value="low">Low</option><option value="normal">Normal</option><option value="high">High</option></select></div>
            </div>
            <div><Button>Submit ticket</Button></div>
          </form>
        </Card>
        <div className="grid min-w-0 content-start gap-3">
          {!tickets?.length ? <Empty title="No support tickets yet" /> : tickets.map((t) => (
            <Card key={t.id}>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <p className="font-semibold">{t.subject}</p>
                <Badge tone={t.status === "resolved" ? "brand" : t.status === "in_progress" ? "warn" : "neutral"}>{label(t.status)}</Badge>
              </div>
              <p className="mt-1 text-xs text-muted">
                {(t.offerings as unknown as { name: string } | null)?.name ?? "General"} · {label(t.priority)} priority · {fmtDate(t.created_at)}
                {t.external_ref && ` · Helpdesk ref ${t.external_ref}`}
              </p>
            </Card>
          ))}
        </div>
      </div>
    </Container>
  );
}
