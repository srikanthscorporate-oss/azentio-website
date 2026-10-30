import { notFound, redirect } from "next/navigation";
import { requireClientWorkspace } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { ContributionForm } from "@/components/contribution-form";
import { Card, Container, PageHeader } from "@/components/ui";

export default async function EditObservation({ params }: PageProps<"/client/observations/[id]/edit">) {
  const { id } = await params;
  const { viewer } = await requireClientWorkspace();
  const supabase = await createClient();
  const { data: c } = await supabase.from("contributions").select("*").eq("id", id).eq("author_id", viewer.id).maybeSingle();
  if (!c) notFound();
  if (!["draft", "returned"].includes(c.state)) redirect(`/client/observations/${id}`);
  const { data: offerings } = await supabase.from("offerings").select("id, name").order("name");
  return (
    <Container className="max-w-3xl pb-16">
      <PageHeader title={`Edit contribution (v${c.version})`} />
      <Card><ContributionForm offerings={offerings ?? []} initial={c} /></Card>
    </Container>
  );
}
