"use client";
import { useActionState, type ReactNode } from "react";
import type { FormState } from "@/app/actions/public";
import { Button, Notice } from "@/components/ui";

// Generic client wrapper for server actions returning FormState.
export function ActionForm({ action, submit, children, className }: {
  action: (s: FormState, fd: FormData) => Promise<FormState>;
  submit: string;
  children: (s: FormState) => ReactNode;
  className?: string;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  return (
    <form action={formAction} className={className ?? "grid gap-4"}>
      {state.message && <Notice tone={state.ok ? "brand" : "danger"}>{state.message}</Notice>}
      {children(state)}
      <div><Button disabled={pending}>{pending ? "Working…" : submit}</Button></div>
    </form>
  );
}

export function Field({ name, label, error, hint, children }: { name: string; label: string; error?: string[]; hint?: string; children: ReactNode }) {
  return (
    <div>
      <label htmlFor={name} className="label">{label}</label>
      {children}
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
      {error && <p className="mt-1 text-xs text-danger">{error[0]}</p>}
    </div>
  );
}
