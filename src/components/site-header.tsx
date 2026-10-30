import Link from "next/link";
import { Bell } from "lucide-react";
import { getViewer, hasPlatformRole } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { signOut, switchWorkspace } from "@/app/actions/session";
import { PortalNav } from "@/components/portal-nav";
import { MenuOverlay } from "@/components/menu-overlay";
import { HeaderShell } from "@/components/header-shell";
import { Logo } from "@/components/logo";

export const PUBLIC_NAV = [
  ["/products", "Products"],
  ["/solutions", "Solutions"],
  ["/lab", "AI Lab"],
  ["/technology", "Technology"],
  ["/media", "Media"],
  ["/live", "Live"],
  ["/insights", "Insights"],
  ["/about", "About"],
  ["/connect", "Request a demo"],
] as const;

export async function SiteHeader() {
  const v = await getViewer();
  let unread = 0;
  if (v) {
    const supabase = await createClient();
    const { count } = await supabase.from("notifications").select("id", { count: "exact", head: true }).is("read_at", null);
    unread = count ?? 0;
  }

  const portal: [string, string][] = [];
  if (v?.active?.orgKind === "client") portal.push(["/client", "Client workspace"]);
  if (hasPlatformRole(v, "employee")) portal.push(["/employee", "Employee"]);
  if (v && (v.active?.orgKind === "client" || hasPlatformRole(v, "employee"))) portal.push(["/learning", "Learning hub"]);
  if (hasPlatformRole(v, "moderator")) portal.push(["/moderation", "Moderation"]);
  if (hasPlatformRole(v, "publisher")) portal.push(["/publisher", "Publishing"]);
  if (hasPlatformRole(v, "portal_admin")) portal.push(["/admin", "Admin"]);

  const menuFooter = v ? (
    <div className="grid gap-4 text-sm">
      <p className="text-white/60">Signed in as {v.name}{v.active && <> · {v.active.orgName}</>}</p>
      {v.memberships.length > 1 && (
        <form action={switchWorkspace} className="flex gap-2">
          <select name="orgId" defaultValue={v.active?.orgId} aria-label="Active workspace" className="min-w-0 flex-1 rounded-lg border border-white/20 bg-navy px-2 py-2 text-white">
            {v.memberships.map((m) => <option key={m.orgId} value={m.orgId}>{m.orgName}</option>)}
          </select>
          <button className="rounded-lg border border-white/25 px-3 py-2 hover:border-brand">Switch</button>
        </form>
      )}
      <form action={signOut}><button className="line-link">Sign out</button></form>
    </div>
  ) : (
    <div className="flex flex-wrap gap-6 text-sm">
      <Link href="/login" className="line-link">Client & employee sign in</Link>
      <Link href="/hackathon/register" className="line-link">Hackathons</Link>
    </div>
  );

  return (
    <HeaderShell below={portal.length > 0 ? <div className="border-t border-white/10 bg-navy-deep/90 backdrop-blur"><PortalNav items={portal} /></div> : undefined}>
      <div className="flex items-center justify-between gap-4 px-4 py-4 md:px-8 lg:px-12">
        <Logo />
        <div className="flex items-center gap-2 sm:gap-3">
          {v?.active && <span className="hidden max-w-52 truncate rounded-lg bg-[#0e0e0e99] px-3 py-2 text-xs font-medium backdrop-blur-[5px] md:inline">{v.active.orgName}</span>}
          {v && (
            <Link href="/notifications" className="relative grid h-10 w-10 place-items-center rounded-lg bg-[#0e0e0e99] backdrop-blur-[5px]" aria-label={`Notifications, ${unread} unread`}>
              <Bell size={17} />
              {unread > 0 && <span className="absolute -right-1 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-brand px-1 text-[10px] font-bold text-navy">{unread}</span>}
            </Link>
          )}
          <MenuOverlay primary={PUBLIC_NAV} portal={portal} footer={menuFooter} />
        </div>
      </div>
    </HeaderShell>
  );
}
