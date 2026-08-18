"use client";

import { useMemo, useRef, useState } from "react";
import { Search, Smile } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ALL_EMOJI, EMOJI_GROUPS } from "@/config/emoji";
import { cn } from "@/lib/utils";

const RECENT_KEY = "editor:emoji:recent";
const RECENT_LIMIT = 18;

/**
 * The emoji grid, over the caption editor.
 *
 * Everything here paints as plain text in the browser's own emoji font, which is the
 * same font Konva will draw the character in — see [config/emoji.ts](../../../config/emoji.ts)
 * for why that matters more than having every emoji in existence.
 */
export function EmojiPicker({ onSelect }: { onSelect: (emoji: string) => void }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [recent, setRecent] = useState<string[]>(loadRecent);
  const scrollRef = useRef<HTMLDivElement>(null);

  const results = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return null;
    return ALL_EMOJI.filter(
      (entry) => entry.terms.includes(needle) || entry.character === needle,
    ).map((entry) => entry.character);
  }, [query]);

  const pick = (character: string) => {
    onSelect(character);
    setRecent((current) => {
      const next = [character, ...current.filter((c) => c !== character)].slice(
        0,
        RECENT_LIMIT,
      );
      saveRecent(next);
      return next;
    });
  };

  const scrollTo = (id: string) => {
    // Setting `scrollTop` on the picker's own scroller rather than calling
    // `scrollIntoView`, which would also scroll every ancestor — and the inspector
    // this sits in is itself inside the horizontally scrolling filmstrip.
    const container = scrollRef.current;
    const section = container?.querySelector<HTMLElement>(`[data-section="${id}"]`);
    if (container && section) container.scrollTop = section.offsetTop;
  };

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setQuery("");
      }}
    >
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          aria-label="Insert emoji"
          className="h-8 px-2"
        >
          <Smile className="size-3.5" />
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-80 p-0" align="start">
        <div className="flex items-center gap-2 border-b px-3 py-2">
          <Search className="size-3.5 shrink-0 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search"
            aria-label="Search emoji"
            className="h-7 border-0 px-0 text-sm shadow-none focus-visible:ring-0"
          />
        </div>

        {!results && (
          <div className="flex items-center gap-0.5 border-b px-2 py-1.5">
            {recent.length > 0 && (
              <TabButton label="Recent" tab="🕘" onClick={() => scrollTo("recent")} />
            )}
            {EMOJI_GROUPS.map((group) => (
              <TabButton
                key={group.id}
                label={group.label}
                tab={group.tab}
                onClick={() => scrollTo(group.id)}
              />
            ))}
          </div>
        )}

        <div ref={scrollRef} className="max-h-64 overflow-y-auto p-2">
          {results ? (
            results.length ? (
              <Grid emoji={results} onPick={pick} />
            ) : (
              <p className="px-1 py-6 text-center text-xs text-muted-foreground">
                No emoji for “{query.trim()}”
              </p>
            )
          ) : (
            <>
              {recent.length > 0 && (
                <Section id="recent" label="Recent" emoji={recent} onPick={pick} />
              )}
              {EMOJI_GROUPS.map((group) => (
                <Section
                  key={group.id}
                  id={group.id}
                  label={group.label}
                  emoji={group.emoji.map(([character]) => character)}
                  onPick={pick}
                />
              ))}
            </>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function TabButton({
  label,
  tab,
  onClick,
}: {
  label: string;
  tab: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="grid size-7 shrink-0 place-items-center rounded-md text-sm hover:bg-muted"
    >
      {tab}
    </button>
  );
}

function Section({
  id,
  label,
  emoji,
  onPick,
}: {
  id: string;
  label: string;
  emoji: readonly string[];
  onPick: (emoji: string) => void;
}) {
  return (
    // Found by attribute rather than by a ref map, which is the same lookup without
    // a second structure to keep in step with what is on screen.
    <div data-section={id}>
      <h4 className="px-1 pb-1 pt-2 text-[11px] font-medium text-muted-foreground">
        {label}
      </h4>
      <Grid emoji={emoji} onPick={onPick} />
    </div>
  );
}

function Grid({
  emoji,
  onPick,
}: {
  emoji: readonly string[];
  onPick: (emoji: string) => void;
}) {
  return (
    <div className="grid grid-cols-8 gap-0.5">
      {emoji.map((character, index) => (
        <button
          // Recents and search can legitimately repeat a character across renders of
          // different lists, so position is the stable identity within one list.
          key={`${character}-${index}`}
          type="button"
          onClick={() => onPick(character)}
          aria-label={character}
          className={cn(
            "grid aspect-square place-items-center rounded-md text-lg leading-none",
            "hover:bg-muted focus-visible:bg-muted focus-visible:outline-none",
          )}
        >
          {character}
        </button>
      ))}
    </div>
  );
}

/**
 * Recents live in localStorage rather than the document.
 *
 * They belong to the person, not the project — carrying them inside `doc` would make
 * inserting an emoji an undo step and sync one user's habits into a saved file.
 */
function loadRecent(): string[] {
  try {
    // Also the server pass, where `localStorage` is not defined at all. Nothing from
    // this list is rendered until the popover opens, so there is no markup to mismatch.
    const raw = localStorage.getItem(RECENT_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : null;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((entry): entry is string => typeof entry === "string");
  } catch {
    return [];
  }
}

function saveRecent(next: string[]) {
  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  } catch {
    // Private browsing and full quotas both throw. Losing the recents list is not
    // worth interrupting someone mid-caption over.
  }
}
