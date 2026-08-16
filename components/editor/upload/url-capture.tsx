"use client";

import { useState } from "react";
import { Globe, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { captureWebsite } from "@/lib/capture/capture-client";
import type { DeviceId } from "@/lib/devices/catalog";
import { createLocalAsset } from "@/lib/editor/assets";
import { useEditorStore } from "@/lib/editor/store";

/**
 * Paste a URL, get that site rendered inside the device frame.
 *
 * The captured image is handed to `createLocalAsset` — the same function a
 * dropped file goes through — so it renders instantly from an object URL and
 * uploads to Cloudinary on save, with no separate handling anywhere downstream.
 */
export function UrlCapture() {
  const deviceId = useEditorStore((s) => s.doc.deviceId);
  const orientation = useEditorStore((s) => s.doc.orientation);
  const setAsset = useEditorStore((s) => s.setAsset);
  const setScreenshot = useEditorStore((s) => s.setScreenshot);

  const [url, setUrl] = useState("");
  const [fullPage, setFullPage] = useState(false);
  const [busy, setBusy] = useState(false);

  const capture = async () => {
    if (!url.trim() || busy) return;

    setBusy(true);
    const toastId = toast.loading("Capturing the page…");

    try {
      const file = await captureWebsite({
        url,
        deviceId: deviceId as DeviceId,
        orientation,
        fullPage,
      });

      const asset = await createLocalAsset(file, "screenshot");
      setAsset(asset);
      // A previous upload's URL would otherwise keep rendering after a reload.
      setScreenshot({ assetId: null, url: null, zoom: 1, pan: { x: 0, y: 0 } });

      toast.success("Captured", { id: toastId });
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "The capture failed.",
        { id: toastId },
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <Input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && capture()}
          placeholder="stripe.com"
          inputMode="url"
          spellCheck={false}
          className="h-9"
          disabled={busy}
        />
        <Button
          onClick={capture}
          disabled={busy || !url.trim()}
          size="sm"
          className="h-9 shrink-0"
        >
          {busy ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Globe className="size-4" />
          )}
          Capture
        </Button>
      </div>

      <div className="flex items-center justify-between">
        <Label htmlFor="full-page" className="text-xs font-normal text-muted-foreground">
          Capture the full page
        </Label>
        <Switch
          id="full-page"
          checked={fullPage}
          onCheckedChange={setFullPage}
          disabled={busy}
        />
      </div>

      <p className="text-[11px] leading-relaxed text-muted-foreground">
        Rendered at this device&apos;s own viewport, so the site lays itself out as
        a phone. Some sites block automated browsers.
      </p>
    </div>
  );
}
