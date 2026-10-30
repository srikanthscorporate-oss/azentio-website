import { createClient } from "@/lib/supabase/server";
import { Card, Container, PageHeader } from "@/components/ui";
import { DemoForm } from "./demo-form";

export const metadata = { title: "Request a demo" };

export default async function Connect({ searchParams }: PageProps<"/connect">) {
  const { offering } = await searchParams;
  const supabase = await createClient();
  const { data } = await supabase.from("offerings").select("slug, name").eq("is_public", true).order("name");
  return (
    <Container className="max-w-2xl pb-16">
      <PageHeader eyebrow="Connect" title="Request a demo">Tell us what you want to see. Please don't include confidential information.</PageHeader>
      <Card><DemoForm offerings={data ?? []} selected={typeof offering === "string" ? offering : undefined} /></Card>
    </Container>
  );
}
