"use client";
import { useActionState, useState } from "react";
import { saveContribution } from "@/app/actions/learning";
import { CONFIDENCE, EVIDENCE, KINDS, SENSITIVE_PATTERNS, VISIBILITY, VISIBILITY_COPY } from "@/lib/learning";
import { Field } from "@/components/forms";
import { Button, Notice, label } from "@/components/ui";

type Values = Partial<Record<string, string | boolean | null>>;

export function ContributionForm({ offerings, initial }: { offerings: { id: string; name: string }[]; initial?: Values & { id: string } }) {
  const [state, action, pending] = useActionState(saveContribution, {});
  const [text, setText] = useState(`${initial?.title ?? ""} ${initial?.body ?? ""}`);
  const [vis, setVis] = useState(String(initial?.visibility ?? "private"));
  const warnings = SENSITIVE_PATTERNS.filter(([re]) => re.test(text)).map(([, w]) => w);
  const e = state.errors ?? {};
  const val = (k: string) => (initial?.[k] as string | undefined) ?? undefined;

  return (
    <form action={action} className="grid gap-5" onChange={(ev) => {
      const f = ev.currentTarget;
      setText(`${(f.elements.namedItem("title") as HTMLInputElement).value} ${(f.elements.namedItem("body") as HTMLTextAreaElement).value}`);
    }}>
      {initial?.id && <input type="hidden" name="id" value={initial.id} />}
      {state.message && <Notice tone="danger">{state.message}</Notice>}

      <Notice tone="warn">
        Do not include customer names, account numbers, transaction-level data, credentials, confidential pricing or contract terms.
        Automated checks are a safety net, not a privacy guarantee.
      </Notice>

      <div className="grid gap-4 md:grid-cols-2">
        <Field name="kind" label="Type" error={e.kind}>
          <select id="kind" name="kind" defaultValue={val("kind")} className="input">{KINDS.map((k) => <option key={k} value={k}>{label(k)}</option>)}</select>
        </Field>
        <Field name="offering_id" label="Related offering">
          <select id="offering_id" name="offering_id" defaultValue={val("offering_id")} className="input">
            <option value="">None</option>
            {offerings.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
          </select>
        </Field>
      </div>
      <Field name="title" label="Title" error={e.title}><input id="title" name="title" defaultValue={val("title")} minLength={5} maxLength={160} required className="input" /></Field>
      <Field name="body" label="Observation" error={e.body} hint="20 to 4000 characters. Describe the pattern, not the customer.">
        <textarea id="body" name="body" defaultValue={val("body")} minLength={20} maxLength={4000} rows={6} required className="input" />
      </Field>
      {warnings.length > 0 && <Notice tone="danger">This text appears to contain {warnings.join(", ")}. Please remove it before sharing.</Notice>}

      <div className="grid gap-4 md:grid-cols-2">
        <Field name="industry" label="Industry / segment"><input id="industry" name="industry" defaultValue={val("industry")} maxLength={80} className="input" /></Field>
        <Field name="region" label="Region" hint="Prefer broad regions over cities."><input id="region" name="region" defaultValue={val("region")} maxLength={80} className="input" /></Field>
        <Field name="period_start" label="Observation period start" error={e.period_start}><input id="period_start" type="date" name="period_start" defaultValue={val("period_start")} required className="input" /></Field>
        <Field name="period_end" label="Observation period end" error={e.period_end}><input id="period_end" type="date" name="period_end" defaultValue={val("period_end")} required className="input" /></Field>
        <Field name="evidence_type" label="Evidence type">
          <select id="evidence_type" name="evidence_type" defaultValue={val("evidence_type")} className="input">{EVIDENCE.map((k) => <option key={k} value={k}>{label(k)}</option>)}</select>
        </Field>
        <Field name="confidence" label="Confidence">
          <select id="confidence" name="confidence" defaultValue={val("confidence") ?? "medium"} className="input">{CONFIDENCE.map((k) => <option key={k} value={k}>{label(k)}</option>)}</select>
        </Field>
      </div>

      <fieldset className="grid gap-2">
        <legend className="label">Who can see this?</legend>
        {VISIBILITY.map((k) => (
          <label key={k} className={`flex cursor-pointer gap-3 rounded-xl border p-3 ${vis === k ? "border-brand bg-brand-soft" : "border-line"}`}>
            <input type="radio" name="visibility" value={k} checked={vis === k} onChange={() => setVis(k)} />
            <span><span className="font-medium">{VISIBILITY_COPY[k].title}</span><br /><span className="text-sm text-muted">{VISIBILITY_COPY[k].who}</span></span>
          </label>
        ))}
      </fieldset>

      <fieldset className="grid gap-2 rounded-xl border border-line p-4 text-sm">
        <legend className="label px-1">Permissions (each is separate and optional)</legend>
        <label className="flex gap-2"><input type="checkbox" name="consent_process" defaultChecked={!!initial?.consent_process} />
          Store and process this contribution{vis !== "private" && <b className="text-danger">*</b>}</label>
        <label className="flex gap-2"><input type="checkbox" name="consent_publish" defaultChecked={!!initial?.consent_publish} disabled={vis !== "proposed_shared"} />
          Publish a moderator-reviewed, de-identified version to the learning community</label>
        <label className="flex gap-2"><input type="checkbox" name="consent_attribution" defaultChecked={!!initial?.consent_attribution} disabled={vis !== "proposed_shared"} />
          Attribute the shared version to my organisation (still subject to review)</label>
        <label className="flex gap-2"><input type="checkbox" name="consent_training" defaultChecked={!!initial?.consent_training} />
          Allow use in a future, separately governed training or federated-learning programme</label>
        <p className="text-xs text-muted">Membership of this workspace does not imply any of these.</p>
      </fieldset>

      <div className="flex flex-wrap gap-2">
        <Button name="intent" value="save" variant="outline" disabled={pending}>Save private draft</Button>
        {vis !== "private" && <Button name="intent" value="submit" disabled={pending}>{vis === "organisation" ? "Share with my organisation" : "Submit for review"}</Button>}
      </div>
    </form>
  );
}
