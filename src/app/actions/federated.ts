"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getViewer } from "@/lib/session";

export async function setParticipation(fd: FormData) {
  const v = await getViewer();
  if (!v?.active || !v.active.roles.includes("client_admin")) redirect("/forbidden");
  const supabase = await createClient();
  const { error } = await supabase.rpc("set_fl_participation", { p_org: v.active.orgId, p_status: z.enum(["opted_in", "withdrawn"]).parse(fd.get("status")) });
  if (error) redirect(`/client/members?error=${encodeURIComponent(error.message)}`);
  revalidatePath("/client/members");
}

export async function decideModel(fd: FormData) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("decide_fl_model", {
    p_model: String(fd.get("id")),
    p_action: z.enum(["approve", "reject", "deploy", "rollback"]).parse(fd.get("action")),
    p_note: String(fd.get("note") ?? ""),
  });
  if (error) redirect(`/employee/federated?error=${encodeURIComponent(error.message)}`);
  revalidatePath("/employee/federated");
}
