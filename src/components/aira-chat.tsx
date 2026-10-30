"use client";
import Link from "next/link";
import { Fragment, useEffect, useRef, useState, type ReactNode } from "react";
import { ArrowUp, MessageCircle, RotateCcw, X } from "lucide-react";
import clsx from "clsx";

type Citation = { n: number; id: string; title: string; meta?: string };
type Msg = { id: string; role: "user" | "assistant"; content: string; citations?: Citation[]; generated?: boolean; model?: string; error?: boolean };

const STORE = "aira-chat-v1";
const SUGGESTIONS = ["How are seasonal cash flows being treated?", "What product gaps have clients reported?", "Which observations are low confidence?"];

const load = (): Msg[] => {
  try { return JSON.parse(sessionStorage.getItem(STORE) ?? "[]"); } catch { return []; }
};
const save = (m: Msg[]) => {
  try { sessionStorage.setItem(STORE, JSON.stringify(m.slice(-40))); } catch { /* storage unavailable: history lasts until reload */ }
};

// Inline formatting: [n] citations become numbered chips; bare URLs show only their host name.
function inline(text: string, cites: Citation[]): ReactNode[] {
  return text.split(/(\[\d+\]|https?:\/\/[^\s)]+)/g).map((part, i) => {
    const c = part.match(/^\[(\d+)\]$/);
    if (c) {
      const cite = cites.find((x) => x.n === Number(c[1]));
      if (!cite) return null;
      return (
        <Link key={i} href={`/learning/${cite.id}`} title={cite.title} aria-label={`Source ${cite.n}: ${cite.title}`}
          className="mx-0.5 inline-grid h-4 min-w-4 place-items-center rounded bg-brand-soft px-1 align-text-top text-[10px] font-semibold text-brand-ink hover:bg-brand hover:text-navy">
          {cite.n}
        </Link>
      );
    }
    if (/^https?:\/\//.test(part)) {
      let host = part;
      try { host = new URL(part).hostname.replace(/^www\./, ""); } catch { /* keep as text */ }
      return <a key={i} href={part} target="_blank" rel="noreferrer" className="underline">{host}</a>;
    }
    return <Fragment key={i}>{part}</Fragment>;
  });
}

// Block formatting: paragraphs separated by blank lines, "- " lines become a list.
function Rich({ text, cites }: { text: string; cites: Citation[] }) {
  return (
    <div className="grid gap-2">
      {text.split(/\n{2,}/).map((block, i) => {
        const lines = block.split("\n");
        if (lines.every((l) => /^\s*[-*]\s+/.test(l))) {
          return <ul key={i} className="grid gap-1 pl-4 [list-style:disc]">{lines.map((l, j) => <li key={j}>{inline(l.replace(/^\s*[-*]\s+/, ""), cites)}</li>)}</ul>;
        }
        return <p key={i}>{inline(block, cites)}</p>;
      })}
    </div>
  );
}

