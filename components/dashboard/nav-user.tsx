"use client";

import { ChevronsUpDown } from "lucide-react";

import {
  UserAvatar,
  UserMenuItems,
  displayNameOf,
  type SessionUser,
} from "@/components/auth/user-menu";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

/**
 * The sidebar's footer identity row — same menu as the app bar's avatar, behind a
 * full-width trigger.
 *
 * The menu opens to the right on desktop and upward on mobile, because on mobile
 * the sidebar is a sheet: there is nothing to the right of it to open into.
 */
export function NavUser({ user }: { user: SessionUser }) {
  const { isMobile } = useSidebar();

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <UserAvatar user={user} className="size-8 rounded-lg" />
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">{displayNameOf(user)}</span>
                {user.email && (
                  <span className="truncate text-xs opacity-70">{user.email}</span>
                )}
              </div>
              <ChevronsUpDown className="ml-auto size-4" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>

          <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={4}
          >
            <UserMenuItems user={user} />
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
