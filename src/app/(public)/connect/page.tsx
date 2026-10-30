import { Suspense } from "react";
import { getOfferings } from "@/lib/public-data";
import { Card, Container, PageHeader } from "@/components/ui";
import { DemoForm } from "./demo-form";

// Public page: validated in dev to render an instant static shell.
export const instant = true;

export const metadata = { title: "Request a demo" };

export default function Connect({ searchParams }: PageProps<"/connect">) {
  return (
    <Container className="max-w-2xl pb-16">
      <PageHeader eyebrow="Connect" title="Request a demo">Tell us what you want to see. Please don't include confidential information.</PageHeader>
      <Card>
        <Suspense fallback={<div className="h-80 animate-pulse rounded-lg bg-bg" />}>
          <DemoFormLoader searchParams={searchParams} />
        </Suspense>
      </Card>
    </Container>
  );
}

async function DemoFormLoader({ searchParams }: { searchParams: PageProps<"/connect">["searchParams"] }) {
  const [{ offering }, offerings] = await Promise.all([searchParams, getOfferings()]);
  return <DemoForm offerings={offerings} selected={typeof offering === "string" ? offering : undefined} />;
}
