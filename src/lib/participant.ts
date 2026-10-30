import "server-only";
import { redirect } from "next/navigation";
import { requireViewer } from "@/lib/session";

// Learning hub: active client members and employees only.
export async function requireParticipant() {
  const v = await requireViewer();
  if (!(v.active?.orgKind === "client" || v.platformRoles.includes("employee"))) redirect("/forbidden");
  return v;
}
