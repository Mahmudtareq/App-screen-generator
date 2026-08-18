"use client";

import { Palette, Pin, Type } from "lucide-react";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useEditorStore } from "@/lib/editor/store";

import { ColorReplacerPanel } from "./color-replacer-panel";
import { GlobalFontsPanel } from "./global-fonts-panel";

/**
 * Everything that applies to the whole set at once.
 *
 * It belongs in the toolbar rather than in a screen's inspector because that is what
 * its scope is — a listing whose typeface or palette changes halfway through is not a
 * set. Both tabs write across every unpinned screen, which is the same opt-out every
 * other bulk write honours, and the note below says so rather than leaving the user
 * to notice one frame did not follow.
 */
export function GlobalsPanel() {
  const pinnedCount = useEditorStore(
    (s) => s.doc.screens.filter((screen) => screen.pinned).length,
  );

  return (
    <Tabs defaultValue="fonts" className="w-120 max-w-[calc(100vw-3rem)]">
      <TabsList className="h-9 w-full">
        <TabsTrigger value="fonts">
          <Type />
          Global fonts
        </TabsTrigger>
        <TabsTrigger value="colors">
          <Palette />
          Colour replacer
        </TabsTrigger>
      </TabsList>

      <TabsContent value="fonts">
        <GlobalFontsPanel />
      </TabsContent>

      <TabsContent value="colors">
        <ColorReplacerPanel />
      </TabsContent>

      {pinnedCount > 0 && (
        <p className="flex items-start gap-1.5 text-[11px] text-muted-foreground">
          <Pin className="mt-px size-3 shrink-0" />
          {pinnedCount === 1
            ? "1 pinned screen keeps"
            : `${pinnedCount} pinned screens keep`}{" "}
          their own fonts and colours.
        </p>
      )}
    </Tabs>
  );
}
