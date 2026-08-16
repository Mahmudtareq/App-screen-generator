"use client";

import { useEffect, useRef, useState } from "react";

import { loadDraft, saveDraft } from "@/lib/editor/persistence";
import { useEditorStore } from "@/lib/editor/store";
import { debounce } from "@/lib/utils";
import type { EditorDoc } from "@/schemas/editor";

const AUTOSAVE_MS = 1500;

/**
 * Loads the right document into the store and keeps anonymous work from being
 * lost.
 *
 * A saved project wins outright. Otherwise the local draft is restored, which is
 * what lets someone build a mockup before they have an account and still have it
 * waiting after they sign up.
 *
 * Draft autosave is deliberately skipped once a project id exists: a saved
 * project's source of truth is the database, and mirroring it into localStorage
 * would resurrect stale work the next time the anonymous editor is opened.
 */
export function useProjectBootstrap(initialDoc?: EditorDoc) {
  const loadDoc = useEditorStore((s) => s.loadDoc);
  const [ready, setReady] = useState(false);
  const bootstrapped = useRef(false);

  useEffect(() => {
    if (bootstrapped.current) return;
    bootstrapped.current = true;

    const restored = initialDoc ?? loadDraft();
    if (restored) loadDoc(restored);

    // History starts here: the initial load is not something to undo back past.
    useEditorStore.temporal.getState().clear();
    setReady(true);
  }, [initialDoc, loadDoc]);

  useEffect(() => {
    if (!ready || initialDoc) return;

    const persist = debounce((doc: EditorDoc) => saveDraft(doc), AUTOSAVE_MS);

    return useEditorStore.subscribe((state, previous) => {
      if (state.doc !== previous.doc) persist(state.doc);
    });
  }, [ready, initialDoc]);

  return ready;
}
