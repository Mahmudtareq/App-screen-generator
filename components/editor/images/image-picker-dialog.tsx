"use client";

import { useState } from "react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { ImagePick } from "@/lib/editor/image-picks";
import type { AssetKey } from "@/lib/editor/types";

import { DEFAULT_IMAGE_SOURCE_ID, IMAGE_SOURCES } from "./image-sources";

/**
 * Where an image comes from.
 *
 * The dialog owns the frame — tabs, scrolling, closing on a pick — and nothing
 * else. Which tabs exist and what each of them does is `IMAGE_SOURCES`, so this
 * file does not change when a source is added or dropped.
 */
export function ImagePickerDialog({
  open,
  onOpenChange,
  assetKey,
  onPick,
  title = "Choose an image",
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assetKey: AssetKey;
  onPick: (pick: ImagePick) => void;
  title?: string;
}) {
  const [source, setSource] = useState<string>(DEFAULT_IMAGE_SOURCE_ID);

  const pick = (next: ImagePick) => {
    onPick(next);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[min(42rem,88vh)] w-[min(56rem,calc(100%-2rem))] max-w-none flex-col gap-0 overflow-hidden p-0 sm:max-w-none">
        <Tabs
          value={source}
          onValueChange={setSource}
          className="flex min-h-0 flex-1 flex-col gap-0"
        >
          <header className="space-y-3 border-b px-5 pt-5 pb-0">
            <div className="space-y-0.5 pr-8">
              <DialogTitle className="text-lg">{title}</DialogTitle>
              <DialogDescription className="text-xs">
                Upload something new, or reuse an image already in this project.
              </DialogDescription>
            </div>

            <TabsList variant="line" className="h-9 w-full justify-start">
              {IMAGE_SOURCES.map((entry) => (
                <TabsTrigger key={entry.id} value={entry.id} className="flex-none px-3">
                  <entry.icon />
                  {entry.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </header>

          {/*
            A plain scroller rather than ScrollArea: Radix wraps its viewport's
            content in a `display: table` box, which grows to fit — so the
            sideways-scrolling library rows stretched the dialog instead of
            scrolling inside it.
          */}
          <div className="min-h-0 flex-1 overflow-y-auto">
            {IMAGE_SOURCES.map((entry) => (
              <TabsContent key={entry.id} value={entry.id} className="min-h-full p-5">
                <entry.Panel assetKey={assetKey} onPick={pick} />
              </TabsContent>
            ))}
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
