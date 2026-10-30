"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getViewer } from "@/lib/session";
import { SCENARIOS, runScenario } from "@/lib/sandbox";

export async function runSandbox(fd: FormData) {
  const v = await getViewer();
  const context = fd.get("context") === "employee" ? "employee" : "client";
  const path = context === "employee" ? "/employee/playground" : "/client/sandbox";
  const org = context === "employee" ? v?.memberships.find((m) => m.orgKind === "internal") : v?.active?.orgKind === "client" ? v.active : null;
  if (!v || !org) redirect("/forbidden");

  const slug = String(fd.get("offering"));
  const scenario = SCENARIOS[slug]?.find((s) => s.id === fd.get("scenario"));
  if (!scenario) redirect(`${path}?error=Unknown scenario`);
  const supabase = await createClient();
  const { data: off } = await supabase.from("offerings").select("id").eq("slug", slug).single();
  const output = runScenario(slug, scenario);
  // RLS rejects the insert unless the org is entitled to this offering (or internal).
  const { error } = await supabase.from("sandbox_runs").insert({ org_id: org.orgId, offering_id: off?.id, scenario: scenario.name, inputs: scenario.inputs, output });
  if (error) redirect(`${path}?error=${encodeURIComponent("Not entitled to this sandbox")}`);
  revalidatePath(path);
  redirect(path);
}

export async function rateRun(fd: FormData) {
  const supabase = await createClient();
  await supabase.from("sandbox_runs").update({
    feedback_rating: String(fd.get("rating")), feedback_note: String(fd.get("note") ?? "").slice(0, 1000),
  }).eq("id", String(fd.get("id")));
  revalidatePath(String(fd.get("path")));
}
