import { Container, PageHeader } from "@/components/ui";

export default function Pending() {
  return (
    <Container className="max-w-2xl">
      <PageHeader title="Awaiting approval">
        Your @azentio.com identity is verified. A portal administrator must approve your employee membership before internal areas open.
      </PageHeader>
    </Container>
  );
}
