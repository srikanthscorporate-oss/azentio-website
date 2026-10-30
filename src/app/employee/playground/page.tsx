import { requirePlatformRole } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { Sandbox } from "@/components/sandbox";
import { Container, PageHeader } from "@/components/ui";

export default async function Playground({ searchParams }: PageProps<"/employee/playground">) {
  const { error } = await searchParams;
  await requirePlatformRole("employee");
  const supabase = await createClient();
  const { data } = await supabase.from("offerings").select("id, slug, name").order("name");
  return (
    <Container className="pb-16">
      <PageHeader eyebrow="Employee" title="Internal Playground">Guided synthetic scenarios across all offerings. Give structured feedback on each run.</PageHeader>
      <Sandbox offerings={data ?? []} context="employee" error={typeof error === "string" ? error : undefined} />
    </Container>
  );
}
