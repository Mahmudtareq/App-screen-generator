"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Layers, LayoutGrid, LayoutTemplate, PenLine, Plus } from "lucide-react";

import type { SessionUser } from "@/components/auth/user-menu";
import { Button } from "@/components/ui/button";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";
import { routes } from "@/config/routes";

import { NavUser } from "./nav-user";

const NAV = [
  { href: routes.private.dashboard, label: "Projects", icon: LayoutGrid },
  { href: routes.public.templates, label: "Templates", icon: LayoutTemplate },
  { href: routes.public.editor, label: "Editor", icon: PenLine },
];

/**
 * The dashboard's navigation rail.
 *
 * Only the dashboard group renders it — the editor is a full-bleed canvas and gets
 * the app bar instead, because a collapsible rail beside five artboards costs the
 * width the artboards need.
 */
export function AppSidebar({ user }: { user: SessionUser | null }) {
  const pathname = usePathname();

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href={routes.public.home}>
                <span className="bg-primary text-primary-foreground grid size-8 shrink-0 place-items-center rounded-lg">
                  <Layers className="size-4" />
                </span>
                <span className="grid flex-1 text-left leading-tight">
                  <span className="truncate font-semibold">Mockup Studio</span>
                  <span className="truncate text-xs opacity-70">
                    Store screenshots
                  </span>
                </span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            {/* Hidden while collapsed rather than shrunk to an icon: the rail
                already has an Editor entry, and two doors to the same room is
                more confusing at 3rem than one. */}
            <Button asChild className="w-full group-data-[collapsible=icon]:hidden">
              <Link href={routes.public.editor}>
                <Plus className="size-4" />
                New mockup
              </Link>
            </Button>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Workspace</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {NAV.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    asChild
                    tooltip={item.label}
                    // `startsWith`, so `/editor/<id>` still lights up Editor.
                    isActive={pathname.startsWith(item.href)}
                  >
                    <Link href={item.href}>
                      <item.icon />
                      <span>{item.label}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {user && (
        <SidebarFooter>
          <NavUser user={user} />
        </SidebarFooter>
      )}

      <SidebarRail />
    </Sidebar>
  );
}
