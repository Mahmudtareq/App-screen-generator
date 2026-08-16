import type Konva from "konva";

/**
 * Holds the live Konva Stage so non-canvas UI (the export dialog, keyboard
 * shortcuts) can reach it.
 *
 * A module-level registry rather than a ref threaded through props: the Stage
 * lives behind a `dynamic(..., { ssr: false })` boundary, and forwarding a ref
 * across that boundary would make every consumer of the stage aware of the
 * lazy-loading dance. There is exactly one editor Stage at a time.
 */
let stage: Konva.Stage | null = null;

export function setStage(next: Konva.Stage | null) {
  stage = next;
}

export function getStage(): Konva.Stage | null {
  return stage;
}
