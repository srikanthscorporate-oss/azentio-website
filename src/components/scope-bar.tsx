import { Building2, Globe2, Lock, ShieldCheck } from "lucide-react";
import { getViewer } from "@/lib/session";

type Kind = "client" | "employee" | "shared" | "moderation" | "admin" | "publisher";

// A visible statement of who can see the area the viewer is in (private vs shared vs internal).
export async function ScopeBar({ kind }: { kind: Kind }) {
  const v = await getViewer();
  const org = v?.active?.orgName ?? "your organisation";
  const cfg = {
    client: [Building2, "Client workspace", `Private to members of ${org}. Not visible to other organisations.`],
    employee: [Lock, "Internal", "Azentio employees only. Never shown to clients, the public or AIRA answers for clients."],
    shared: [Globe2, "Shared learning", "Reviewed, de-identified contributions visible to all participating organisations and Azentio."],
    moderation: [ShieldCheck, "Moderation", "Only submissions proposed for sharing. Drafts and organisation-only content are never shown here."],
    admin: [ShieldCheck, "Administration", "Privileged actions are audited. Admin access does not include private client contributions."],
    publisher: [ShieldCheck, "Publishing", "Every item needs an explicit audience. Media is served only after an access check."],
  } as const;
  const [Icon, title, text] = cfg[kind];
  return (
    <div className="border-b border-white/10 bg-navy-deep text-white">
      <p className="mx-auto flex max-w-6xl items-center gap-2 px-4 py-2 text-xs">
        <Icon size={14} className="shrink-0 text-brand" aria-hidden />
        <span className="font-bold uppercase tracking-[0.15em] text-brand">{title}</span>
        <span className="hidden text-white/75 sm:inline">{text}</span>
      </p>
    </div>
  );
}
