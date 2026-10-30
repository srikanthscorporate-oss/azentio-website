import Link from "next/link";
import { Bell } from "lucide-react";
import { getViewer, hasPlatformRole } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { signOut, switchWorkspace } from "@/app/actions/session";

const PUBLIC_NAV = [
  ["/products", "Products"],
  ["/media", "Media"],
  ["/insights", "Insights"],
  ["/about", "About"],
  ["/hackathon/register", "Hackathons"],
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

  return (
    <header className="sticky top-0 z-20 border-b border-line bg-surface/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
        <Link href="/" className="text-xl font-semibold tracking-tight">
          <span className="text-brand">azentio</span><span className="text-navy">.ai</span>
        </Link>
        <nav className="flex flex-wrap gap-4 text-sm text-muted">
          {PUBLIC_NAV.map(([href, l]) => <Link key={href} href={href} className="hover:text-ink">{l}</Link>)}
        </nav>
        <div className="ml-auto flex flex-wrap items-center gap-3 text-sm">
          {v ? (
            <>
              {v.memberships.length > 1 && (
                <form action={switchWorkspace} className="flex items-center gap-1">
                  <select name="orgId" defaultValue={v.active?.orgId} className="rounded-lg border border-line bg-surface px-2 py-1 text-sm" aria-label="Active workspace">
                    {v.memberships.map((m) => <option key={m.orgId} value={m.orgId}>{m.orgName}</option>)}
                  </select>
                  <button className="rounded-lg border border-line px-2 py-1">Switch</button>
                </form>
              )}
              {v.memberships.length === 1 && v.active && <span className="rounded-full bg-brand-soft px-3 py-1 text-xs font-medium text-brand-ink">{v.active.orgName}</span>}
              <Link href="/notifications" className="relative" aria-label={`${unread} unread notifications`}>
                <Bell size={18} />
                {unread > 0 && <span className="absolute -right-2 -top-2 rounded-full bg-brand px-1.5 text-[10px] font-bold text-navy">{unread}</span>}
              </Link>
              <form action={signOut}><button className="text-muted hover:text-ink">Sign out</button></form>
            </>
          ) : (
            <>
              <Link href="/login" className="text-muted hover:text-ink">Sign in</Link>
              <Link href="/connect" className="rounded-lg bg-navy px-3 py-1.5 font-medium text-white">Request demo</Link>
            </>
          )}
        </div>
      </div>
      {portal.length > 0 && (
        <div className="border-t border-line bg-bg">
          <nav className="mx-auto flex max-w-6xl flex-wrap gap-4 px-4 py-2 text-sm">
            {portal.map(([href, l]) => <Link key={href} href={href} className="font-medium text-brand-ink hover:underline">{l}</Link>)}
          </nav>
        </div>
      )}
    </header>
  );
}
