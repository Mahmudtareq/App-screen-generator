"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { routes } from "@/config/routes";

/** Path segment → the label a person would recognise it by. */
const LABELS: Record<string, string> = {
  dashboard: "Projects",
};

function titleise(segment: string) {
  return (
    LABELS[segment] ??
    segment.replace(/-/g, " ").replace(/^./, (first) => first.toUpperCase())
  );
}

/**
 * Sticky bar above the page body.
 *
 * The crumbs are derived from the pathname rather than passed down, so a page
 * added to this route group gets a correct header without touching the layout —
 * and the layout stays a server component with nothing to thread through it.
 */
export function DashboardHeader() {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);

  return (
    <header className="bg-background/80 sticky top-0 z-10 flex h-14 shrink-0 items-center gap-2 border-b px-4 backdrop-blur-sm">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="mr-1 !h-4" />

      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem className="hidden sm:block">
            <BreadcrumbLink asChild>
              <Link href={routes.public.home}>Mockup Studio</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>

          {segments.map((segment, index) => {
            const last = index === segments.length - 1;

            return (
              <span key={segment} className="contents">
                <BreadcrumbSeparator className="hidden sm:block" />
                <BreadcrumbItem>
                  {last ? (
                    <BreadcrumbPage>{titleise(segment)}</BreadcrumbPage>
                  ) : (
                    <BreadcrumbLink asChild>
                      <Link href={`/${segments.slice(0, index + 1).join("/")}`}>
                        {titleise(segment)}
                      </Link>
                    </BreadcrumbLink>
                  )}
                </BreadcrumbItem>
              </span>
            );
          })}
        </BreadcrumbList>
      </Breadcrumb>
    </header>
  );
}
