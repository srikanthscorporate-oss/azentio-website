import { ButtonLink, Container, PageHeader } from "@/components/ui";

export default function Forbidden() {
  return (
    <Container className="max-w-2xl">
      <PageHeader title="You don't have access to this area" actions={<ButtonLink href="/">Home</ButtonLink>}>
        Access depends on your role, your active workspace and your organisation's entitlements.
      </PageHeader>
    </Container>
  );
}
