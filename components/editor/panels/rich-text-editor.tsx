"use client";

import { useEffect, useRef } from "react";
import { EditorContent, useEditor, useEditorState } from "@tiptap/react";
import Highlight from "@tiptap/extension-highlight";
import { Color, TextStyle } from "@tiptap/extension-text-style";
import StarterKit from "@tiptap/starter-kit";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Baseline,
  Bold,
  CaseUpper,
  Highlighter,
  Italic,
  Underline,
  X,
} from "lucide-react";
import { HexColorPicker } from "react-colorful";

import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Toggle } from "@/components/ui/toggle";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { docToRuns, runsToDoc } from "@/lib/editor/rich-text";
import { UppercaseMark } from "@/lib/editor/uppercase-mark";
import { cn } from "@/lib/utils";
import type { TextLayer, TextRun } from "@/schemas/editor";

import { EmojiPicker } from "./emoji-picker";

/**
 * The caption's copy, edited as rich text.
 *
 * Runs in and runs out — the tiptap document lives only inside this component, so
 * nothing above it has to know that a ProseMirror tree exists. `lib/editor/rich-text.ts`
 * owns the translation in both directions.
 *
 * The base font, size and colour are mirrored onto the editable element so the copy
 * reads roughly as it will on the artboard. Only roughly: the artboard is thousands
 * of pixels wide and this field is a panel column, so line breaks here mean nothing.
 * The point is that a bolded word looks bold in the family it will actually be bold in.
 *
 * The toolbar carries every control that styles *text*, at both scopes — the panel
 * below it used to repeat colour, italic, underline, casing and alignment as separate
 * layer-level fields, which is two places to look for one job. The divider is the
 * scope line: left of it acts on the selection, right of it on the whole caption.
 *
 * Colour and casing straddle it, and read their scope from the selection — with words
 * selected they set a run, with nothing selected they move the caption's own value.
 * That is what makes "uppercase this one word" and "uppercase everything" the same
 * button rather than two that look identical and disagree.
 */
