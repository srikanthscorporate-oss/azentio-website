"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getViewer, requirePlatformRole } from "@/lib/session";

const ticket = z.object({
  subject: z.string().trim().min(5).max(160),
  body: z.string().trim().min(10).max(4000),
  priority: z.enum(["low", "normal", "high"]),
  offering_id: z.uuid().optional().or(z.literal("").transform(() => undefined)),
});

export async function createTicket(fd: FormData) {
  const v = await getViewer();
  if (!v?.active || v.active.orgKind !== "client") redirect("/forbidden");
  const d = ticket.safeParse(Object.fromEntries(fd));
  if (!d.success) redirect("/client/support?error=Please add a subject (5+ characters) and a description (10+ characters)");
  const supabase = await createClient();
  // org comes from the server-validated active workspace, never the form
  const { data, error } = await supabase.from("support_tickets").insert({ ...d.data, org_id: v.active.orgId }).select("id").single();
  if (error) redirect(`/client/support?error=${encodeURIComponent(error.message)}`);

  // Optional helpdesk integration: forward the ticket the client chose to raise, and store the external reference.
  const hook = process.env.SUPPORT_WEBHOOK_URL;
  if (hook) {
    try {
      const res = await fetch(hook, {
        method: "POST", signal: AbortSignal.timeout(8000),
        headers: { "content-type": "application/json", ...(process.env.SUPPORT_WEBHOOK_TOKEN ? { authorization: `Bearer ${process.env.SUPPORT_WEBHOOK_TOKEN}` } : {}) },
        body: JSON.stringify({ ticket_id: data.id, organisation: v.active.orgName, subject: d.data.subject, description: d.data.body, priority: d.data.priority }),
      });
      const ref = res.ok ? ((await res.json().catch(() => ({}))) as { id?: string }).id : undefined;
      if (ref) await setExternalRef(data.id, String(ref));
    } catch {
      // the ticket is stored either way; forwarding can be retried by support staff
    }
  }
  revalidatePath("/client/support");
  redirect("/client/support?created=1");
}

async function setExternalRef(id: string, ref: string) {
  const { createServiceClient } = await import("@/lib/supabase/server");
  await createServiceClient().from("support_tickets").update({ external_ref: ref }).eq("id", id);
}

export async function setTicketStatus(fd: FormData) {
  await requirePlatformRole("portal_admin");
  const supabase = await createClient();
  await supabase.from("support_tickets").update({
    status: z.enum(["open", "in_progress", "resolved"]).parse(fd.get("status")), updated_at: new Date().toISOString(),
  }).eq("id", String(fd.get("id")));
  revalidatePath("/admin");
}
