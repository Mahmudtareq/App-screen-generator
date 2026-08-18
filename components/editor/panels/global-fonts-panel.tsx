"use client";

import { FontPickerField } from "@/components/editor/fonts/font-picker-field";
import { selectRoleFontId } from "@/lib/editor/selectors";
import { useEditorStore } from "@/lib/editor/store";

/**
 * One font for every title, one for every subtitle.
 *
 * Picking writes the font onto every unpinned screen's layers of that role. There is
 * no `globalFont` field behind it: the current value is read back off the layers, so
 * a set whose titles have been styled apart reads as "Mixed" rather than pretending
 * one screen speaks for the rest, and a single layer's inspector stays a real
 * override instead of being clobbered by an inherited value.
 */
export function GlobalFontsPanel() {
  const titleFontId = useEditorStore(selectRoleFontId("title"));
  const bodyFontId = useEditorStore(selectRoleFontId("body"));
  const setRoleFont = useEditorStore((s) => s.setRoleFont);

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        Set the font for every title and subtitle across all screens.
      </p>

      <div className="grid grid-cols-2 gap-3">
        <FontPickerField
          label="Title font"
          value={titleFontId}
          onChange={(fontId) => setRoleFont("title", fontId)}
          dialogTitle="Applies to every screen's title"
        />
        <FontPickerField
          label="Subtitle font"
          value={bodyFontId}
          onChange={(fontId) => setRoleFont("body", fontId)}
          dialogTitle="Applies to every screen's subtitle"
        />
      </div>
    </div>
  );
}
