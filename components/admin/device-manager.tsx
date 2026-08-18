"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import {
  deleteDeviceAction,
  updateDeviceAction,
} from "@/actions/devices/deviceActions";
import { DeviceSilhouette } from "@/components/common/device-silhouette";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { formatAspectRatio } from "@/lib/devices/geometry";
import type { DeviceSpec } from "@/lib/devices/types";
import {
  buildDeviceSpec,
  customDeviceId,
  type CustomDeviceRow,
} from "@/schemas/device";

import { DeviceFormDialog } from "./device-form-dialog";

/**
 * The admin device list: the dynamic rows with their controls, and the built-in
 * catalog below them for reference.
 *
 * All state lives on the server — every mutation is an action followed by
 * `router.refresh()`, so the rows always show what the database holds rather
 * than an optimistic copy that could drift from a failed write.
 */
export function DeviceManager({
  devices,
  builtins,
}: {
  devices: CustomDeviceRow[];
  builtins: DeviceSpec[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<CustomDeviceRow | null>(null);
  const [confirming, setConfirming] = useState<CustomDeviceRow | null>(null);

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const openEdit = (row: CustomDeviceRow) => {
    setEditing(row);
    setFormOpen(true);
  };

  const toggleEnabled = (row: CustomDeviceRow, enabled: boolean) => {
    startTransition(async () => {
      const result = await updateDeviceAction({ ...row, enabled });
      if (!result.success) {
        toast.error(result.error.message);
        return;
      }
      toast.success(enabled ? `${row.name} enabled` : `${row.name} hidden from the editor`);
      router.refresh();
    });
  };

  const confirmDelete = (row: CustomDeviceRow) => {
    startTransition(async () => {
      const result = await deleteDeviceAction({ id: row.id });
      setConfirming(null);
      if (!result.success) {
        toast.error(result.error.message);
        return;
      }
      toast.success(`${row.name} deleted`);
      router.refresh();
    });
  };

  return (
    <div className="mx-auto w-full max-w-4xl space-y-8 p-4 sm:p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Devices</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Frames offered in the editor&apos;s device picker. Custom devices are
            stored in the database and can be edited here; built-in ones ship
            with the app.
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="size-4" />
          Add device
        </Button>
      </div>

      <section className="space-y-3">
        <h2 className="text-sm font-medium text-muted-foreground">
          Custom devices · {devices.length}
        </h2>

        {devices.length === 0 ? (
          <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
            No custom devices yet. Add one and it appears in every user&apos;s
            device picker.
          </div>
        ) : (
          <ul className="space-y-2">
            {devices.map((row) => {
              const spec = buildDeviceSpec(customDeviceId(row.id), row);
              return (
                <li
                  key={row.id}
                  className="flex items-center gap-3 rounded-lg border bg-card p-3"
                >
                  <DeviceSilhouette
                    spec={spec}
                    className="h-10 w-8 text-foreground/70"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="truncate text-sm font-medium">{row.name}</span>
                      <Badge variant="outline" className="capitalize">
                        {row.brand}
                      </Badge>
                      <Badge variant="outline" className="capitalize">
                        {row.category}
                      </Badge>
                      {!row.enabled && <Badge variant="secondary">Hidden</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {row.screenshotWidth} × {row.screenshotHeight} ·{" "}
                      {formatAspectRatio(row.screenshotWidth, row.screenshotHeight)} ·{" "}
                      {row.colorways.length}{" "}
                      {row.colorways.length === 1 ? "finish" : "finishes"}
                    </p>
                  </div>

                  <Switch
                    checked={row.enabled}
                    disabled={pending}
                    onCheckedChange={(enabled) => toggleEnabled(row, enabled)}
                    aria-label={`${row.name} enabled`}
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8"
                    onClick={() => openEdit(row)}
                    aria-label={`Edit ${row.name}`}
                  >
                    <Pencil className="size-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8 text-destructive hover:text-destructive"
                    onClick={() => setConfirming(row)}
                    aria-label={`Delete ${row.name}`}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-medium text-muted-foreground">
          Built-in devices · {builtins.length}
        </h2>
        <p className="text-xs text-muted-foreground">
          Defined in code (lib/devices/catalog.ts), because their geometry is
          coupled to the renderer. They cannot be edited here.
        </p>
        <ul className="space-y-2">
          {builtins.map((spec) => (
            <li
              key={spec.id}
              className="flex items-center gap-3 rounded-lg border p-3 opacity-80"
            >
              <DeviceSilhouette spec={spec} className="h-10 w-8 text-foreground/60" />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="truncate text-sm font-medium">{spec.name}</span>
                  <Badge variant="outline" className="capitalize">
                    {spec.brand}
                  </Badge>
                  <Badge variant="outline" className="capitalize">
                    {spec.category}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  {spec.screenshot.width} × {spec.screenshot.height} ·{" "}
                  {formatAspectRatio(spec.screenshot.width, spec.screenshot.height)}
                </p>
              </div>
              <Badge variant="secondary">Built-in</Badge>
            </li>
          ))}
        </ul>
      </section>

      {formOpen && (
        <DeviceFormDialog
          open={formOpen}
          onOpenChange={setFormOpen}
          device={editing}
        />
      )}

      <Dialog
        open={confirming !== null}
        onOpenChange={(open) => !open && setConfirming(null)}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete {confirming?.name}?</DialogTitle>
            <DialogDescription>
              Projects already using this device keep working — they fall back to
              the default frame — but it disappears from the picker for everyone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfirming(null)}
              disabled={pending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => confirming && confirmDelete(confirming)}
              disabled={pending}
            >
              {pending ? <Loader2 className="size-4 animate-spin" /> : null}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
