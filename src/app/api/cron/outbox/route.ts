import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

// Delivers queued email_outbox rows via Resend. A row becomes "sent" only after Resend accepts it;
// failures are recorded with the provider's error and retried up to 3 times.
// Called by Vercel Cron (Authorization: Bearer CRON_SECRET) or manually by an operator.
export async function GET(req: Request) {
  if (!process.env.CRON_SECRET || req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const key = process.env.RESEND_API_KEY;
  if (!key) return NextResponse.json({ error: "RESEND_API_KEY not set" }, { status: 500 });

  const db = createServiceClient();
  const { data: rows } = await db.from("email_outbox").select("*").eq("status", "queued").lt("attempts", 3).order("created_at").limit(20);
  const result = { sent: 0, failed: 0 };

  for (const row of rows ?? []) {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { authorization: `Bearer ${key}`, "content-type": "application/json", "idempotency-key": row.idempotency_key },
      body: JSON.stringify({
        from: process.env.RESEND_FROM ?? "azentio.ai <onboarding@resend.dev>",
        to: row.to_email,
        subject: row.subject,
        text: `${row.body}\n\nSign in to azentio.ai to see details.`,
      }),
    });
    const attempts = row.attempts + 1;
    if (res.ok) {
      await db.from("email_outbox").update({ status: "sent", attempts, sent_at: new Date().toISOString(), last_error: null }).eq("id", row.id);
      result.sent++;
    } else {
      const err = (await res.text()).slice(0, 500);
      await db.from("email_outbox").update({ status: attempts >= 3 ? "failed" : "queued", attempts, last_error: err }).eq("id", row.id);
      result.failed++;
    }
  }
  return NextResponse.json(result);
}
