import type { Background } from "@/schemas/editor";

/**
 * Starter templates.
 *
 * Pure data, and deliberately free of any runtime import from `schemas/editor.ts`
 * — the schema imports `TEMPLATE_IDS` from here, so anything more than a
 * `import type` in this direction would close a module cycle. Turning these
 * definitions into a real document is `lib/editor/defaults.ts`'s job.
 *
 * Static TypeScript rather than a collection, for the same reason as the device
 * catalog: the editor needs a template synchronously to render its very first
 * frame, and keeping them here makes `TemplateId` a literal union. Promote to
 * MongoDB when non-engineers need to author them — the shape below is already
 * what such a document would hold.
 */

export interface TemplateScreenCopy {
  title: string;
  body: string;
}

export interface Template {
  id: string;
  label: string;
  /** One line, shown on the template card. */
  description: string;
  deviceId: string;
  colorwayId: string;
  artboardPresetId: string;
  background: Background;
  type: {
    titleColor: string;
    titleWeight: number;
    bodyColor: string;
    bodyWeight: number;
    fontId: string;
    /** Filled pill behind the headline, for templates that want one. */
    titlePill: { color: string; opacity: number } | null;
  };
  /**
   * The screens a fresh project starts with — one device each. Five is the number
   * every app store asks for, so it is the number a new project should already
   * have rather than something the user has to build up to.
   */
  screens: readonly TemplateScreenCopy[];
}

export const TEMPLATES = [
  {
    id: "aurora",
    label: "Aurora",
    description: "Soft lavender wash, dark headline. Reads well on a light store page.",
    deviceId: "iphone-15-pro",
    colorwayId: "black-titanium",
    artboardPresetId: "appstore-6-9",
    background: {
      type: "gradient",
      angle: 160,
      stops: [
        { offset: 0, color: "#f4f1ff" },
        { offset: 1, color: "#e4dcfb" },
      ],
    },
    type: {
      titleColor: "#1e1b4b",
      titleWeight: 700,
      bodyColor: "#4b5563",
      bodyWeight: 600,
      fontId: "poppins",
      titlePill: null,
    },
    screens: [
      { title: "Learn 40 plus languages free", body: "No subscription to get started" },
      { title: "Enjoy game like learning", body: "Fun challenges keep motivation high" },
      { title: "Build skills in minutes", body: "Quick lessons fit busy days" },
      { title: "Track every streak", body: "See progress you can actually feel" },
      { title: "Practise with real voices", body: "Native audio on every phrase" },
    ],
  },
  {
    id: "spotlight",
    label: "Spotlight",
    description: "Saturated violet with a white headline. Built to stop a scroll.",
    deviceId: "iphone-15-pro",
    colorwayId: "black-titanium",
    artboardPresetId: "appstore-6-9",
    background: {
      type: "gradient",
      angle: 150,
      stops: [
        { offset: 0, color: "#6d28d9" },
        { offset: 1, color: "#4c1d95" },
      ],
    },
    type: {
      titleColor: "#ffffff",
      titleWeight: 800,
      bodyColor: "#ddd6fe",
      bodyWeight: 600,
      fontId: "montserrat",
      titlePill: null,
    },
    screens: [
      { title: "Build language skills in minutes", body: "Quick lessons fit busy days" },
      { title: "Train match and music", body: "One app for every subject" },
      { title: "Compete with friends", body: "Weekly leagues keep it interesting" },
      { title: "Offline whenever", body: "Download a lesson and go" },
      { title: "Start free today", body: "Upgrade only when you want more" },
    ],
  },
] as const satisfies readonly Template[];

export type TemplateId = (typeof TEMPLATES)[number]["id"];

export const TEMPLATE_IDS = TEMPLATES.map((t) => t.id) as [TemplateId, ...TemplateId[]];

export const DEFAULT_TEMPLATE_ID: TemplateId = "aurora";

/** Falls back to the default rather than throwing, so a stale saved doc still opens. */
export function getTemplate(id: string): Template {
  return (
    TEMPLATES.find((t) => t.id === id) ??
    (TEMPLATES.find((t) => t.id === DEFAULT_TEMPLATE_ID) as Template)
  );
}

/** Hard ceiling on screens per project, shared by the schema and the add button. */
export const MAX_SCREENS = 12;
