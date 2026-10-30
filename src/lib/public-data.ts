import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { createClient } from "@supabase/supabase-js";

// Public pages read only public rows, so they use a cookie-less anonymous client (RLS still applies)
// and are cached. Publishing actions call updateTag(PUBLIC_TAG) to refresh them.
export const PUBLIC_TAG = "public-content";

const anon = () =>
  createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { auth: { persistSession: false } });

export async function getOfferings() {
  "use cache";
  cacheLife("minutes");
  cacheTag(PUBLIC_TAG);
  const { data } = await anon().from("offerings").select("id, slug, name, category, tagline, description").eq("is_public", true).order("name");
  return data ?? [];
}

export async function getOffering(slug: string) {
  "use cache";
  cacheLife("minutes");
  cacheTag(PUBLIC_TAG);
  const { data: offering } = await anon().from("offerings").select("id, slug, name, category, tagline, description, headline, dev_status, features, how_it_works, business_value").eq("slug", slug).eq("is_public", true).maybeSingle();
  if (!offering) return null;
  const { data: content } = await anon().from("content_items").select("id, kind, title, body").eq("offering_id", offering.id).eq("audience", "public").order("created_at");
  return { ...offering, content: content ?? [] };
}

export async function getPublicContent(kind: "video" | "insight") {
  "use cache";
  cacheLife("minutes");
  cacheTag(PUBLIC_TAG);
  const { data } = await anon().from("content_items").select("id, title, body, external_url, created_at").eq("kind", kind).eq("audience", "public").order("created_at", { ascending: false });
  return data ?? [];
}
