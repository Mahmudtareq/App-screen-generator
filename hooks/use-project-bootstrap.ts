"use client";

import { useEffect, useRef, useState } from "react";

import { loadDraft, migrateDoc, saveDraft } from "@/lib/editor/persistence";
import { useEditorStore } from "@/lib/editor/store";
import { debounce } from "@/lib/utils";
import type { EditorDoc } from "@/schemas/editor";

const AUTOSAVE_MS = 1500;

/**
 * Loads the right document into the store and keeps anonymous work from being
 * lost.
 *
 * A saved project wins outright. Otherwise the local draft is restored, which is
 * what lets someone build a set of screens before they have an account and still
 * have it waiting after they sign up. Falling through both leaves the store's own
 * default in place — five screens from the default template, so the editor is never
 * an empty canvas.
 *
 * Both paths go through `migrateDoc`: `Project.doc` is a Mixed subdocument, so a row
 * written before the multi-screen schema still arrives shaped like the old one, and
 * the declared `EditorDoc` type is a claim about it rather than a guarantee.
 *
 * Draft autosave is deliberately skipped once a project id exists: a saved
 * project's source of truth is the database, and mirroring it into localStorage
 * would resurrect stale work the next time the anonymous editor is opened.
 */
export function useProjectBootstrap(initialDoc?: unknown) {
  const loadDoc = useEditorStore((s) => s.loadDoc);
  const [ready, setReady] = useState(false);
  const bootstrapped = useRef(false);
  const hasProject = initialDoc !== undefined;

  useEffect(() => {
    if (bootstrapped.current) return;
    bootstrapped.current = true;

    const restored = hasProject ? migrateDoc(initialDoc) : loadDraft();
    if (restored) loadDoc(restored);

    // History starts here: the initial load is not something to undo back past.
    useEditorStore.temporal.getState().clear();
    setReady(true);
  }, [initialDoc, hasProject, loadDoc]);

  useEffect(() => {
    if (!ready || hasProject) return;

    const persist = debounce((doc: EditorDoc) => saveDraft(doc), AUTOSAVE_MS);

    return useEditorStore.subscribe((state, previous) => {
      if (state.doc !== previous.doc) persist(state.doc);
    });
  }, [ready, hasProject]);

  return ready;
}
