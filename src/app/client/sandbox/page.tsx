import { requireClientWorkspace } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { Sandbox } from "@/components/sandbox";
import { Container, PageHeader } from "@/components/ui";

export default async function ClientSandbox({ searchParams }: PageProps<"/client/sandbox">) {
  const { error } = await searchParams;
  const { org } = await requireClientWorkspace();
  const supabase = await createClient();
  const { data } = await supabase.from("entitlements").select("offerings(id, slug, name)").eq("org_id", org.orgId);
  const offerings = (data ?? []).map((e) => e.offerings as unknown as { id: string; slug: string; name: string });
  return (
    <Container className="pb-16">
      <PageHeader eyebrow={org.orgName} title="Product sandboxes">Entitled guided demonstrations. Runs are private to you.</PageHeader>
      <Sandbox offerings={offerings} context="client" error={typeof error === "string" ? error : undefined} />
    </Container>
  );
}
