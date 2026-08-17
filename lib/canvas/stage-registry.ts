import type Konva from "konva";

/**
 * Holds the live Konva Stages so non-canvas UI (the export dialog, the per-screen
 * download button, keyboard shortcuts) can reach them.
 *
 * A module-level registry rather than refs threaded through props: Stages live
 * behind a `dynamic(..., { ssr: false })` boundary, and forwarding refs across it
 * would make every consumer aware of the lazy-loading dance.
 *
 * One Stage per screen, rather than one Stage holding all five side by side. Each
 * screen exports on its own, and asking Konva to rasterise a sub-region of a
 * shared Stage — at a pixel ratio, with the right layer hidden — is materially
 * harder to get right than handing the export pipeline a Stage that contains
 * exactly one artboard. Separate Stages also mean editing screen 3 repaints one
 * canvas element instead of a 5-artboard-wide one.
 */
const stages = new Map<string, Konva.Stage>();

export function setStage(screenId: string, stage: Konva.Stage | null) {
  if (stage) stages.set(screenId, stage);
  else stages.delete(screenId);
}

export function getStage(screenId: string): Konva.Stage | null {
  return stages.get(screenId) ?? null;
}

/** In document order, for anything that walks the whole set. */
export function getStages(screenIds: readonly string[]): Konva.Stage[] {
  return screenIds
    .map((id) => stages.get(id))
    .filter((stage): stage is Konva.Stage => Boolean(stage));
}
