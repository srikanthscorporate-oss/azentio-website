import { createClient } from "@/lib/supabase/server";
import { getViewer } from "@/lib/session";
import { acceptInvitation } from "@/app/actions/auth";
import { Button, ButtonLink, Card, Container, Notice, PageHeader, label } from "@/components/ui";

export default async function Invite({ params, searchParams }: PageProps<"/invite/[token]">) {
  const { token } = await params;
  const { error } = await searchParams;
  const supabase = await createClient();
  const { data } = await supabase.rpc("invitation_preview", { p_token: token });
  const inv = data?.[0] as { org_name: string; role: string; email_hint: string; status: string } | undefined;
  const v = await getViewer();

  return (
    <Container className="max-w-xl pb-16">
      <PageHeader eyebrow="Invitation" title={inv ? `Join ${inv.org_name}` : "Invitation not found"} />
      <Card className="grid gap-4">
        {typeof error === "string" && <Notice tone="danger">{error}</Notice>}
        {!inv ? <p>This link is invalid.</p> : inv.status !== "valid" ? (
          <Notice tone="warn">This invitation is {inv.status}. Ask your organisation administrator for a new one.</Notice>
        ) : (
          <>
            <p>Role: <b>{label(inv.role)}</b> · Issued to <b>{inv.email_hint}</b></p>
            {!v ? (
              <ButtonLink href={`/login?next=/invite/${token}`}>Verify your email to continue</ButtonLink>
            ) : (
              <form action={acceptInvitation}>
                <input type="hidden" name="token" value={token} />
                <p className="mb-3 text-sm text-muted">Signed in as {v.email}. Only the invited address can accept.</p>
                <Button>Accept invitation</Button>
              </form>
            )}
          </>
        )}
      </Card>
    </Container>
  );
}
