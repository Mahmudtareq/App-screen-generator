"use client";

import { Clock, ExternalLink, Search, Type } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  CANVAS_FONTS,
  FONT_CATEGORY_LABELS,
  GOOGLE_FONTS,
  fontIdForFamily,
  quoteFontFamily,
  resolveFont,
  type FontCategory,
  type ResolvedFont,
} from "@/config/fonts";
import { loadPreviewFace } from "@/lib/canvas/google-fonts";
import { readRecentFonts } from "@/lib/editor/recent-fonts";
import { cn } from "@/lib/utils";

/**
 * The font browser.
 *
 * A dialog rather than a dropdown because choosing a typeface is a comparison, not
 * a pick from a list: the only way to tell Figtree from Manrope is to read a line
 * of the same sentence set in both, which needs a row each and room to scroll.
 *
 * Every family is rendered in itself, so the list is also the specimen. That is
 * why the rows load lazily — seventy families fetched on open would be a stall on
 * a dialog whose first screen shows six of them.
 */

/** Deliberately full of the letterforms that differ between families. */
const PREVIEW_TEXT =
  "Agile app experts quickly jump over branding challenges for optimized screenshot visibility.";

type Tab = "recent" | "google";

const CATEGORY_FILTERS: readonly { id: FontCategory | "all"; label: string }[] = [
  { id: "all", label: "All" },
  { id: "sans", label: FONT_CATEGORY_LABELS.sans },
  { id: "serif", label: FONT_CATEGORY_LABELS.serif },
  { id: "display", label: FONT_CATEGORY_LABELS.display },
  { id: "handwriting", label: FONT_CATEGORY_LABELS.handwriting },
  { id: "mono", label: FONT_CATEGORY_LABELS.mono },
];

/**
 * Every offerable font, self-hosted first.
 *
 * The four built-in faces also appear in the Google catalogue, and `fontIdForFamily`
 * collapses them onto the local id — so this dedupes by *id* rather than by family
 * and the row that survives is the one that needs no network.
 */
const ALL_FONTS: ResolvedFont[] = (() => {
  const byId = new Map<string, ResolvedFont>();

  for (const font of CANVAS_FONTS) {
    byId.set(font.id, resolveFont(font.id));
  }
  for (const font of GOOGLE_FONTS) {
    const id = fontIdForFamily(font.family);
    if (!byId.has(id)) byId.set(id, resolveFont(id));
  }

  return [...byId.values()];
})();

