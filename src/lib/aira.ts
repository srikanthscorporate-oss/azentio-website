import "server-only";

export type Source = { n: number; id: string; title: string; body: string; region: string | null; period_label: string; confidence: string };
export type Turn = { role: "user" | "assistant"; content: string };

const MODELS = (process.env.OPENROUTER_MODELS ?? "nvidia/nemotron-3.5-lightning:free,google/gemma-4-26b-a4b-it:free,google/gemma-4-31b-it:free").split(",");

const SYSTEM = `You are AIRA, the insight assistant in the azentio.ai collective learning hub.
Answer ONLY from the numbered sources provided. They are moderator-approved, de-identified observations from client organisations.
Rules:
- Cite every claim with source numbers like [1] or [2][3]. Never cite a number that is not provided.
- If the sources do not answer the question, say so plainly and suggest what the user could search for.
- Do not speculate about which organisation or customer wrote a source, and do not invent figures.
- Mention low-confidence sources when you rely on them.
- These are a small, self-reported sample. Never present them as market prevalence or proof of causation.
- Write short paragraphs. You may use a simple list with "- " at the start of a line. No headings, no tables.
- Use plain punctuation. Never use em dashes or en dashes.
- At most 140 words.`;

// Removes dash characters and markdown the chat does not render.
export function tidy(text: string) {
  return text
    .replace(/(\d)\s*[\u2013\u2014]\s*(\d)/g, "$1 to $2")
    .replace(/\s*[\u2014\u2013]\s*/g, ", ")
    .replace(/^#+\s*/gm, "")
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

// Summarises with a free OpenRouter model. Returns null on any failure so the caller can fall back.
export async function summarise(question: string, sources: Source[], history: Turn[]): Promise<{ text: string; model: string } | null> {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) return null;
  const context = sources
    .map((s) => `[${s.n}] ${s.title} (${s.region ?? "region not stated"}, ${s.period_label}, ${s.confidence} confidence)\n${s.body}`)
    .join("\n\n");
  try {
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      signal: AbortSignal.timeout(20_000),
      headers: { authorization: `Bearer ${key}`, "content-type": "application/json", "x-title": "azentio.ai AIRA" },
      body: JSON.stringify({
        models: MODELS,
        max_tokens: 600,
        temperature: 0.2,
        reasoning: { enabled: false },
        messages: [
          { role: "system", content: SYSTEM },
          // earlier turns give follow-up questions their context; sources are always re-supplied fresh
          ...history.slice(-6).map((t) => ({ role: t.role, content: t.content.slice(0, 1200) })),
          { role: "user", content: `Sources:\n${context}\n\nQuestion: ${question}` },
        ],
      }),
    });
    if (!res.ok) return null;
    const json = await res.json();
    const text: string | undefined = json.choices?.[0]?.message?.content?.trim();
    if (!text) return null;
    const clean = tidy(text).replace(/\[(\d+)\]/g, (m, n) => (Number(n) >= 1 && Number(n) <= sources.length ? m : ""));
    return { text: clean, model: json.model ?? MODELS[0] };
  } catch {
    return null;
  }
}
