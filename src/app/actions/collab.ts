"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requirePlatformRole } from "@/lib/session";

export async function addComment(fd: FormData) {
  const id = String(fd.get("shared_id"));
  const body = z.string().trim().min(2).max(1000).safeParse(fd.get("body"));
  if (!body.success) redirect(`/learning/${id}?error=Comment must be 2 to 1000 characters`);
  const supabase = await createClient();
  const { error } = await supabase.from("comments").insert({ shared_id: id, body: body.data });
  if (error) redirect(`/learning/${id}?error=${encodeURIComponent(error.message)}`);
  revalidatePath(`/learning/${id}`);
}

export async function flagComment(fd: FormData) {
  const supabase = await createClient();
  await supabase.rpc("flag_comment", { p_comment: String(fd.get("id")) });
  revalidatePath(`/learning/${fd.get("shared_id")}`);
}

export async function deleteComment(fd: FormData) {
  const supabase = await createClient();
  await supabase.from("comments").delete().eq("id", String(fd.get("id")));
  revalidatePath(`/learning/${fd.get("shared_id")}`);
}

export async function moderateComment(fd: FormData) {
  await requirePlatformRole("moderator");
  const supabase = await createClient();
  const status = z.enum(["visible", "hidden"]).parse(fd.get("status"));
  await supabase.from("comments").update({ status }).eq("id", String(fd.get("id")));
  revalidatePath("/moderation");
}

export async function toggleBookmark(fd: FormData) {
  const id = String(fd.get("shared_id"));
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (fd.get("on") === "1") await supabase.from("bookmarks").insert({ shared_id: id });
  else await supabase.from("bookmarks").delete().eq("shared_id", id).eq("user_id", auth.user!.id);
  revalidatePath(`/learning/${id}`);
  revalidatePath("/learning");
}

export async function saveSearch(fd: FormData) {
  const name = z.string().trim().min(1).max(80).safeParse(fd.get("name"));
  const query = String(fd.get("query") ?? "").slice(0, 500);
  if (!name.success) redirect(`/learning?${query}`);
  const supabase = await createClient();
  await supabase.from("saved_searches").insert({ name: name.data, query });
  revalidatePath("/learning");
  redirect(`/learning?${query}`);
}

export async function deleteSearch(fd: FormData) {
  const supabase = await createClient();
  await supabase.from("saved_searches").delete().eq("id", String(fd.get("id")));
  revalidatePath("/learning");
}

export async function submitExperiment(fd: FormData) {
  await requirePlatformRole("employee");
  const d = z.object({
    title: z.string().trim().min(5).max(160), summary: z.string().trim().min(10).max(2000), team: z.string().trim().min(2).max(120),
    offering_id: z.uuid().optional().or(z.literal("").transform(() => undefined)),
  }).safeParse(Object.fromEntries(fd));
  if (!d.success) redirect("/employee/experiments?error=Please complete all fields");
  const supabase = await createClient();
  const { error } = await supabase.from("experiments").insert(d.data);
  if (error) redirect(`/employee/experiments?error=${encodeURIComponent(error.message)}`);
  revalidatePath("/employee/experiments");
}

export async function setExperimentStatus(fd: FormData) {
  await requirePlatformRole("employee");
  const supabase = await createClient();
  await supabase.from("experiments").update({
    status: z.enum(["proposed", "running", "concluded", "stopped"]).parse(fd.get("status")), updated_at: new Date().toISOString(),
  }).eq("id", String(fd.get("id")));
  revalidatePath("/employee/experiments");
}

export async function rateContent(fd: FormData) {
  await requirePlatformRole("employee");
  const supabase = await createClient();
  await supabase.from("content_feedback").upsert({
    content_id: String(fd.get("id")), rating: z.enum(["useful", "outdated", "unclear"]).parse(fd.get("rating")),
  }, { onConflict: "content_id,user_id" });
  revalidatePath("/employee/knowledge");
}

export async function setDigest(fd: FormData) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (fd.get("on") === "1") {
    const offering = String(fd.get("offering_id") ?? "");
    await supabase.from("digest_subscriptions").upsert({ user_id: auth.user!.id, offering_id: offering || null });
  } else {
    await supabase.from("digest_subscriptions").delete().eq("user_id", auth.user!.id);
  }
  revalidatePath("/learning");
}
