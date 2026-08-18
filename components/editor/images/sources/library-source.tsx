"use client";

import { useMemo, useState } from "react";
import { ArrowRight, ExternalLink, Loader2, Search } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  categoryGroups,
  categoryItems,
  IMAGE_LIBRARY,
  LIBRARY_COLOR_PRESETS,
  LIBRARY_DEFAULT_COLOR,
  type LibraryCategory,
  type LibraryGroup,
  type LibraryItem,
} from "@/config/image-library";
import { rasterizeLibraryImage } from "@/lib/editor/rasterize";
import { cn } from "@/lib/utils";

import { LibraryTile } from "../library-tile";
import type { ImageSourceProps } from "../image-sources";

/**
 * The built-in artwork: scribbles, store badges and backdrops.
 *
 * What exists is `IMAGE_LIBRARY` in config, so this component never changes when
 * artwork is added or a whole category is dropped.
 *
 * Two views of the same data. The overview is a row per category, scrolling
 * sideways — which keeps several categories legible without a wall of two hundred
 * thumbnails. "View all" opens one category on its own, and *that* is where a
 * category's sub-tabs and its licensing notice appear, because they only mean
 * anything once you are looking at that category's artwork alone.
 */
export function LibrarySource({ onPick }: ImageSourceProps) {
  const [query, setQuery] = useState("");
  const [only, setOnly] = useState<string | null>(null);
  const [group, setGroup] = useState<string | null>(null);
  const [color, setColor] = useState<string>(LIBRARY_DEFAULT_COLOR);
  const [loading, setLoading] = useState<string | null>(null);

  const needle = query.trim().toLowerCase();
  const focused = only ? IMAGE_LIBRARY.find((entry) => entry.id === only) : undefined;

  const matches = (item: LibraryItem) =>
    !needle || `${item.name} ${item.keywords ?? ""}`.toLowerCase().includes(needle);

  /** The overview's rows: one per category, everything in it, minus the search. */
  const rows = useMemo(
    () =>
      IMAGE_LIBRARY.map((category) => ({
        category: category as LibraryCategory,
        items: categoryItems(category).filter(matches),
      })).filter((row) => row.items.length > 0),
    // `matches` closes over the query, which is the only thing it depends on.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [needle],
  );

  // Resolved here rather than inside the focused view, because the ink swatch is a
  // sibling of it and has to know whether *this group's* artwork can be tinted — the
  // category as a whole is the wrong question the moment a category has groups.
  const groups = focused ? categoryGroups(focused) : [];
  const activeGroup =
    groups.find((entry) => entry.id === group) ?? (groups[0] as LibraryGroup | undefined);

  const open = (categoryId: string) => {
    setOnly(categoryId);
    setGroup(null);
  };

  /**
   * A pick is bytes, not a path.
   *
   * The library is rasterised at the moment it is chosen so the rest of the editor
   * never has to know these images came from anywhere different — same local
   * asset, same upload on save, same everything.
   */
  const pick = async (category: LibraryCategory, item: LibraryItem) => {
    setLoading(item.src);

    try {
      const file = await rasterizeLibraryImage(item.src, {
        name: item.id,
        longEdge: category.rasterSize,
        color: item.recolorable ? color : undefined,
      });

      onPick({ kind: "file", file });
    } catch {
      toast.error(`“${item.name}” could not be loaded.`);
    } finally {
      setLoading(null);
    }
  };

  const inkVisible = focused
    ? Boolean(activeGroup?.items.some((item) => item.recolorable))
    : rows.some((row) => row.items.some((item) => item.recolorable));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-56 flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search scribbles, badges and backgrounds…"
            className="h-9 pl-8"
            aria-label="Search the image library"
          />
        </div>

        <div className="flex flex-wrap gap-1.5">
          <FilterChip
            label="All"
            active={only === null}
            onClick={() => {
              setOnly(null);
              setGroup(null);
            }}
          />
          {IMAGE_LIBRARY.map((category) => (
            <FilterChip
              key={category.id}
              label={category.label.split(" ")[0]}
              active={only === category.id}
              onClick={() => open(category.id)}
            />
          ))}
        </div>
      </div>

      {/*
        Ink is a property of the pick rather than of the layer: recolouring happens
        in the SVG before it is rasterised, so it has to be decided here. It also
        means a white scribble for a dark backdrop costs no second file.
      */}
      {inkVisible && (
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Ink</span>
          {LIBRARY_COLOR_PRESETS.map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => setColor(preset)}
              aria-label={`Use ${preset}`}
              aria-pressed={color === preset}
              className={cn(
                "size-5 rounded-full border shadow-xs transition-transform",
                color === preset
                  ? "ring-2 ring-primary ring-offset-2 ring-offset-background"
                  : "hover:scale-110",
              )}
              style={{ backgroundColor: preset }}
            />
          ))}
        </div>
      )}

      {focused && activeGroup ? (
        <FocusedCategory
          category={focused}
          groups={groups}
          active={activeGroup}
          onGroupChange={setGroup}
          matches={matches}
          loading={loading}
          color={color}
          onPick={(item) => pick(focused, item)}
        />
      ) : (
        rows.map(({ category, items }) => (
          <section key={category.id} className="space-y-2">
            <header className="flex items-end justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold">{category.label}</h3>
                <p className="text-xs text-muted-foreground">{category.description}</p>
              </div>

              <Button variant="secondary" size="sm" onClick={() => open(category.id)}>
                View all
                <ArrowRight className="size-3.5" />
              </Button>
            </header>

            <div className="flex gap-2 overflow-x-auto pb-2">
              {items.map((item) => (
                <LibraryTile
                  key={item.id}
                  item={item}
                  color={item.recolorable ? color : undefined}
                  busy={loading === item.src}
                  fixedWidth
                  fit={category.tileFit}
                  onSelect={() => pick(category, item)}
                />
              ))}
            </div>
          </section>
        ))
      )}

      {!focused && rows.length === 0 && (
        <p className="py-16 text-center text-sm text-muted-foreground">
          Nothing in the library matches “{query}”.
        </p>
      )}

      {loading && (
        <p className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="size-3.5 animate-spin" />
          Preparing image…
        </p>
      )}
    </div>
  );
}

