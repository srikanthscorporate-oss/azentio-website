import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

// Media is never served from a public bucket. The content row is read with the *viewer's* RLS,
// so an unauthorised request gets 404 before any signed URL is issued.
export async function GET(_: Request, { params }: RouteContext<"/api/media/[id]">) {
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase.from("content_items").select("media_path").eq("id", id).maybeSingle();
  if (!data?.media_path) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const { data: signed, error } = await createServiceClient().storage.from("media").createSignedUrl(data.media_path, 60);
  if (error || !signed) return NextResponse.json({ error: "Unavailable" }, { status: 404 });
  return NextResponse.redirect(signed.signedUrl, { headers: { "cache-control": "private, no-store" } });
}
