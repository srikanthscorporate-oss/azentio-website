import { getViewer } from "@/lib/session";
import { AiraChat } from "@/components/aira-chat";

// AIRA is available to learning participants only (active client members and employees).
export async function AiraMount() {
  const v = await getViewer();
  if (!v || !(v.active?.orgKind === "client" || v.platformRoles.includes("employee"))) return null;
  return <AiraChat />;
}