export function RichTextEditor({
  runs,
  onChange,
  fontFamily,
  fontWeight,
  italic,
  color,
  onColorChange,
  uppercase,
  onUppercaseChange,
  align,
  onAlignChange,
  placeholder,
}: {
  runs: TextRun[];
  onChange: (runs: TextRun[]) => void;
  fontFamily: string;
  fontWeight: number;
  italic: boolean;
  /** The caption's base colour — what a run with no colour of its own inherits. */
  color: string;
  onColorChange: (color: string) => void;
  /** The caption's own casing, OR-ed with each run's. */
  uppercase: boolean;
  onUppercaseChange: (uppercase: boolean) => void;
  align: TextLayer["align"];
  onAlignChange: (align: TextLayer["align"]) => void;
  placeholder: string;
}) {
  /**
   * The last runs this editor itself produced.
   *
   * Every keystroke writes to the document, and the document writes back here — so
   * without a way to recognise its own echo the editor would reset the caret to the
   * start of the field on each character. Anything that does *not* match is a real
   * outside change (an undo, a template applied, a screen reset) and does need to
   * replace the content.
   */
  const emitted = useRef<TextRun[] | null>(null);

  const editor = useEditor({
    // Next renders this on the server first; tiptap needs a DOM to mount into.
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        // A caption has one font size, one alignment and no links to click on a
        // PNG, so every block-level structure here would be a control that
        // silently does nothing once the copy reaches the canvas.
        heading: false,
        blockquote: false,
        bulletList: false,
        orderedList: false,
        listItem: false,
        listKeymap: false,
        code: false,
        codeBlock: false,
        horizontalRule: false,
        strike: false,
        link: false,
        trailingNode: false,
        // Enter already makes a paragraph, which is the `\n` a run stores. A
        // second kind of break would have no representation to survive into.
        hardBreak: false,
        // Undo belongs to the document, not the field: `useEditorShortcuts` binds
        // ⌘Z globally precisely so that undoing while typing moves the canvas
        // rather than desynchronising it from the text.
        undoRedo: false,
      }),
      TextStyle,
      Color,
      Highlight.configure({ multicolor: true }),
      UppercaseMark,
    ],
    content: runsToDoc(runs),
    editorProps: {
      attributes: {
        class:
          "min-h-16 w-full rounded-md border bg-transparent px-2 py-1.5 text-sm outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
      },
    },
    onUpdate: ({ editor }) => {
      const next = docToRuns(editor.getJSON());
      emitted.current = next;
      onChange(next);
    },
  });

  useEffect(() => {
    if (!editor) return;
    if (emitted.current && sameRuns(emitted.current, runs)) return;

    emitted.current = runs;
    // `emitUpdate: false`, or adopting an undone value would immediately write it
    // straight back to the document as a fresh edit and bury the redo.
    editor.commands.setContent(runsToDoc(runs), { emitUpdate: false });
  }, [editor, runs]);

  const active = useEditorState({
    editor,
    selector: ({ editor }) => ({
      bold: editor?.isActive("bold") ?? false,
      italic: editor?.isActive("italic") ?? false,
      underline: editor?.isActive("underline") ?? false,
      uppercase: editor?.isActive("uppercase") ?? false,
      color: (editor?.getAttributes("textStyle").color as string | undefined) ?? null,
      highlight: (editor?.getAttributes("highlight").color as string | undefined) ?? null,
      // Nothing selected means there is no run to style, so the scope-reading
      // controls fall through to the caption instead of doing nothing.
      hasSelection: editor ? !editor.state.selection.empty : false,
    }),
  });

  const hasSelection = active?.hasSelection ?? false;

  return (
    <div className="space-y-2">
      {/* Wraps rather than scrolls: the inspector column is narrow and a second row
          of buttons is easier to hit than a row that slides. */}
      <div className="flex flex-wrap items-center gap-1 gap-y-1.5">
        <Toggle
          size="sm"
          variant="outline"
          aria-label="Bold"
          pressed={active?.bold ?? false}
          onPressedChange={() => editor?.chain().focus().toggleBold().run()}
        >
          <Bold className="size-3.5" />
        </Toggle>

        <Toggle
          size="sm"
          variant="outline"
          aria-label="Italic"
          pressed={active?.italic ?? false}
          onPressedChange={() => editor?.chain().focus().toggleItalic().run()}
        >
          <Italic className="size-3.5" />
        </Toggle>

        <Toggle
          size="sm"
          variant="outline"
          aria-label="Underline"
          pressed={active?.underline ?? false}
          onPressedChange={() => editor?.chain().focus().toggleUnderline().run()}
        >
          <Underline className="size-3.5" />
        </Toggle>

        {/*
          Note the missing `.focus()` on both of these, which every other command
          here has. Pulling focus back to the text while a picker is open moves it
          out of the popover, and the popover closes on focus leaving it — so the
          swatch would apply exactly one colour and shut, and dragging around the
          picker would be impossible. ProseMirror keeps its selection in state
          rather than in the DOM, so the mark still lands on the right words while
          the editor is blurred.
        */}
        <MarkColorButton
          label="Text colour"
          icon={<Baseline className="size-3.5" />}
          // With a selection this colours those words; without one it moves the
          // caption's base, which every uncoloured run follows. That is the same
          // control the panel below used to duplicate as a separate "Colour" field.
          scope={hasSelection ? "Selection" : "Whole caption"}
          value={hasSelection ? (active?.color ?? color) : color}
          clearable={hasSelection && Boolean(active?.color)}
          onChange={(next) =>
            hasSelection ? editor?.chain().setColor(next).run() : onColorChange(next)
          }
          onClear={() => editor?.chain().unsetColor().run()}
        />

        <MarkColorButton
          label="Highlight"
          icon={<Highlighter className="size-3.5" />}
          scope="Selection"
          value={active?.highlight ?? null}
          fallback="#fde047"
          clearable={Boolean(active?.highlight)}
          onChange={(next) => editor?.chain().setHighlight({ color: next }).run()}
          onClear={() => editor?.chain().unsetHighlight().run()}
        />

        {/*
          Casing exists at both levels — as a mark on a run and as a flag on the
          layer — and this reads the selection to decide which one it is touching.
          The two are OR-ed when the caption is laid out, so the caption-wide toggle
          still shouts everything even where a word is already marked.
        */}
        <Toggle
          size="sm"
          variant="outline"
          aria-label={hasSelection ? "Uppercase selection" : "Uppercase (whole caption)"}
          title={hasSelection ? "Uppercase — selection" : "Uppercase — whole caption"}
          pressed={hasSelection ? (active?.uppercase ?? false) : uppercase}
          onPressedChange={(next) =>
            hasSelection
              ? editor?.chain().toggleMark("uppercase").run()
              : onUppercaseChange(next)
          }
        >
          <CaseUpper className="size-4" />
        </Toggle>

        {/*
          Inserting without focus, for the same reason the colour swatches apply
          without it: focus returning to the text closes the popover, and picking
          three emoji in a row should not mean opening it three times. ProseMirror
          holds the caret in state, so the character still lands where it was left.
        */}
        <EmojiPicker
          onSelect={(emoji) => editor?.chain().insertContent(emoji).run()}
        />

        <div aria-hidden className="mx-0.5 h-5 w-px shrink-0 bg-border" />

        {/*
          Alignment is the one control here that has no per-run meaning at all: a line
          is aligned as a whole, so there is nothing for a selection to scope it to.
          Past the divider for that reason.
        */}
        <ToggleGroup
          type="single"
          value={align}
          onValueChange={(next) => next && onAlignChange(next as TextLayer["align"])}
          variant="outline"
          size="sm"
        >
          <ToggleGroupItem value="left" aria-label="Align left">
            <AlignLeft className="size-3.5" />
          </ToggleGroupItem>
          <ToggleGroupItem value="center" aria-label="Align centre">
            <AlignCenter className="size-3.5" />
          </ToggleGroupItem>
          <ToggleGroupItem value="right" aria-label="Align right">
            <AlignRight className="size-3.5" />
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      <div className="relative">
        <EditorContent
          editor={editor}
          style={{
            fontFamily,
            fontWeight,
            fontStyle: italic ? "italic" : "normal",
            color,
          }}
        />

        {/*
          Rendered from the runs rather than through tiptap's Placeholder
          extension, which exists to solve the same problem in CSS and would have
          to be told when the document is empty anyway. Sitting outside the styled
          element also keeps the hint in the UI's own font, so it reads as chrome
          rather than as copy already on the artboard.
        */}
        {runs.length === 0 && (
          <span className="pointer-events-none absolute left-2 top-1.5 text-sm text-muted-foreground">
            {placeholder}
          </span>
        )}
      </div>
    </div>
  );
}

