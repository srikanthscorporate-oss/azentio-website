"use server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ACTIVE_ORG_COOKIE, getViewer, homeFor } from "@/lib/session";

export async function switchWorkspace(formData: FormData) {
  const v = await getViewer();
  const orgId = String(formData.get("orgId"));
  // Only accept an org the server confirms the user is an active member of.
  if (!v || !v.memberships.some((m) => m.orgId === orgId)) redirect("/forbidden");
  (await cookies()).set(ACTIVE_ORG_COOKIE, orgId, { httpOnly: true, sameSite: "lax", secure: true, path: "/" });
  const m = v.memberships.find((x) => x.orgId === orgId)!;
  redirect(m.orgKind === "client" ? "/client" : "/employee");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  (await cookies()).delete(ACTIVE_ORG_COOKIE);
  redirect("/");
}

export async function goHome() {
  const v = await getViewer();
  redirect(v ? homeFor(v) : "/login");
}
