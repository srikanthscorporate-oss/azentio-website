import { NextResponse } from "next/server";
import { getViewer } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";

const STOP = new Set(["the", "and", "for", "with", "what", "are", "is", "how", "why", "do", "does", "about", "any", "our", "we", "you", "of", "in", "on", "to", "a"]);

// AIRA retrieval: only the viewer's RLS-visible *published* shared contributions are searched,
// so withdrawn/unpublished items and private/employee-only content can never be cited.
export async function POST(req: Request) {
  const v = await getViewer();
  if (!v || !(v.active?.orgKind === "client" || v.platformRoles.includes("employee"))) {
    return NextResponse.json({ error: "Not permitted" }, { status: 403 });
  }
  const { question } = (await req.json().catch(() => ({}))) as { question?: string };
  const terms = String(question ?? "").toLowerCase().match(/[a-z]{3,}/g)?.filter((w) => !STOP.has(w)).slice(0, 8) ?? [];
  if (!terms.length) return NextResponse.json({ answer: "Ask about a topic, offering or pattern.", citations: [] });

  const supabase = await createClient();
  const { data } = await supabase.from("shared_contributions")
    .select("id, title, body, region, period_label, confidence")
    .eq("status", "published")
    .textSearch("search", terms.join(" | "))
    .limit(5);

  if (!data?.length) {
    return NextResponse.json({ answer: "No approved shared contributions match that question.", citations: [] });
  }
  const lowConfidence = data.filter((d) => d.confidence === "low").length;
  const answer =
    `${data.length} approved contribution(s) relate to this. ` +
    data.map((d, i) => `[${i + 1}] ${d.title} (${d.region}, ${d.period_label}).`).join(" ") +
    ` This is a small, self-reported sample${lowConfidence ? `, ${lowConfidence} marked low confidence` : ""}; it does not show market prevalence or causation.`;
  return NextResponse.json({ answer, citations: data.map((d, i) => ({ n: i + 1, id: d.id, title: d.title })) });
}
