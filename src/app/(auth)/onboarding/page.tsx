import { redirect } from "next/navigation";
import { getViewer, homeFor } from "@/lib/session";
import { acceptTerms } from "@/app/actions/auth";
import { Button, Card, Container, PageHeader } from "@/components/ui";

export default async function Onboarding() {
  const v = await getViewer();
  if (!v) redirect("/login");
  if (v.termsAccepted) redirect(homeFor(v));
  return (
    <Container className="max-w-2xl pb-16">
      <PageHeader eyebrow={v.active?.orgName} title="Welcome to your workspace" />
      <Card className="grid gap-4 text-sm">
        <p className="font-semibold">Workspace terms</p>
        <p>Use this workspace only for your organisation's authorised work. Use synthetic data in sandboxes unless your organisation has explicitly approved otherwise.</p>
        <p className="font-semibold">How sharing works</p>
        <ul className="list-disc space-y-1 pl-5">
          <li><b>Joining this workspace is not consent</b> to share your information or to train any model on it.</li>
          <li>Everything you write starts as a private draft. Saving never shares it.</li>
          <li>You choose: private to you, your organisation, or proposed for the learning community.</li>
          <li>Community sharing needs your explicit consent and a moderator's review. Only a de-identified copy is published.</li>
          <li>Attribution to your organisation and use in any training programme are separate, optional consents.</li>
          <li>You can withdraw a shared contribution at any time. Copies already viewed by others cannot be recalled.</li>
        </ul>
        <form action={acceptTerms}><Button>I understand, continue</Button></form>
      </Card>
    </Container>
  );
}
