"use client";
import Link from "next/link";
import { useState } from "react";
import { Sparkles } from "lucide-react";
import { Button, Card } from "@/components/ui";

type Res = { answer: string; citations: { n: number; id: string; title: string }[] };

export function Aira() {
  const [q, setQ] = useState("");
  const [res, setRes] = useState<Res | null>(null);
  const [busy, setBusy] = useState(false);
  return (
    <Card className="bg-navy text-white">
      <p className="flex items-center gap-2 font-semibold"><Sparkles size={16} className="text-lime" /> Ask AIRA</p>
      <p className="mt-1 text-xs text-white/70">Answers cite approved shared contributions only. Retrieval, not model training.</p>
      <form className="mt-3 flex gap-2" onSubmit={async (e) => {
        e.preventDefault(); setBusy(true);
        const r = await fetch("/api/aira", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ question: q }) });
        setRes(await r.json()); setBusy(false);
      }}>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="e.g. seasonal cash flow" className="input text-ink" />
        <Button variant="brand" disabled={busy}>Ask</Button>
      </form>
      {res && (
        <div className="mt-3 text-sm">
          <p>{res.answer}</p>
          <ul className="mt-2 grid gap-1">
            {res.citations.map((c) => <li key={c.id}><Link href={`/learning/${c.id}`} className="text-lime underline">[{c.n}] {c.title}</Link></li>)}
          </ul>
        </div>
      )}
    </Card>
  );
}
