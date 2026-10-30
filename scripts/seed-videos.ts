// Replaces placeholder videos with the Azentio channel videos. Idempotent.
// Usage: node --env-file=.env.local scripts/seed-videos.ts
import { createClient } from "@supabase/supabase-js";
import { AZENTIO_VIDEOS, embedUrl } from "../src/lib/videos.ts";

const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
await admin.from("content_items").delete().eq("kind", "video").like("external_url", "%dQw4w9WgXcQ%");
await admin.from("content_items").update({ external_url: null }).like("external_url", "%dQw4w9WgXcQ%");
const { data: existing } = await admin.from("content_items").select("external_url").eq("kind", "video");
const have = new Set(existing?.map((e) => e.external_url));
const rows = AZENTIO_VIDEOS.filter((v) => !have.has(embedUrl(v.id))).map((v, i) => ({
  kind: "video", title: v.title, body: v.category, external_url: embedUrl(v.id), audience: "public", is_published: true,
  created_at: new Date(Date.now() - i * 60_000).toISOString(),
}));
if (rows.length) {
  const { error } = await admin.from("content_items").insert(rows);
  if (error) throw error;
}
console.log(`✓ ${rows.length} video(s) added`);
