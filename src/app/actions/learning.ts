"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getViewer } from "@/lib/session";
import { contributionSchema } from "@/lib/learning";
import type { FormState } from "./public";

function toRow(d: z.infer<typeof contributionSchema>) {
  return {
    kind: d.kind, title: d.title, body: d.body, offering_id: d.offering_id ?? null, industry: d.industry || null, region: d.region || null,
    period_start: d.period_start, period_end: d.period_end, evidence_type: d.evidence_type, confidence: d.confidence, visibility: d.visibility,
    consent_process: !!d.consent_process, consent_publish: !!d.consent_publish,
    consent_attribution: !!d.consent_attribution, consent_training: !!d.consent_training,
  };
}

export async function saveContribution(_: FormState, fd: FormData): Promise<FormState> {
  const v = await getViewer();
  if (!v?.active) return { message: "No active workspace." };
  const parsed = contributionSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { errors: z.flattenError(parsed.error).fieldErrors as FormState["errors"], message: "Please fix the highlighted fields." };
  const supabase = await createClient();
  const id = fd.get("id");
  const intent = fd.get("intent");

  let contributionId: string;
  if (id) {
    const { error } = await supabase.from("contributions").update(toRow(parsed.data)).eq("id", String(id));
    if (error) return { message: error.message };
    contributionId = String(id);
  } else {
    // org comes from the server-validated active workspace, never from the form
    const { data, error } = await supabase.from("contributions").insert({ ...toRow(parsed.data), org_id: v.active.orgId }).select("id").single();
    if (error) return { message: error.message };
    contributionId = data.id;
  }
  if (intent === "submit") {
    const { error } = await supabase.rpc("submit_contribution", { p_id: contributionId });
    if (error) {
      revalidatePath("/client/observations");
      return { message: `Saved as draft, but not submitted: ${error.message}` };
    }
  }
  revalidatePath("/client/observations");
  redirect(`/client/observations/${contributionId}`);
}

async function rpc(fn: string, args: Record<string, unknown>, path: string) {
  const supabase = await createClient();
  const { error } = await supabase.rpc(fn, args);
  if (error) redirect(`${path}?error=${encodeURIComponent(error.message)}`);
  revalidatePath(path);
  redirect(path);
}

export async function submitContribution(fd: FormData) {
  const id = String(fd.get("id"));
  await rpc("submit_contribution", { p_id: id }, `/client/observations/${id}`);
}
export async function withdrawContribution(fd: FormData) {
  const id = String(fd.get("id"));
  await rpc("withdraw_contribution", { p_id: id }, `/client/observations/${id}`);
}
export async function reviseContribution(fd: FormData) {
  const id = String(fd.get("id"));
  await rpc("revise_contribution", { p_id: id }, `/client/observations/${id}`);
}
export async function deleteDraft(fd: FormData) {
  const supabase = await createClient();
  await supabase.from("contributions").delete().eq("id", String(fd.get("id")));
  redirect("/client/observations");
}

export async function reportShared(fd: FormData) {
  const id = String(fd.get("id"));
  const reason = z.enum(["misleading", "confidential", "inappropriate", "duplicate", "other"]).parse(fd.get("reason"));
  const details = String(fd.get("details") ?? "").slice(0, 1000);
  await rpc("report_shared", { p_shared: id, p_reason: reason, p_details: details }, `/learning/${id}`);
}
