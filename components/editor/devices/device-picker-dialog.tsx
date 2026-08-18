"use client";

import { useState } from "react";
import { Check } from "lucide-react";

import { DeviceSilhouette } from "@/components/common/device-silhouette";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatAspectRatio } from "@/lib/devices/geometry";
import { isCustomDeviceId, listDevices } from "@/lib/devices/registry";
import type { DeviceSpec } from "@/lib/devices/types";
import { useEditorStore } from "@/lib/editor/store";
import { cn } from "@/lib/utils";

/**
 * The category tabs. "Android" means Android *phones* — tablets, watches and
 * desktops get their own rows regardless of brand, because someone shopping for
 * a frame thinks in form factors first and vendors second.
 */
const CATEGORIES: readonly {
  id: string;
  label: string;
  match: (spec: DeviceSpec) => boolean;
}[] = [
  { id: "all", label: "All devices", match: () => true },
  { id: "apple", label: "Apple", match: (d) => d.brand === "apple" },
  {
    id: "android",
    label: "Android",
    match: (d) => d.category === "phone" && d.brand !== "apple",
  },
  { id: "tablet", label: "Tablets", match: (d) => d.category === "tablet" },
  { id: "watch", label: "Watches", match: (d) => d.category === "watch" },
  { id: "desktop", label: "Desktop & TV", match: (d) => d.category === "desktop" },
];

/**
 * The "Change device" dialog: every frame the registry knows — built-in catalog
 * plus admin-authored devices — with the numbers that actually matter for
 * choosing one.
 *
 * Selection is document-level (`setDeviceId`) because the device model is: all
 * five screens change together, which is the invariant that keeps a set a set.
 */
export function DevicePickerDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const deviceId = useEditorStore((s) => s.doc.deviceId);
  const setDeviceId = useEditorStore((s) => s.setDeviceId);
  const [category, setCategory] = useState("all");

  const active = CATEGORIES.find((c) => c.id === category) ?? CATEGORIES[0];
  const devices = listDevices().filter(active.match);

  const choose = (id: string) => {
    setDeviceId(id);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Select display device</DialogTitle>
          <DialogDescription>
            Applies to every screen in the set. Screenshots are refit to the new
            frame.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 sm:flex-row">
          <nav className="flex shrink-0 gap-1 overflow-x-auto sm:w-36 sm:flex-col">
            {CATEGORIES.map((entry) => (
              <button
                key={entry.id}
                type="button"
                onClick={() => setCategory(entry.id)}
                className={cn(
                  "rounded-md px-3 py-1.5 text-left text-sm whitespace-nowrap transition-colors",
                  entry.id === category
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground",
                )}
              >
                {entry.label}
              </button>
            ))}
          </nav>

          <ScrollArea className="h-[420px] flex-1 pr-3">
            {devices.length === 0 ? (
              <p className="py-12 text-center text-sm text-muted-foreground">
                No devices in this category yet.
              </p>
            ) : (
              <div className="grid gap-2 sm:grid-cols-2">
                {devices.map((spec) => {
                  const selected = spec.id === deviceId;
                  return (
                    <button
                      key={spec.id}
                      type="button"
                      onClick={() => choose(spec.id)}
                      className={cn(
                        "flex items-center gap-3 rounded-lg border p-3 text-left transition-colors hover:bg-accent",
                        selected && "border-primary ring-1 ring-primary",
                      )}
                    >
                      <DeviceSilhouette
                        spec={spec}
                        className="h-10 w-8 text-foreground/70"
                      />
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-1.5">
                          <span className="truncate text-sm font-medium">
                            {spec.name}
                          </span>
                          {isCustomDeviceId(spec.id) && (
                            <Badge variant="secondary" className="text-[10px]">
                              Custom
                            </Badge>
                          )}
                        </span>
                        <span className="block text-xs text-muted-foreground">
                          {spec.screenshot.width} × {spec.screenshot.height} ·{" "}
                          {formatAspectRatio(
                            spec.screenshot.width,
                            spec.screenshot.height,
                          )}
                        </span>
                      </span>
                      {selected && <Check className="size-4 shrink-0 text-primary" />}
                    </button>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}
