import { cookies } from "next/headers";

import { AppSidebar } from "@/components/dashboard/app-sidebar";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";
import { getSessionUser } from "@/lib/session-user";

/**
 * The signed-in shell: a collapsible rail, a sticky header and the page body.
 *
 * `sidebar_state` is read here rather than left to the client so the rail renders
 * at its remembered width on the server — restoring it in an effect is a visible
 * jump on every navigation.
 *
 * `TooltipProvider` is mounted here rather than in the root layout because the
 * sidebar's collapsed-rail tooltips are the only tooltips in the app; the editor
 * and the marketing pages have no reason to carry the provider.
 */
export default async function AppLayout({ children }: LayoutProps<"/">) {
  const [user, cookieStore] = await Promise.all([getSessionUser(), cookies()]);
  const defaultOpen = cookieStore.get("sidebar_state")?.value !== "false";

  return (
    <TooltipProvider>
      <SidebarProvider defaultOpen={defaultOpen}>
        <AppSidebar user={user} />

        <SidebarInset className="min-w-0">
          <DashboardHeader />
          {children}
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  );
}
