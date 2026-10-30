"use server";
import { revalidatePath, updateTag } from "next/cache";
import { PUBLIC_TAG } from "@/lib/public-data";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { requirePlatformRole } from "@/lib/session";

const MAX_BYTES = 50 * 1024 * 1024;
const TYPES = ["video/mp4", "video/webm", "image/png", "image/jpeg", "application/pdf"];

export async function createContent(fd: FormData) {
  const v = await requirePlatformRole("publisher");
  const d = z.object({
    kind: z.enum(["banner", "insight", "video", "broadcast", "session", "release_note", "knowledge", "experiment", "briefing"]),
    title: z.string().trim().min(3).max(200), body: z.string().trim().max(4000),
    audience: z.enum(["public", "employee", "client_all", "client_org", "entitled"]),
    org_id: z.uuid().optional().or(z.literal("").transform(() => undefined)),
    offering_id: z.uuid().optional().or(z.literal("").transform(() => undefined)),
    external_url: z.url().optional().or(z.literal("").transform(() => undefined)),
  }).safeParse(Object.fromEntries([...fd.entries()].filter(([, x]) => typeof x === "string")));
  if (!d.success) redirect("/publisher?error=Please check the fields");

  let media_path: string | undefined;
  const file = fd.get("file");
  if (file instanceof File && file.size > 0) {
    if (file.size > MAX_BYTES || !TYPES.includes(file.type)) redirect("/publisher?error=File type or size not allowed");
    media_path = `${crypto.randomUUID()}-${file.name.replace(/[^\w.-]/g, "_")}`;
    // upload with service role into the private bucket; access is decided per request by /api/media/[id]
    const { error } = await createServiceClient().storage.from("media").upload(media_path, file, { contentType: file.type });
    if (error) redirect(`/publisher?error=${encodeURIComponent(error.message)}`);
  }
  const supabase = await createClient();
  const { error } = await supabase.from("content_items").insert({ ...d.data, media_path, owner_id: v.id, is_published: fd.get("publish") === "on" });
  if (error) redirect(`/publisher?error=${encodeURIComponent(error.message)}`);
  updateTag(PUBLIC_TAG);
  revalidatePath("/", "layout");
  redirect("/publisher");
}

export async function togglePublished(fd: FormData) {
  await requirePlatformRole("publisher");
  const supabase = await createClient();
  await supabase.from("content_items").update({ is_published: fd.get("to") === "1", updated_at: new Date().toISOString() }).eq("id", String(fd.get("id")));
  updateTag(PUBLIC_TAG);
  revalidatePath("/", "layout");
}
