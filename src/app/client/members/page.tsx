import { redirect } from "next/navigation";
import { requireClientWorkspace } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { invite, revokeInvite, setMemberRole, setMemberStatus } from "@/app/actions/members";
import { setParticipation } from "@/app/actions/federated";
import { Badge, Button, Card, Container, Notice, PageHeader, fmtDate, label } from "@/components/ui";

export default async function Members({ searchParams }: PageProps<"/client/members">) {
  const { error, link } = await searchParams;
  const { viewer, org } = await requireClientWorkspace();
  if (!org.roles.includes("client_admin")) redirect("/forbidden");
  const supabase = await createClient();
  const [{ data: members }, { data: invites }, { data: fl }] = await Promise.all([
    supabase.from("memberships").select("id, status, user_id, profiles(email, full_name), role_grants(role)").eq("org_id", org.orgId),
    supabase.from("invitations").select("id, email, role, expires_at, accepted_at, revoked_at, created_at").eq("org_id", org.orgId).order("created_at", { ascending: false }),
    supabase.from("fl_participants").select("status, decided_at").eq("org_id", org.orgId).maybeSingle(),
  ]);
  const optedIn = fl?.status === "opted_in";
  const inviteState = (i: { accepted_at: string | null; revoked_at: string | null; expires_at: string }) =>
    i.accepted_at ? "accepted" : i.revoked_at ? "revoked" : new Date(i.expires_at) < new Date() ? "expired" : "pending";

  return (
    <Container className="pb-16">
      <PageHeader eyebrow={org.orgName} title="Members & invitations">You can invite people only into {org.orgName}, with client roles only.</PageHeader>
      {typeof error === "string" && <div className="mb-4"><Notice tone="danger">{error}</Notice></div>}
      {typeof link === "string" && <div className="mb-4"><Notice>Single-use invitation link (expires in 7 days, shown once): <code className="break-all">{link}</code></Notice></div>}

      <Card className="mb-6">
        <form action={invite} className="flex flex-wrap items-end gap-3">
          <div className="min-w-64 flex-1"><label className="label" htmlFor="email">Email</label><input id="email" name="email" type="email" required className="input" /></div>
          <div><label className="label" htmlFor="role">Role</label>
            <select id="role" name="role" className="input"><option value="client_member">Client member</option><option value="client_admin">Client admin</option></select></div>
          <Button>Create invitation</Button>
        </form>
      </Card>

      <Card className="mb-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-2xl">
            <p className="font-semibold">Federated learning programme</p>
            <p className="mt-1 text-sm text-muted">
              Optional and separate from this workspace and from contribution sharing. If you opt in, a training job runs in your own environment
              and only bounded model updates are sent for aggregation, never your records. Withdrawing stops future participation; updates already
              aggregated into earlier model versions cannot be removed.
            </p>
            <p className="mt-2 text-sm">Status: <Badge tone={optedIn ? "brand" : "neutral"}>{optedIn ? "Opted in" : fl ? "Withdrawn" : "Not enrolled"}</Badge></p>
          </div>
          <form action={setParticipation}>
            <input type="hidden" name="status" value={optedIn ? "withdrawn" : "opted_in"} />
            <Button variant={optedIn ? "danger" : "primary"}>{optedIn ? "Withdraw" : "Opt in"}</Button>
          </form>
        </div>
      </Card>

      <h2 className="mb-3 font-semibold">Members</h2>
      <div className="grid gap-2">
        {members?.map((m) => {
          const p = m.profiles as unknown as { email: string; full_name: string };
          const roles = (m.role_grants as { role: string }[]).map((g) => g.role);
          const self = m.user_id === viewer.id;
          return (
            <Card key={m.id} className="flex flex-wrap items-center justify-between gap-3">
              <div><p className="font-medium">{p?.full_name ?? p?.email}</p><p className="text-xs text-muted">{p?.email}</p></div>
              <div className="flex flex-wrap items-center gap-2">
                {roles.map((r) => <Badge key={r} tone="brand">{label(r)}</Badge>)}
                <Badge tone={m.status === "active" ? "brand" : "danger"}>{m.status}</Badge>
                {!self && (
                  <>
                    <form action={setMemberRole}><input type="hidden" name="id" value={m.id} /><input type="hidden" name="role" value="client_admin" />
                      <input type="hidden" name="grant" value={roles.includes("client_admin") ? "0" : "1"} />
                      <Button variant="outline">{roles.includes("client_admin") ? "Remove admin" : "Make admin"}</Button></form>
                    <form action={setMemberStatus}><input type="hidden" name="id" value={m.id} /><input type="hidden" name="status" value={m.status === "active" ? "revoked" : "active"} />
                      <Button variant={m.status === "active" ? "danger" : "outline"}>{m.status === "active" ? "Revoke" : "Reactivate"}</Button></form>
                  </>
                )}
              </div>
            </Card>
          );
        })}
      </div>

      <h2 className="mb-3 mt-8 font-semibold">Invitations</h2>
      <div className="grid gap-2">
        {invites?.map((i) => (
          <Card key={i.id} className="flex flex-wrap items-center justify-between gap-3">
            <div><p className="font-medium">{i.email}</p><p className="text-xs text-muted">{label(i.role)} · sent {fmtDate(i.created_at)} · expires {fmtDate(i.expires_at)}</p></div>
            <div className="flex items-center gap-2">
              <Badge tone={inviteState(i) === "accepted" ? "brand" : inviteState(i) === "pending" ? "warn" : "neutral"}>{inviteState(i)}</Badge>
              {inviteState(i) === "pending" && <form action={revokeInvite}><input type="hidden" name="id" value={i.id} /><Button variant="danger">Revoke</Button></form>}
            </div>
          </Card>
        ))}
        {!invites?.length && <p className="text-sm text-muted">No invitations yet.</p>}
      </div>
    </Container>
  );
}
