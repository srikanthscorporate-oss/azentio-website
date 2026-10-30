"use client";
import { registerInterest } from "@/app/actions/public";
import { ActionForm, Field } from "@/components/forms";
import { Card, Container, PageHeader } from "@/components/ui";

export default function Register() {
  return (
    <Container className="max-w-2xl pb-16">
      <PageHeader eyebrow="Innovation" title="Azentio Build Labs">Register interest in upcoming hackathons.</PageHeader>
      <Card>
        <ActionForm action={registerInterest} submit="Register">
          {(s) => (
            <>
              <input type="hidden" name="event_slug" value="build-labs-2026" />
              <Field name="name" label="Name" error={s.errors?.name}><input id="name" name="name" className="input" required /></Field>
              <Field name="email" label="Email" error={s.errors?.email}><input id="email" name="email" type="email" className="input" required /></Field>
              <Field name="team" label="Team name (optional)"><input id="team" name="team" className="input" /></Field>
            </>
          )}
        </ActionForm>
      </Card>
    </Container>
  );
}
