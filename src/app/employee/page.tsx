import Link from "next/link";
import { requirePlatformRole } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { Badge, Card, Container, PageHeader, Stat, label } from "@/components/ui";

export default async function EmployeeHome() {
  const v = await requirePlatformRole("employee");
  const supabase = await createClient();
  const [{ data: internal }, { data: ideas }, { count: shared }] = await Promise.all([
    supabase.from("content_items").select("id, kind, title, body, review_due").eq("audience", "employee").order("created_at", { ascending: false }),
    supabase.from("improvement_ideas").select("id, title, status, owner_id").order("updated_at", { ascending: false }),
    supabase.from("shared_contributions").select("id", { count: "exact", head: true }).eq("status", "published"),
  ]);
  const mine = ideas?.filter((i) => i.owner_id === v.id) ?? [];
  const links = [
    ["/employee/playground", "Playground", "Run synthetic scenarios and give feedback"],
    ["/employee/live", "Live & recordings", "Employee-only broadcasts"],
    ["/learning", "Learning hub", "Approved shared learning and themes"],
    ["/employee/ideas", "Improvement ideas", "Themes linked to product improvements"],
  ];
  return (
    <Container className="pb-16">
      <PageHeader eyebrow="Employee portal" title={`Welcome, ${v.name}`}>Roles: {v.platformRoles.map(label).join(", ")}. Internal content here never appears in public/client search or AIRA.</PageHeader>
      <div className="grid gap-4 md:grid-cols-3">
        <Stat label="Approved shared contributions" value={shared ?? 0} />
        <Stat label="Improvement ideas" value={ideas?.length ?? 0} />
        <Stat label="Assigned to you" value={mine.length} />
      </div>
      <div className="mt-6 grid gap-4 md:grid-cols-4">
        {links.map(([h, t, d]) => <Link key={h} href={h}><Card className="h-full hover:border-brand"><p className="font-semibold">{t}</p><p className="text-sm text-muted">{d}</p></Card></Link>)}
      </div>
      <h2 className="mb-3 mt-10 font-semibold">Experiments, knowledge & internal notes</h2>
      <div className="grid gap-3 md:grid-cols-2">
        {internal?.filter((c) => c.kind !== "broadcast").map((c) => (
          <Card key={c.id}>
            <div className="flex justify-between gap-2"><p className="font-medium">{c.title}</p><Badge tone="navy">{label(c.kind)}</Badge></div>
            <p className="mt-1 text-sm text-muted">{c.body}</p>
            {c.review_due && <p className="mt-1 text-xs">Review due {c.review_due}</p>}
          </Card>
        ))}
      </div>
    </Container>
  );
}
