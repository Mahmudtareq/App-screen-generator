"use client";

import Link from "next/link";
import { Layers, LayoutGrid, LayoutTemplate, PenLine } from "lucide-react";

import { UserMenu, type SessionUser } from "@/components/auth/user-menu";
import { Button } from "@/components/ui/button";
import { routes } from "@/config/routes";
import { cn } from "@/lib/utils";

/**
 * Product chrome above the editing toolbar.
 *
 * Split from the toolbar because the two answer different questions — this one is
 * "where am I in the app", the toolbar is "what am I doing to this project" — and
 * because only this row belongs on pages that are not the editor.
 */
export function AppBar({
  active,
  title,
  user,
}: {
  active?: "projects" | "templates" | "editor";
  /**
   * What sits between the nav and the account menu. A node rather than a string
   * because the editor puts an editable project title there, and the bar has no
   * business knowing how renaming works.
   */
  title?: React.ReactNode;
  /** The signed-in user, or null when anonymous — the bar's only session input. */
  user: SessionUser | null;
}) {
  const signedIn = Boolean(user);

  return (
    <header className="flex h-14 shrink-0 items-center gap-3 border-b bg-background px-4">
      <Link href={routes.public.home} className="flex items-center gap-2">
        <span className="grid size-7 place-items-center rounded-lg bg-primary text-primary-foreground">
          <Layers className="size-4" />
        </span>
        <span className="text-sm font-semibold tracking-tight">Mockup Studio</span>
      </Link>

      <nav className="ml-4 hidden items-center gap-1 sm:flex">
        {signedIn && (
          <NavLink
            href={routes.private.dashboard}
            active={active === "projects"}
            icon={<LayoutGrid className="size-4" />}
          >
            Projects
          </NavLink>
        )}
        <NavLink
          href={routes.public.templates}
          active={active === "templates"}
          icon={<LayoutTemplate className="size-4" />}
        >
          Templates
        </NavLink>
        <NavLink
          href={routes.public.editor}
          active={active === "editor"}
          icon={<PenLine className="size-4" />}
        >
          Editor
        </NavLink>
      </nav>

      {title && <div className="ml-auto min-w-0">{title}</div>}

      <div
        className={cn("flex items-center gap-2", !title ? "ml-auto" : "ml-3 shrink-0")}
      >
        {user ? (
          <UserMenu user={user} />
        ) : (
          <>
            <Button variant="ghost" size="sm" asChild>
              <Link href={routes.public.login}>Sign in</Link>
            </Button>
            <Button size="sm" asChild>
              <Link href={routes.public.register}>Sign up free</Link>
            </Button>
          </>
        )}
      </div>
    </header>
  );
}

function NavLink({
  href,
  active,
  icon,
  children,
}: {
  href: string;
  active?: boolean;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Button
      variant={active ? "secondary" : "ghost"}
      size="sm"
      asChild
      className="h-8"
    >
      <Link href={href}>
        {icon}
        {children}
      </Link>
    </Button>
  );
}
