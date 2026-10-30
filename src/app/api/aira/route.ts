import { NextResponse } from "next/server";
import { z } from "zod";
import { getViewer } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { summarise } from "@/lib/aira";

const STOP = new Set(["the", "and", "for", "with", "what", "are", "is", "how", "why", "do", "does", "about", "any", "our", "we", "you", "of", "in", "on", "to", "a", "that", "this", "them", "they", "more", "tell", "can", "there", "which", "who", "say"]);

const body = z.object({
  question: z.string().trim().min(1).max(300),
  history: z.array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().max(2000) })).max(20).default([]),
});

const terms = (s: string) => s.toLowerCase().match(/[a-z]{3,}/g)?.filter((w) => !STOP.has(w)) ?? [];

// AIRA retrieval: only the viewer's RLS-visible *published* shared contributions are searched,
// so withdrawn/unpublished items and private/employee-only content can never be cited.
export async function POST(req: Request) {
  const v = await getViewer();
  if (!v || !(v.active?.orgKind === "client" || v.platformRoles.includes("employee"))) {
    return NextResponse.json({ error: "Not permitted" }, { status: 403 });
  }
  const parsed = body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Ask a question of up to 300 characters." }, { status: 400 });
  const { question, history } = parsed.data;

  // Follow-ups ("which of these are low confidence?") point back at the previous question,
  // so its terms are added when the question refers back or finds nothing by itself.
  const lastUser = [...history].reverse().find((t) => t.role === "user")?.content ?? "";
  const own = terms(question);
  const refersBack = /\b(these|those|them|they|it|that|this one|above|previous)\b/i.test(question);
  const supabase = await createClient();
  const search = (words: string[]) => supabase.from("shared_contributions")
    .select("id, title, body, region, period_label, confidence")
    .eq("status", "published")
    .textSearch("search", words.slice(0, 12).join(" | "))
    .limit(5);

  const combined = [...new Set([...own, ...terms(lastUser)])];
  if (!own.length && !combined.length) {
    return NextResponse.json({ answer: "Ask about a topic, offering or pattern, for example seasonal cash flow or reporting validation.", citations: [], generated: false });
  }
  let { data } = await search(refersBack && lastUser ? combined : own.length ? own : combined);
  if (!data?.length && lastUser) ({ data } = await search(combined));

  if (!data?.length) {
    return NextResponse.json({ answer: "I couldn't find approved shared contributions on that. Try a broader term, or browse the shared learning feed.", citations: [], generated: false });
  }
  const citations = data.map((d, i) => ({ n: i + 1, id: d.id, title: d.title, meta: [d.region, d.period_label].filter(Boolean).join(", ") }));
  const ai = await summarise(question, data.map((d, i) => ({ ...d, n: i + 1 })), history);
  if (ai) return NextResponse.json({ answer: ai.text, citations, generated: true, model: ai.model });

  const low = data.filter((d) => d.confidence === "low").length;
  const answer =
    `${data.length} approved contribution${data.length > 1 ? "s" : ""} relate to this:\n` +
    data.map((d, i) => `- ${d.title} [${i + 1}]`).join("\n") +
    `\n\nThis is a small, self-reported sample${low ? `, ${low} marked low confidence` : ""}. It does not show market prevalence or causation.`;
  return NextResponse.json({ answer, citations, generated: false });
}
