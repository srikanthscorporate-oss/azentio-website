"use client";
import { requestDemo } from "@/app/actions/public";
import { ActionForm, Field } from "@/components/forms";

export function DemoForm({ offerings, selected }: { offerings: { slug: string; name: string }[]; selected?: string }) {
  return (
    <ActionForm action={requestDemo} submit="Request demo">
      {(s) => (
        <>
          <Field name="name" label="Name" error={s.errors?.name}><input id="name" name="name" className="input" required /></Field>
          <Field name="email" label="Work email" error={s.errors?.email}><input id="email" name="email" type="email" className="input" required /></Field>
          <Field name="company" label="Company" error={s.errors?.company}><input id="company" name="company" className="input" required /></Field>
          <Field name="offering_slug" label="Product">
            <select id="offering_slug" name="offering_slug" defaultValue={selected} className="input">
              {offerings.map((o) => <option key={o.slug} value={o.slug}>{o.name}</option>)}
            </select>
          </Field>
          <Field name="message" label="What would you like to see?" error={s.errors?.message}>
            <textarea id="message" name="message" rows={4} maxLength={2000} className="input" />
          </Field>
        </>
      )}
    </ActionForm>
  );
}