/** One category on its own: its notice, its sub-tabs if it has any, and its grid. */
function FocusedCategory({
  category,
  groups,
  active,
  onGroupChange,
  matches,
  loading,
  color,
  onPick,
}: {
  category: LibraryCategory;
  groups: readonly LibraryGroup[];
  active: LibraryGroup;
  onGroupChange: (id: string) => void;
  matches: (item: LibraryItem) => boolean;
  loading: string | null;
  color: string;
  onPick: (item: LibraryItem) => void;
}) {
  const items = active.items.filter(matches);

  return (
    <section className="space-y-3">
      <header className="space-y-1">
        <h3 className="text-sm font-semibold">
          {category.label}
          {groups.length > 1 && (
            <span className="text-muted-foreground"> / {active.label}</span>
          )}
        </h3>
        <p className="text-xs text-muted-foreground">{category.description}</p>
      </header>

      {category.notice && (
        <div className="space-y-1 rounded-lg border bg-muted/40 px-3 py-2">
          <p className="text-xs text-muted-foreground">{category.notice.text}</p>
          <p className="flex flex-wrap gap-x-4 gap-y-1">
            {category.notice.links.map((link) => (
              <a
                key={link.href}
                href={link.href}
                target="_blank"
                rel="noreferrer noopener"
                className="inline-flex items-center gap-1 text-xs text-primary underline-offset-2 hover:underline"
              >
                {link.label}
                <ExternalLink className="size-3" />
              </a>
            ))}
          </p>
        </div>
      )}

      {groups.length > 1 && (
        <div className="flex gap-1 border-b">
          {groups.map((entry) => (
            <button
              key={entry.id}
              type="button"
              onClick={() => onGroupChange(entry.id)}
              aria-pressed={entry.id === active.id}
              className={cn(
                "-mb-px border-b-2 px-3 py-1.5 text-sm font-medium transition-colors",
                entry.id === active.id
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              {entry.label}
            </button>
          ))}
        </div>
      )}

      {items.length > 0 ? (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(6.5rem,1fr))] gap-2">
          {items.map((item) => (
            <LibraryTile
              key={item.id}
              item={item}
              color={item.recolorable ? color : undefined}
              busy={loading === item.src}
              fixedWidth={false}
              fit={category.tileFit}
              onSelect={() => onPick(item)}
            />
          ))}
        </div>
      ) : (
        <EmptyGroup group={active} />
      )}
    </section>
  );
}

/**
 * What an empty group says for itself.
 *
 * A group that ships with nothing is not a bug here — the store badges are
 * trademarks whose licence is the user's to accept — so the empty state's job is to
 * name the folder the real files go in.
 */
function EmptyGroup({ group }: { group: LibraryGroup }) {
  if (!group.empty) {
    return (
      <p className="rounded-xl border border-dashed px-4 py-12 text-center text-sm text-muted-foreground">
        Nothing here yet.
      </p>
    );
  }

  return (
    <div className="space-y-2 rounded-xl border border-dashed px-4 py-8 text-center">
      <p className="text-sm font-medium">{group.empty.title}</p>
      <p className="mx-auto max-w-prose text-xs text-muted-foreground">
        {group.empty.body}
      </p>
      <code className="inline-block rounded-md bg-muted px-2 py-1 font-mono text-[11px]">
        {group.empty.path}
      </code>
    </div>
  );
}

function FilterChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <Button
      variant={active ? "default" : "ghost"}
      size="xs"
      className="rounded-full px-3"
      onClick={onClick}
      aria-pressed={active}
    >
      {label}
    </Button>
  );
}
