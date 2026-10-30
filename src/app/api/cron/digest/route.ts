import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

// Weekly learning digest. Runs daily (Vercel Cron); each subscriber gets at most one digest per 7 days,
// listing newly approved shared contributions. Writes an in-app notification and queues an email in the outbox.
export async function GET(req: Request) {
  if (!process.env.CRON_SECRET || req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const db = createServiceClient();
  const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString();
  const { data: subs } = await db.from("digest_subscriptions").select("user_id, offering_id, last_sent_at, profiles(email)")
    .or(`last_sent_at.is.null,last_sent_at.lt.${weekAgo}`);
  let sent = 0;
  for (const s of subs ?? []) {
    const since = s.last_sent_at ?? weekAgo;
    let q = db.from("shared_contributions").select("id, title").eq("status", "published").gt("published_at", since).order("published_at", { ascending: false }).limit(10);
    if (s.offering_id) q = q.eq("offering_id", s.offering_id);
    const { data: items } = await q;
    const now = new Date().toISOString();
    if (items?.length) {
      const body = `${items.length} new approved contribution${items.length > 1 ? "s" : ""} in the learning hub:\n` + items.map((i) => `- ${i.title}`).join("\n");
      await db.from("notifications").insert({ user_id: s.user_id, title: "Your weekly learning digest", body, link: "/learning" });
      const email = (s.profiles as unknown as { email: string } | null)?.email;
      if (email) await db.from("email_outbox").insert({ idempotency_key: `digest:${s.user_id}:${now.slice(0, 10)}`, to_email: email, subject: "Your azentio.ai learning digest", body }).then(() => undefined);
      sent++;
    }
    await db.from("digest_subscriptions").update({ last_sent_at: now }).eq("user_id", s.user_id);
  }
  return NextResponse.json({ subscribers: subs?.length ?? 0, digests: sent });
}
