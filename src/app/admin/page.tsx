import { requirePlatformRole } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { approveEmployee, createOrg, inviteToOrg, toggleEntitlement } from "@/app/actions/admin";
import { Button, Card, Container, Notice, PageHeader, label } from "@/components/ui";

export default async function Admin({ searchParams }: PageProps<"/admin">) {
  const { error, link } = await searchParams;
  await requirePlatformRole("portal_admin");
  const supabase = await createClient();
  const [{ data: orgs }, { data: offerings }, { data: ents }, { data: pending }, { data: audit }] = await Promise.all([
    supabase.from("organizations").select("id, name, kind, industry, region").order("name"),
    supabase.from("offerings").select("id, name").order("name"),
    supabase.from("entitlements").select("org_id, offering_id"),
    supabase.from("memberships").select("id, created_at, profiles(email)").eq("status", "pending"),
    supabase.from("audit_log").select("id, action, entity, entity_id, data, created_at, actor_id").order("id", { ascending: false }).limit(40),
  ]);
  const has = (o: string, f: string) => ents?.some((e) => e.org_id === o && e.offering_id === f);

  return (
    <Container className="pb-16">
      <PageHeader eyebrow="Portal administration" title="Organisations, access & audit">
        Admin role does not grant access to private client contributions; those remain governed by moderation rules.
      </PageHeader>
      {typeof error === "string" && <div className="mb-4"><Notice tone="danger">{error}</Notice></div>}
      {typeof link === "string" && <div className="mb-4"><Notice>Invitation link (shown once): <code>{link}</code></Notice></div>}

      <h2 className="mb-3 font-semibold">Pending employee approvals</h2>
      {!pending?.length ? <p className="mb-6 text-sm text-muted">None.</p> : (
        <div className="mb-6 grid gap-2">{pending.map((p) => (
          <Card key={p.id} className="flex items-center justify-between"><span>{(p.profiles as unknown as { email: string }).email}</span>
            <form action={approveEmployee}><input type="hidden" name="id" value={p.id} /><Button>Approve as employee</Button></form></Card>
        ))}</div>
      )}

      <h2 className="mb-3 font-semibold">Client organisations & entitlements</h2>
      <div className="overflow-x-auto rounded-2xl border border-line bg-surface">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-line text-left"><th className="p-3">Organisation</th>{offerings?.map((o) => <th key={o.id} className="p-3 font-medium">{o.name}</th>)}<th className="p-3">Invite admin</th></tr></thead>
          <tbody>
            {orgs?.filter((o) => o.kind === "client").map((o) => (
              <tr key={o.id} className="border-b border-line last:border-0">
                <td className="p-3"><p className="font-medium">{o.name}</p><p className="text-xs text-muted">{o.industry} · {o.region}</p></td>
                {offerings?.map((f) => (
                  <td key={f.id} className="p-3">
                    <form action={toggleEntitlement}><input type="hidden" name="org" value={o.id} /><input type="hidden" name="offering" value={f.id} /><input type="hidden" name="on" value={has(o.id, f.id) ? "0" : "1"} />
                      <button className={`rounded px-2 py-1 text-xs ${has(o.id, f.id) ? "bg-brand-soft text-brand-ink" : "border border-line text-muted"}`}>{has(o.id, f.id) ? "Entitled" : "Off"}</button></form>
                  </td>
                ))}
                <td className="p-3"><form action={inviteToOrg} className="flex gap-1"><input type="hidden" name="org" value={o.id} /><input name="email" type="email" required placeholder="email" className="input w-40" /><Button variant="outline">Invite</Button></form></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Card className="mt-4">
        <form action={createOrg} className="flex flex-wrap gap-2">
          <input name="name" required placeholder="New client organisation" className="input max-w-xs" />
          <input name="industry" placeholder="Industry" className="input max-w-xs" /><input name="region" placeholder="Region" className="input max-w-xs" />
          <Button>Register organisation</Button>
        </form>
      </Card>

      <h2 className="mb-3 mt-10 font-semibold">Audit log (latest 40)</h2>
      <div className="overflow-x-auto rounded-2xl border border-line bg-surface text-xs">
        <table className="w-full">
          <thead><tr className="border-b border-line text-left"><th className="p-2">When</th><th className="p-2">Action</th><th className="p-2">Entity</th><th className="p-2">Data</th></tr></thead>
          <tbody>{audit?.map((a) => (
            <tr key={a.id} className="border-b border-line last:border-0"><td className="p-2 whitespace-nowrap">{new Date(a.created_at).toLocaleString("en-GB")}</td><td className="p-2">{label(a.action)}</td><td className="p-2">{a.entity}</td><td className="p-2 font-mono">{JSON.stringify(a.data)}</td></tr>
          ))}</tbody>
        </table>
      </div>
    </Container>
  );
}
