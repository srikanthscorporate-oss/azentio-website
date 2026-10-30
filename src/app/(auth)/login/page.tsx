import { Card, Container, PageHeader } from "@/components/ui";
import { LoginForms } from "./login-forms";

export const metadata = { title: "Sign in" };

const DEMO = [
  ["analyst@northwind.example", "Client member · Northwind"],
  ["admin@northwind.example", "Client admin · Northwind"],
  ["lead@meridian.example", "Client admin · Meridian"],
  ["ops@sunda.example", "Client · Sunda + Meridian (multi-workspace)"],
  ["user@atlas.example", "Client · Atlas (no entitlements)"],
  ["employee@azentio.com", "Employee"],
  ["moderator@azentio.com", "Learning moderator"],
  ["productowner@azentio.com", "Product owner"],
  ["publisher@azentio.com", "Content publisher"],
  ["admin@azentio.com", "Portal administrator"],
];

export default async function Login({ searchParams }: PageProps<"/login">) {
  const { next } = await searchParams;
  return (
    <Container className="max-w-xl pb-16">
      <PageHeader title="Sign in">Employees use a verified @azentio.com address. Clients join by invitation.</PageHeader>
      <Card><LoginForms next={typeof next === "string" ? next : ""} demo={DEMO} /></Card>
    </Container>
  );
}
