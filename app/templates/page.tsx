import Link from "next/link";
import { ChevronLeft, ChevronRight, Search } from "lucide-react";

import { getTemplateList } from "@/actions/templates/templateActions";
import { AppBar } from "@/components/editor/app-bar";
import {
  CommunityTemplateGrid,
  TemplateGallery,
} from "@/components/editor/template-gallery";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { routes } from "@/config/routes";
import { getSessionUser } from "@/lib/session-user";

export const metadata = {
  title: "Templates · Mockup Studio",
};

const PAGE_SIZE = 24;

/**
 * Public template gallery.
 *
 * Outside the proxy's protected matcher, like the editor itself: picking a template
 * and building a set of screens works without an account, because export runs
 * entirely in the browser. Signing in is required to *save*.
 *
 * Built-ins render on the unfiltered first page; the community grid below them is
 * server-paginated and searched through the public list endpoint.
 */
export default async function TemplatesPage({
  searchParams,
}: PageProps<"/templates">) {
  const params = await searchParams;
  const requested = Number(Array.isArray(params.page) ? params.page[0] : params.page);
  const page = Number.isFinite(requested) && requested >= 1 ? requested : 1;
  const search = (Array.isArray(params.q) ? params.q[0] : params.q)?.trim() ?? "";

  const [user, result] = await Promise.all([
    getSessionUser(),
    getTemplateList(page, PAGE_SIZE, search),
  ]);

  const { docs, pages, hasNext, hasPrev } = result.data;
  const current = result.data.page;
  const showBuiltins = page === 1 && !search;

  return (
    <div className="flex min-h-dvh flex-col">
      <AppBar active="templates" user={user} />

      <main className="mx-auto w-full max-w-5xl px-6 py-10">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="space-y-2">
            <h1 className="text-2xl font-semibold tracking-tight">Templates</h1>
            <p className="max-w-prose text-sm text-muted-foreground">
              Each one opens as five screens with a device on every frame — add,
              delete and reorder them from there. Save your own from the editor
              and it appears here for everyone.
            </p>
          </div>

          {/* A plain GET form: search lands in the URL, so results are linkable
              and the page stays a server component. */}
          <form action={routes.public.templates} className="flex items-center gap-2">
            <Input
              type="search"
              name="q"
              defaultValue={search}
              placeholder="Search templates…"
              className="h-9 w-56"
            />
            <Button type="submit" variant="outline" size="sm" aria-label="Search">
              <Search className="size-4" />
            </Button>
          </form>
        </div>

        {showBuiltins && <TemplateGallery className="mt-8" />}

        {docs.length > 0 && (
          <>
            <h2 className="mt-10 text-lg font-medium tracking-tight">
              {search ? `Templates matching “${search}”` : "Community templates"}
            </h2>
            <CommunityTemplateGrid templates={docs} className="mt-4" />
          </>
        )}

        {docs.length === 0 && search && (
          <p className="mt-10 text-sm text-muted-foreground">
            No templates match “{search}”.
          </p>
        )}

        {pages > 1 && (
          <nav
            aria-label="Pagination"
            className="mt-8 flex items-center justify-center gap-2"
          >
            <PageLink page={current - 1} search={search} enabled={hasPrev}>
              <ChevronLeft className="size-4" />
              Previous
            </PageLink>

            <span className="px-2 text-sm tabular-nums text-muted-foreground">
              {current} / {pages}
            </span>

            <PageLink page={current + 1} search={search} enabled={hasNext}>
              Next
              <ChevronRight className="size-4" />
            </PageLink>
          </nav>
        )}
      </main>
    </div>
  );
}

function PageLink({
  page,
  search,
  enabled,
  children,
}: {
  page: number;
  search: string;
  enabled: boolean;
  children: React.ReactNode;
}) {
  if (!enabled) {
    return (
      <Button variant="outline" size="sm" disabled>
        {children}
      </Button>
    );
  }

  const params = new URLSearchParams({ page: String(page) });
  if (search) params.set("q", search);

  return (
    <Button variant="outline" size="sm" asChild>
      <Link href={`${routes.public.templates}?${params.toString()}`}>{children}</Link>
    </Button>
  );
}
