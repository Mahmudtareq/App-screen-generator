import { Mark } from "@tiptap/core";

/**
 * Casing as a mark, so it can cover part of a caption rather than all of it.
 *
 * tiptap ships no such extension, and the near alternatives are worse: reusing a
 * disabled built-in would serialise as the wrong element, and hanging an attribute
 * off `TextStyle` would put casing in the same mark as colour, where toggling one
 * has to preserve the other.
 *
 * It renders as `text-transform` rather than by upper-casing the text, which is the
 * same decision the canvas makes for the same reason — the document keeps what was
 * typed, so turning it back off returns the original capitals instead of a sentence
 * that has forgotten them.
 */
export const UppercaseMark = Mark.create({
  name: "uppercase",

  parseHTML() {
    return [
      {
        style: "text-transform",
        // Anything that is not this exact value belongs to some other mark, and
        // returning false is how a style rule declines a match.
        getAttrs: (value) => (value === "uppercase" ? {} : false),
      },
    ];
  },

  renderHTML() {
    return ["span", { style: "text-transform: uppercase" }, 0];
  },
});
