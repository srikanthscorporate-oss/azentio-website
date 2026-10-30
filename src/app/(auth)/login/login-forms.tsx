"use client";
import { useActionState, useState } from "react";
import { demoLogin, sendCode, verifyCode } from "@/app/actions/auth";
import { Button, Notice } from "@/components/ui";

export function LoginForms({ next, demo }: { next: string; demo: string[][] }) {
  const [sent, send, sending] = useActionState(sendCode, {});
  const [verified, verify, verifying] = useActionState(verifyCode, {});
  const [demoState, demoAction, demoPending] = useActionState(demoLogin, {});
  const [persona, setPersona] = useState(demo[0][0]);

  return (
    <div className="grid gap-8">
      <div className="grid gap-3">
        <h2 className="font-semibold">Email code</h2>
        {!sent.ok ? (
          <form action={send} className="grid gap-3">
            {sent.message && <Notice tone="danger">{sent.message}</Notice>}
            <input name="email" type="email" required placeholder="you@company.com" className="input" aria-label="Email" />
            <div><Button disabled={sending}>Send code</Button></div>
          </form>
        ) : (
          <form action={verify} className="grid gap-3">
            <Notice>{sent.message}</Notice>
            {verified.message && <Notice tone="danger">{verified.message}</Notice>}
            <input type="hidden" name="email" value={sent.email} />
            <input type="hidden" name="next" value={next} />
            <input name="code" inputMode="numeric" autoComplete="one-time-code" required placeholder="6-digit code" className="input" aria-label="Code" />
            <div><Button disabled={verifying}>Verify and sign in</Button></div>
          </form>
        )}
      </div>

      <form action={demoAction} className="grid gap-3 border-t border-line pt-6">
        <h2 className="font-semibold">Judging personas (synthetic accounts)</h2>
        {demoState.message && <Notice tone="danger">{demoState.message}</Notice>}
        <input type="hidden" name="next" value={next} />
        <select name="email" value={persona} onChange={(e) => setPersona(e.target.value)} className="input" aria-label="Persona">
          {demo.map(([e, l]) => <option key={e} value={e}>{l} ({e})</option>)}
        </select>
        <input name="password" type="password" required placeholder="Demo password" className="input" aria-label="Demo password" />
        <div><Button variant="outline" disabled={demoPending}>Sign in as persona</Button></div>
      </form>
    </div>
  );
}