export function AiraChat() {
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const launcherRef = useRef<HTMLButtonElement>(null);

  useEffect(() => { listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" }); }, [msgs, busy]);
  useEffect(() => { if (open) inputRef.current?.focus(); }, [open]);

  const update = (next: Msg[]) => { setMsgs(next); save(next); };
  const close = () => { setOpen(false); requestAnimationFrame(() => launcherRef.current?.focus()); };

  async function ask(q: string) {
    const question = q.trim().slice(0, 300);
    if (!question || busy) return;
    const history = msgs.filter((m) => !m.error).map(({ role, content }) => ({ role, content }));
    const withUser = [...msgs, { id: crypto.randomUUID(), role: "user" as const, content: question }];
    update(withUser);
    setInput("");
    setBusy(true);
    try {
      const r = await fetch("/api/aira", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ question, history }) });
      const j = await r.json();
      update([...withUser, r.ok
        ? { id: crypto.randomUUID(), role: "assistant", content: j.answer, citations: j.citations, generated: j.generated, model: j.model }
        : { id: crypto.randomUUID(), role: "assistant", content: j.error ?? "Something went wrong. Please try again.", error: true }]);
    } catch {
      update([...withUser, { id: crypto.randomUUID(), role: "assistant", content: "I couldn't reach the server. Check your connection and try again.", error: true }]);
    } finally {
      setBusy(false);
      inputRef.current?.focus();
    }
  }

  return (
    <>
      {!open && (
        <button ref={launcherRef} onClick={() => { setMsgs(load()); setOpen(true); }} aria-haspopup="dialog"
          aria-label="Ask AIRA"
          className="fixed bottom-5 right-5 z-40 grid h-16 w-16 place-items-center rounded-full border-2 border-[#4fbf7c] bg-brand text-sm font-bold tracking-wide text-navy shadow-[0_8px_32px_#171b3a40] transition-transform hover:-translate-y-0.5">
          <span className="flex flex-col items-center leading-none"><MessageCircle size={16} aria-hidden className="mb-1" />AIRA</span>
        </button>
      )}

      {open && (
        <section role="dialog" aria-label="AIRA assistant" onKeyDown={(e) => e.key === "Escape" && close()}
          className="fixed inset-0 z-50 flex flex-col overflow-hidden bg-surface sm:inset-auto sm:bottom-5 sm:right-5 sm:h-[min(640px,calc(100dvh-2.5rem))] sm:w-[400px] sm:rounded-xl sm:border sm:border-line sm:shadow-[0_15px_65px_#171b3a40]">
          <header className="flex items-center gap-3 bg-navy px-4 py-3 text-white">
            <span className="grid h-9 w-9 place-items-center rounded-full bg-brand text-[10px] font-bold text-navy" aria-hidden>AIRA</span>
            <div className="min-w-0 flex-1">
              <p className="font-bold leading-tight">AIRA</p>
              <p className="truncate text-xs text-white/70">Answers from approved shared learning only</p>
            </div>
            {msgs.length > 0 && (
              <button onClick={() => update([])} className="rounded-lg p-2 text-white/70 hover:bg-white/10 hover:text-white" aria-label="Start a new chat" title="New chat">
                <RotateCcw size={16} />
              </button>
            )}
            <button onClick={close} className="rounded-lg p-2 text-white/70 hover:bg-white/10 hover:text-white" aria-label="Close AIRA"><X size={18} /></button>
          </header>

          <div ref={listRef} className="flex-1 overflow-y-auto bg-bg px-4 py-4" aria-live="polite">
            {msgs.length === 0 && (
              <div className="grid gap-4 pt-2">
                <div className="rounded-xl border border-line bg-surface p-4 text-sm">
                  <p className="font-bold">Hi, I'm AIRA.</p>
                  <p className="mt-1 text-muted">
                    I summarise reviewed, de-identified contributions from the learning community and link every point to its source.
                    I can't see private drafts, organisation-only notes or anything you aren't allowed to see.
                  </p>
                </div>
                <div className="grid gap-2">
                  <p className="eyebrow text-muted">Try asking</p>
                  {SUGGESTIONS.map((s) => (
                    <button key={s} onClick={() => ask(s)} className="rounded-lg border border-line bg-surface px-3 py-2 text-left text-sm hover:border-brand">{s}</button>
                  ))}
                </div>
              </div>
            )}

            <ol className="grid gap-4">
              {msgs.map((m) => (
                <li key={m.id} className={clsx("flex", m.role === "user" ? "justify-end" : "justify-start")}>
                  {m.role === "user" ? (
                    <div className="max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-br-sm bg-navy px-3.5 py-2 text-sm text-white">
                      <span className="sr-only">You: </span>{m.content}
                    </div>
                  ) : (
                    <div className={clsx("max-w-[92%] rounded-2xl rounded-bl-sm border px-3.5 py-3 text-sm", m.error ? "border-danger/30 bg-danger-soft" : "border-line bg-surface")}>
                      <span className="sr-only">AIRA: </span>
                      <Rich text={m.content} cites={m.citations ?? []} />
                      {!!m.citations?.length && (
                        <div className="mt-3 border-t border-line pt-2">
                          <p className="eyebrow mb-1.5 text-muted">Sources</p>
                          <ul className="grid gap-1">
                            {m.citations.map((c) => (
                              <li key={c.id}>
                                <Link href={`/learning/${c.id}`} className="group flex gap-2 rounded-md p-1 hover:bg-bg">
                                  <span className="grid h-5 min-w-5 place-items-center rounded bg-brand-soft text-[10px] font-semibold text-brand-ink">{c.n}</span>
                                  <span className="min-w-0">
                                    <span className="line-clamp-1 text-xs font-medium group-hover:underline">{c.title}</span>
                                    {c.meta && <span className="block text-[11px] text-muted">{c.meta}</span>}
                                  </span>
                                </Link>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {!m.error && (
                        <p className="mt-2 text-[11px] text-muted">
                          {m.generated ? `AI summary (${m.model?.split("/")[1]?.replace(":free", "") ?? "model"}). Check the sources.` : "Quick answer from search."}
                        </p>
                      )}
                    </div>
                  )}
                </li>
              ))}
              {busy && (
                <li className="flex" aria-label="AIRA is writing">
                  <div className="flex gap-1 rounded-2xl rounded-bl-sm border border-line bg-surface px-4 py-3">
                    {[0, 150, 300].map((d) => <span key={d} className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted motion-reduce:animate-none" style={{ animationDelay: `${d}ms` }} />)}
                  </div>
                </li>
              )}
            </ol>
          </div>

          <form className="border-t border-line bg-surface p-3" onSubmit={(e) => { e.preventDefault(); ask(input); }}>
            <div className="flex items-end gap-2 rounded-xl border border-line bg-bg p-1.5 focus-within:border-brand">
              <label htmlFor="aira-input" className="sr-only">Message AIRA</label>
              <textarea id="aira-input" ref={inputRef} value={input} rows={1} maxLength={300}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); ask(input); } }}
                placeholder="Ask about shared learning"
                className="max-h-28 min-h-9 flex-1 resize-none bg-transparent px-2 py-1.5 text-sm outline-none [field-sizing:content]" />
              <button disabled={busy || !input.trim()} aria-label="Send" className="grid h-9 w-9 place-items-center rounded-lg bg-brand text-navy disabled:opacity-40">
                <ArrowUp size={16} />
              </button>
            </div>
            <p className="mt-1.5 px-1 text-[11px] text-muted">Enter to send, Shift+Enter for a new line. This chat is kept until you close the browser tab.</p>
          </form>
        </section>
      )}
    </>
  );
}
