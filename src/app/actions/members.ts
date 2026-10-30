"use server";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getViewer } from "@/lib/session";

const CLIENT_ROLES = ["client_member", "client_admin"] as const;

async function requireClientAdmin() {
  const v = await getViewer();
  if (!v?.active || v.active.orgKind !== "client" || !v.active.roles.includes("client_admin")) redirect("/forbidden");
  return v.active;
}

export async function invite(fd: FormData) {
  const org = await requireClientAdmin();
  const email = z.email().safeParse(String(fd.get("email")).trim());
  const role = z.enum(CLIENT_ROLES).safeParse(fd.get("role"));
  if (!email.success || !role.success) redirect("/client/members?error=Invalid email or role");
  const supabase = await createClient();
  const { data: token, error } = await supabase.rpc("create_invitation", { p_org: org.orgId, p_email: email.data, p_role: role.data });
  if (error) redirect(`/client/members?error=${encodeURIComponent(error.message)}`);
  const h = await headers();
  const link = `${h.get("x-forwarded-proto") ?? "http"}://${h.get("host")}/invite/${token}`;
  revalidatePath("/client/members");
  // The link is shown once to the admin; only its hash is stored.
  redirect(`/client/members?link=${encodeURIComponent(link)}`);
}

export async function revokeInvite(fd: FormData) {
  await requireClientAdmin();
  const supabase = await createClient();
  await supabase.from("invitations").update({ revoked_at: new Date().toISOString() }).eq("id", String(fd.get("id")));
  revalidatePath("/client/members");
}

export async function setMemberStatus(fd: FormData) {
  await requireClientAdmin();
  const status = z.enum(["active", "revoked"]).parse(fd.get("status"));
  const supabase = await createClient();
  const { error } = await supabase.from("memberships").update({ status }).eq("id", String(fd.get("id")));
  if (error) redirect(`/client/members?error=${encodeURIComponent(error.message)}`);
  revalidatePath("/client/members");
}

export async function setMemberRole(fd: FormData) {
  await requireClientAdmin();
  const role = z.enum(CLIENT_ROLES).parse(fd.get("role"));
  const grant = fd.get("grant") === "1";
  const supabase = await createClient();
  const mid = String(fd.get("id"));
  const { error } = grant
    ? await supabase.from("role_grants").insert({ membership_id: mid, role })
    : await supabase.from("role_grants").delete().eq("membership_id", mid).eq("role", role);
  if (error) redirect(`/client/members?error=${encodeURIComponent(error.message)}`);
  revalidatePath("/client/members");
}
