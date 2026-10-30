"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requirePlatformRole } from "@/lib/session";

const err = (m: string) => redirect(`/admin?error=${encodeURIComponent(m)}`);

export async function approveEmployee(fd: FormData) {
  await requirePlatformRole("portal_admin");
  const supabase = await createClient();
  const { error } = await supabase.rpc("approve_employee", { p_membership: String(fd.get("id")) });
  if (error) err(error.message);
  revalidatePath("/admin");
}

export async function createOrg(fd: FormData) {
  await requirePlatformRole("portal_admin");
  const d = z.object({ name: z.string().trim().min(2).max(120), industry: z.string().trim().max(80), region: z.string().trim().max(80) }).safeParse(Object.fromEntries(fd));
  if (!d.success) err("Invalid organisation");
  const supabase = await createClient();
  const slug = d.data!.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const { error } = await supabase.from("organizations").insert({ ...d.data, slug, kind: "client" });
  if (error) err(error.message);
  revalidatePath("/admin");
}

export async function toggleEntitlement(fd: FormData) {
  await requirePlatformRole("portal_admin");
  const supabase = await createClient();
  const row = { org_id: String(fd.get("org")), offering_id: String(fd.get("offering")) };
  const { error } = fd.get("on") === "1"
    ? await supabase.from("entitlements").insert(row)
    : await supabase.from("entitlements").delete().match(row);
  if (error) err(error.message);
  revalidatePath("/admin");
}

export async function inviteToOrg(fd: FormData) {
  await requirePlatformRole("portal_admin");
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("create_invitation", { p_org: String(fd.get("org")), p_email: String(fd.get("email")), p_role: "client_admin" });
  if (error) err(error.message);
  redirect(`/admin?link=${encodeURIComponent(`/invite/${data}`)}`);
}
