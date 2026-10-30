"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requirePlatformRole } from "@/lib/session";

const STATUSES = ["proposed", "under_review", "planned", "in_progress", "released", "not_proceeding"] as const;

export async function createIdea(fd: FormData) {
  const v = await requirePlatformRole("product_owner");
  const d = z.object({
    title: z.string().trim().min(5).max(160), problem: z.string().trim().min(10).max(4000), proposed_outcome: z.string().trim().min(10).max(4000),
    owner_team: z.string().trim().min(2).max(120), priority: z.enum(["low", "medium", "high"]),
    offering_id: z.uuid().optional().or(z.literal("").transform(() => undefined)), theme_id: z.uuid().optional().or(z.literal("").transform(() => undefined)),
  }).safeParse(Object.fromEntries(fd));
  if (!d.success) redirect("/employee/ideas/new?error=Please complete all fields");
  const supabase = await createClient();
  const { data, error } = await supabase.from("improvement_ideas").insert({ ...d.data, owner_id: v.id }).select("id").single();
  if (error) redirect(`/employee/ideas/new?error=${encodeURIComponent(error.message)}`);
  const evidence = fd.getAll("evidence").map(String);
  if (evidence.length) await supabase.from("idea_evidence").insert(evidence.map((shared_id) => ({ idea_id: data.id, shared_id })));
  redirect(`/employee/ideas/${data.id}`);
}

export async function updateIdeaStatus(fd: FormData) {
  await requirePlatformRole("product_owner");
  const id = String(fd.get("id"));
  const supabase = await createClient();
  const { error } = await supabase.rpc("set_idea_status", {
    p_idea: id, p_status: z.enum(STATUSES).parse(fd.get("status")),
    p_note: String(fd.get("note") ?? "") || null, p_public_update: String(fd.get("public_update") ?? "").trim() || null,
  });
  if (error) redirect(`/employee/ideas/${id}?error=${encodeURIComponent(error.message)}`);
  await supabase.from("improvement_ideas").update({ visible_to_clients: fd.get("visible_to_clients") === "on" }).eq("id", id);
  revalidatePath(`/employee/ideas/${id}`);
}

export async function createTheme(fd: FormData) {
  const v = await requirePlatformRole("product_owner");
  const d = z.object({ title: z.string().trim().min(3).max(160), summary: z.string().trim().min(10).max(2000), limitations: z.string().trim().min(10).max(1000),
    offering_id: z.uuid().optional().or(z.literal("").transform(() => undefined)) }).safeParse(Object.fromEntries(fd));
  if (!d.success) redirect("/employee/themes?error=Please complete all fields");
  const supabase = await createClient();
  const { data, error } = await supabase.from("themes").insert({ ...d.data, created_by: v.id }).select("id").single();
  if (error) redirect(`/employee/themes?error=${encodeURIComponent(error.message)}`);
  const links = fd.getAll("evidence").map(String);
  if (links.length) await supabase.from("theme_links").insert(links.map((shared_id) => ({ theme_id: data.id, shared_id })));
  redirect(`/learning/themes/${data.id}`);
}
