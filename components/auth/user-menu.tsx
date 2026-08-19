"use client";

import Link from "next/link";
import { useTransition } from "react";
import { signOut } from "next-auth/react";
import { LayoutGrid, Loader2, LogOut, PenLine } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { routes } from "@/config/routes";

/**
 * The three session fields the chrome ever needs. Narrower than `Session["user"]`
 * on purpose: this crosses the server/client boundary on every page that renders
 * the app bar, so it stays a plain serialisable object rather than the whole
 * session — and nothing else on the session is safe to widen it with later.
 */
export interface SessionUser {
  name?: string | null;
  email?: string | null;
  image?: string | null;
}

/**
 * Initials for the fallback avatar. Falls back through name → email → a neutral
 * glyph, because a credentials account created without a name still has to render
 * something that is not an empty circle.
 */
export function initialsOf(user: SessionUser) {
  const source = user.name?.trim() || user.email?.trim() || "";
  if (!source) return "?";

  const words = source.split(/[\s@._-]+/).filter(Boolean);
  const letters = words.slice(0, 2).map((word) => word[0]);

  return letters.join("").toUpperCase() || source[0]!.toUpperCase();
}

export function displayNameOf(user: SessionUser) {
  return user.name?.trim() || user.email?.split("@")[0] || "Account";
}

/** The avatar itself, shared by every trigger and by the menu's own header row. */
export function UserAvatar({
  user,
  className,
}: {
  user: SessionUser;
  className?: string;
}) {
  return (
    <Avatar className={className}>
      {user.image && <AvatarImage src={user.image} alt="" />}
      <AvatarFallback className="bg-primary text-primary-foreground">
        {initialsOf(user)}
      </AvatarFallback>
    </Avatar>
  );
}

/**
 * The menu body, split from its trigger because two shells need the same items
 * behind different-shaped buttons: a round avatar in the app bar, and a full-width
 * row in the dashboard sidebar's footer.
 */
export function UserMenuItems({ user }: { user: SessionUser }) {
  const [signingOut, startSignOut] = useTransition();

  return (
    <>
      <DropdownMenuLabel className="flex items-center gap-3 py-2 font-normal">
        <UserAvatar user={user} className="size-9" />
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{displayNameOf(user)}</p>
          {user.email && (
            <p className="text-muted-foreground truncate text-xs">{user.email}</p>
          )}
        </div>
      </DropdownMenuLabel>

      <DropdownMenuSeparator />

      <DropdownMenuItem asChild>
        <Link href={routes.private.dashboard}>
          <LayoutGrid className="size-4" />
          Your projects
        </Link>
      </DropdownMenuItem>
      <DropdownMenuItem asChild>
        <Link href={routes.public.editor}>
          <PenLine className="size-4" />
          New mockup
        </Link>
      </DropdownMenuItem>

      <DropdownMenuSeparator />

      <DropdownMenuItem
        variant="destructive"
        disabled={signingOut}
        // Kept open-then-closed by the transition rather than a router push:
        // `signOut` clears the session cookie server-side and then navigates, so
        // any local redirect of our own would race it and land on a stale page.
        onSelect={(event) => {
          event.preventDefault();
          startSignOut(async () => {
            await signOut({ callbackUrl: routes.public.home });
          });
        }}
      >
        {signingOut ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <LogOut className="size-4" />
        )}
        Sign out
      </DropdownMenuItem>
    </>
  );
}

/** The app-bar trigger: avatar, plus the name once there is room for it. */
export function UserMenu({ user }: { user: SessionUser }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="ring-offset-background focus-visible:ring-ring flex items-center gap-2 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
        aria-label="Account menu"
      >
        <UserAvatar
          user={user}
          className="ring-border hover:ring-ring size-8 ring-1 transition-[box-shadow,color]"
        />
        <span className="hidden max-w-32 truncate text-sm font-medium lg:inline">
          {displayNameOf(user)}
        </span>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-64">
        <UserMenuItems user={user} />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