/**
 * A swatch that can also mean "no colour of its own".
 *
 * The shared `ColorPicker` takes a required string and pairs with a hex field, which
 * is the right shape for a panel row. This one is a toolbar button whose colour may
 * be genuinely absent — a highlight usually is — so it shows a hatched swatch for
 * nothing and states its scope, because the same button reaches two different places
 * depending on whether text is selected.
 */
function MarkColorButton({
  label,
  icon,
  scope,
  value,
  fallback,
  clearable,
  onChange,
  onClear,
}: {
  label: string;
  icon: React.ReactNode;
  /** What this picker will actually change, shown above the swatches. */
  scope: string;
  value: string | null;
  fallback?: string;
  clearable: boolean;
  onChange: (color: string) => void;
  onClear: () => void;
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          aria-label={label}
          className="relative h-8 gap-1 px-2"
        >
          {icon}
          <span
            aria-hidden
            className={cn(
              "size-3 rounded-[3px] border",
              !value &&
                "bg-[repeating-linear-gradient(45deg,transparent,transparent_2px,currentColor_2px,currentColor_3px)]",
            )}
            style={value ? { backgroundColor: value } : undefined}
          />
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-auto space-y-2 p-3">
        <div className="flex items-baseline justify-between gap-3">
          <span className="text-xs font-medium">{label}</span>
          <span className="text-[11px] text-muted-foreground">{scope}</span>
        </div>

        <HexColorPicker color={value ?? fallback ?? "#000000"} onChange={onChange} />

        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="w-full"
          onClick={onClear}
          disabled={!clearable}
        >
          <X className="size-3.5" />
          Clear
        </Button>
      </PopoverContent>
    </Popover>
  );
}

function sameRuns(a: readonly TextRun[], b: readonly TextRun[]): boolean {
  return (
    a.length === b.length &&
    a.every((run, index) => {
      const other = b[index];
      return (
        run.text === other.text &&
        run.bold === other.bold &&
        run.italic === other.italic &&
        run.underline === other.underline &&
        run.color === other.color &&
        run.highlight === other.highlight
      );
    })
  );
}
