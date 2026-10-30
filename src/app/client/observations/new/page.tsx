import { requireClientWorkspace } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { ContributionForm } from "@/components/contribution-form";
import { Card, Container, PageHeader } from "@/components/ui";

export default async function NewObservation() {
  const { org } = await requireClientWorkspace();
  const supabase = await createClient();
  const { data } = await supabase.from("offerings").select("id, name").order("name");
  return (
    <Container className="max-w-3xl pb-16">
      <PageHeader eyebrow={org.orgName} title="New contribution">Starts as a private draft. Nothing is shared when you save.</PageHeader>
      <Card><ContributionForm offerings={data ?? []} /></Card>
    </Container>
  );
}
