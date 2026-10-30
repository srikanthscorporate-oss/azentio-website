import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type Role =
  | "employee" | "moderator" | "publisher" | "product_owner" | "portal_admin"
  | "client_member" | "client_admin";

export type Membership = {
  id: string;
  orgId: string;
  orgName: string;
  orgKind: "internal" | "client";
  roles: Role[];
};

export type Viewer = {
  id: string;
  email: string;
  name: string;
  termsAccepted: boolean;
  memberships: Membership[];
  pending: boolean;
  active: Membership | null; // the server-validated active workspace
  platformRoles: Role[];     // roles held on the internal org
};

export const ACTIVE_ORG_COOKIE = "active_org";

// Loads the viewer from the verified session and *their own* memberships (RLS-scoped).
// The active workspace cookie is only a preference; it is honoured only if it matches an active membership.
export const getViewer = cache(async (): Promise<Viewer | null> => {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return null;

  const [{ data: profile }, { data: rows }] = await Promise.all([
    supabase.from("profiles").select("email, full_name, terms_accepted_at").eq("id", auth.user.id).single(),
    supabase
      .from("memberships")
      .select("id, status, org_id, organizations(name, kind), role_grants(role)")
      .eq("user_id", auth.user.id),
  ]);

  type Row = { id: string; status: string; org_id: string; organizations: { name: string; kind: "internal" | "client" }; role_grants: { role: Role }[] };
  const all = (rows ?? []) as unknown as Row[];
  const memberships: Membership[] = all
    .filter((m) => m.status === "active")
    .map((m) => ({
      id: m.id,
      orgId: m.org_id,
      orgName: m.organizations.name,
      orgKind: m.organizations.kind,
      roles: m.role_grants.map((g) => g.role),
    }));

  const pref = (await cookies()).get(ACTIVE_ORG_COOKIE)?.value;
  const active = memberships.find((m) => m.orgId === pref) ?? memberships.find((m) => m.orgKind === "client") ?? memberships[0] ?? null;
  const internal = memberships.find((m) => m.orgKind === "internal");

  return {
    id: auth.user.id,
    email: profile?.email ?? auth.user.email ?? "",
    name: profile?.full_name ?? auth.user.email ?? "",
    termsAccepted: !!profile?.terms_accepted_at,
    memberships,
    pending: memberships.length === 0 && all.some((m) => m.status === "pending"),
    active,
    platformRoles: internal?.roles ?? [],
  };
});

export function hasPlatformRole(v: Viewer | null, role: Role) {
  return !!v?.platformRoles.includes(role);
}

export async function requireViewer() {
  const v = await getViewer();
  if (!v) redirect("/login");
  if (!v.termsAccepted && v.memberships.length) redirect("/onboarding");
  return v;
}

export async function requirePlatformRole(role: Role) {
  const v = await requireViewer();
  if (!hasPlatformRole(v, role)) redirect("/forbidden");
  return v;
}

// Client portal pages need an active *client* workspace.
export async function requireClientWorkspace() {
  const v = await requireViewer();
  if (!v.active || v.active.orgKind !== "client") redirect(v.platformRoles.length ? "/employee" : "/forbidden");
  return { viewer: v, org: v.active };
}

export function homeFor(v: Viewer) {
  if (v.pending) return "/pending";
  if (v.active?.orgKind === "client") return "/client";
  if (v.platformRoles.includes("employee")) return "/employee";
  return "/";
}