export function FontPickerDialog({
  open,
  onOpenChange,
  value,
  onSelect,
  title = "Choose a font",
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The currently applied font id, or null when the selection is mixed. */
  value: string | null;
  onSelect: (fontId: string) => void;
  title?: string;
}) {
  const [tab, setTab] = useState<Tab>("google");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<FontCategory | "all">("all");

  // Read once per opening rather than on every render: the list must not reshuffle
  // under the cursor the moment a font is picked.
  const [recent, setRecent] = useState<string[]>([]);
  const [wasOpen, setWasOpen] = useState(open);

  // Resynced during render rather than in an effect, so the first frame of the
  // dialog already has its list — and localStorage is only touched on the client
  // transition into `open`, never during SSR.
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setRecent(readRecentFonts());
      setQuery("");
    }
  }

  const fonts = useMemo(() => {
    const source =
      tab === "recent"
        ? recent.map(resolveFont)
        : category === "all"
          ? ALL_FONTS
          : ALL_FONTS.filter((font) => font.category === category);

    const needle = query.trim().toLowerCase();
    return needle
      ? source.filter((font) => font.label.toLowerCase().includes(needle))
      : source;
  }, [tab, recent, category, query]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="grid h-[min(46rem,88vh)] w-[min(64rem,calc(100%-2rem))] max-w-none grid-rows-[1fr] gap-0 overflow-hidden p-0 sm:max-w-none md:grid-cols-[13rem_1fr]"
      >
        <aside className="hidden flex-col gap-1 border-r bg-muted/40 p-3 md:flex">
          <NavItem
            icon={<Clock className="size-4" />}
            label="Recent"
            active={tab === "recent"}
            onClick={() => setTab("recent")}
          />
          <NavItem
            icon={<Type className="size-4" />}
            label="Google Fonts"
            active={tab === "google"}
            onClick={() => setTab("google")}
          />
        </aside>

        <div className="flex min-h-0 flex-col">
          <header className="flex flex-wrap items-center justify-between gap-3 px-5 pt-5 pb-3">
            <div className="space-y-0.5">
              <DialogTitle className="text-lg">
                {tab === "recent" ? "Recent fonts" : "Google Fonts"}
              </DialogTitle>
              <DialogDescription className="text-xs">{title}</DialogDescription>
            </div>

            <Button variant="secondary" size="sm" className="mr-8" asChild>
              <a
                href="https://fonts.google.com/"
                target="_blank"
                rel="noreferrer noopener"
              >
                Browse all Google Fonts
                <ExternalLink className="size-3.5" />
              </a>
            </Button>
          </header>

          <div className="space-y-3 px-5 pb-3">
            <div className="relative">
              <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search fonts…"
                className="h-9 pl-8"
                aria-label="Search fonts"
              />
            </div>

            {tab === "google" && (
              <div className="flex flex-wrap gap-1.5">
                {CATEGORY_FILTERS.map((filter) => (
                  <Button
                    key={filter.id}
                    variant={category === filter.id ? "secondary" : "ghost"}
                    size="xs"
                    className={cn(
                      "rounded-full px-3",
                      category === filter.id && "text-foreground",
                    )}
                    onClick={() => setCategory(filter.id)}
                  >
                    {filter.label}
                  </Button>
                ))}
              </div>
            )}
          </div>

          <ScrollArea className="min-h-0 flex-1 border-t">
            <div className="space-y-2 p-5">
              {fonts.map((font) => (
                <FontRow
                  key={font.id}
                  font={font}
                  selected={font.id === value}
                  onSelect={() => onSelect(font.id)}
                />
              ))}

              {fonts.length === 0 && (
                <p className="py-16 text-center text-sm text-muted-foreground">
                  {tab === "recent"
                    ? "Fonts you pick will show up here."
                    : `No font matches “${query}”.`}
                </p>
              )}
            </div>
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function NavItem({
  icon,
  label,
  active,
  onClick,
}: {
  icon: ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "flex items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors",
        active
          ? "bg-background text-primary shadow-xs"
          : "text-muted-foreground hover:bg-background/60 hover:text-foreground",
      )}
    >
      {icon}
      {label}
    </button>
  );
}

/**
 * One family, set in itself.
 *
 * The face is only fetched once the row is close to the viewport — an
 * IntersectionObserver rather than an index cut-off, so a search that jumps to the
 * bottom of the list still shows real letterforms.
 */
function FontRow({
  font,
  selected,
  onSelect,
}: {
  font: ResolvedFont;
  selected: boolean;
  onSelect: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        observer.disconnect();
        void loadPreviewFace(font);
      },
      { rootMargin: "300px" },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [font]);

  const specimen =
    font.source === "google"
      ? `https://fonts.google.com/specimen/${font.label.replace(/ /g, "+")}`
      : null;

  return (
    <div
      ref={ref}
      className={cn(
        "rounded-xl border bg-card p-4 transition-colors",
        selected
          ? "border-primary ring-1 ring-primary"
          : "hover:border-foreground/20",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-sm font-semibold">{font.label}</span>

          {specimen && (
            <a
              href={specimen}
              target="_blank"
              rel="noreferrer noopener"
              className="text-muted-foreground hover:text-foreground"
              aria-label={`${font.label} on Google Fonts`}
            >
              <ExternalLink className="size-3.5" />
            </a>
          )}

          {font.source === "local" && (
            <Badge variant="secondary" className="ml-1">
              Built in
            </Badge>
          )}
        </div>

        <Button
          size="sm"
          variant={selected ? "outline" : "secondary"}
          onClick={onSelect}
          aria-label={`Use ${font.label}`}
        >
          {selected ? "Selected" : "Select"}
        </Button>
      </div>

      <p
        className="mt-3 text-xl leading-snug break-words"
        style={{ fontFamily: quoteFontFamily(font.family) }}
      >
        {PREVIEW_TEXT}
      </p>
    </div>
  );
}
