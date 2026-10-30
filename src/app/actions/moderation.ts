"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requirePlatformRole } from "@/lib/session";

const sharedSchema = z.object({
  title: z.string().trim().min(5).max(160),
  body: z.string().trim().min(20).max(4000),
  industry: z.string().trim().max(80),
  region: z.string().trim().max(80),
  period_label: z.string().trim().min(2).max(40),
});

export async function moderate(fd: FormData) {
  await requirePlatformRole("moderator");
  const id = String(fd.get("id"));
  const action = z.enum(["publish", "return", "reject"]).parse(fd.get("action"));
  let shared = null;
  if (action === "publish") {
    const parsed = sharedSchema.safeParse(Object.fromEntries(fd));
    if (!parsed.success) redirect(`/moderation/${id}?error=${encodeURIComponent("Reviewed fields are incomplete")}`);
    shared = parsed.data;
  }
  const supabase = await createClient();
  const { error } = await supabase.rpc("moderate_contribution", {
    p_id: id, p_action: action, p_shared: shared,
    p_public_reason: String(fd.get("public_reason") ?? "").trim() || null,
    p_internal_note: String(fd.get("internal_note") ?? "").trim() || null,
    p_include_attribution: fd.get("include_attribution") === "on",
  });
  if (error) redirect(`/moderation/${id}?error=${encodeURIComponent(error.message)}`);
  revalidatePath("/moderation");
  redirect("/moderation");
}

export async function resolveReport(fd: FormData) {
  await requirePlatformRole("moderator");
  const supabase = await createClient();
  const { error } = await supabase.rpc("resolve_report", {
    p_report: String(fd.get("id")),
    p_decision: z.enum(["unpublish", "restore", "dismiss", "remove"]).parse(fd.get("decision")),
    p_reason: String(fd.get("reason") ?? "").trim() || null,
  });
  if (error) redirect(`/moderation?error=${encodeURIComponent(error.message)}`);
  revalidatePath("/moderation");
}
