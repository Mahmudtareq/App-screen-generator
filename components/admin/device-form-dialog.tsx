"use client";

import { Loader2, Plus, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";

import { createDevice, updateDevice } from "@/actions/devices/deviceActions";
import { ColorPicker } from "@/components/common/color-picker";
import { DeviceSilhouette } from "@/components/common/device-silhouette";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  buildDeviceSpec,
  deviceInputSchema,
  type CustomDeviceRow,
  type DeviceInput,
} from "@/schemas/device";

const BRANDS = ["apple", "google", "samsung", "nothing", "generic"] as const;
const CATEGORIES = ["phone", "tablet", "watch", "desktop"] as const;
const NOTCH_KINDS = [
  { id: "none", label: "None" },
  { id: "dynamic-island", label: "Dynamic island" },
  { id: "punch-hole", label: "Punch hole" },
  { id: "notch", label: "Notch" },
] as const;

/**
 * Numbers are held as strings while typing — an intermediate "12" on the way to
 * "1290" must not be clamped or NaN-ed under the cursor — and only parsed on
 * submit, where the action's zod schema (with `coerce`) is the authority.
 */
interface FormState {
  name: string;
  brand: DeviceInput["brand"];
  category: DeviceInput["category"];
  screenshotWidth: string;
  screenshotHeight: string;
  scaleFactor: string;
  bezel: string;
  bodyCornerRadius: string;
  screenCornerRadius: string;
  notchKind: DeviceInput["notch"]["kind"];
  notchWidth: string;
  notchHeight: string;
  notchOffsetX: string;
  notchOffsetY: string;
  notchCornerRadius: string;
  supportsLandscape: boolean;
  enabled: boolean;
  colorways: { label: string; bodyFill: string }[];
}

function initialState(device: CustomDeviceRow | null): FormState {
  if (!device) {
    return {
      name: "",
      brand: "generic",
      category: "phone",
      screenshotWidth: "1080",
      screenshotHeight: "2340",
      scaleFactor: "3",
      bezel: "32",
      bodyCornerRadius: "90",
      screenCornerRadius: "48",
      notchKind: "none",
      notchWidth: "0",
      notchHeight: "0",
      notchOffsetX: "0",
      notchOffsetY: "0",
      notchCornerRadius: "0",
      supportsLandscape: true,
      enabled: true,
      colorways: [{ label: "Black", bodyFill: "#1c1c1e" }],
    };
  }

  return {
    name: device.name,
    brand: device.brand,
    category: device.category,
    screenshotWidth: String(device.screenshotWidth),
    screenshotHeight: String(device.screenshotHeight),
    scaleFactor: String(device.scaleFactor),
    bezel: String(device.bezel),
    bodyCornerRadius: String(device.bodyCornerRadius),
    screenCornerRadius: String(device.screenCornerRadius),
    notchKind: device.notch.kind,
    notchWidth: String(device.notch.width),
    notchHeight: String(device.notch.height),
    notchOffsetX: String(device.notch.offsetX),
    notchOffsetY: String(device.notch.offsetY),
    notchCornerRadius: String(device.notch.cornerRadius),
    supportsLandscape: device.supportsLandscape,
    enabled: device.enabled,
    colorways: device.colorways.map((c) => ({ ...c })),
  };
}

/** The raw payload the action's schema coerces and validates. */
function toPayload(form: FormState) {
  return {
    name: form.name,
    brand: form.brand,
    category: form.category,
    screenshotWidth: form.screenshotWidth,
    screenshotHeight: form.screenshotHeight,
    scaleFactor: form.scaleFactor,
    bezel: form.bezel,
    bodyCornerRadius: form.bodyCornerRadius,
    screenCornerRadius: form.screenCornerRadius,
    notch: {
      kind: form.notchKind,
      width: form.notchWidth,
      height: form.notchHeight,
      offsetX: form.notchOffsetX,
      offsetY: form.notchOffsetY,
      cornerRadius: form.notchCornerRadius,
    },
    supportsLandscape: form.supportsLandscape,
    colorways: form.colorways,
    enabled: form.enabled,
  };
}

/**
 * Create/edit form for a custom device.
 *
 * The admin enters the handful of numbers a datasheet gives — screenshot size,
 * bezel, radii, notch — and everything else (body, screen rect, viewport) is
 * derived by `buildDeviceSpec`, which also powers the live preview on the right.
 * The preview and the saved device literally cannot disagree.
 */
export function DeviceFormDialog({
  open,
  onOpenChange,
  device,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  device: CustomDeviceRow | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [form, setForm] = useState<FormState>(() => initialState(device));

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((current) => ({ ...current, [key]: value }));

  const preview = useMemo(() => {
    const parsed = deviceInputSchema.safeParse(toPayload(form));
    return parsed.success ? buildDeviceSpec("preview", parsed.data) : null;
  }, [form]);

  const submit = () => {
    startTransition(async () => {
      // The raw strings are what the API's zod schema coerces and validates.
      const payload = toPayload(form) as unknown as DeviceInput;
      const result = device
        ? await updateDevice(device.id, payload)
        : await createDevice(payload);

      if (!result?.status) {
        // On validation failure the envelope's `data` is a { field: message }
        // map; surface the first field message when there is one.
        const details = (result?.data ?? {}) as Record<string, string>;
        const fieldError = Object.values(details).find(Boolean);
        toast.error(fieldError ?? result?.message ?? "Could not save the device.");
        return;
      }

      toast.success(device ? "Device updated" : "Device created");
      router.refresh();
      onOpenChange(false);
    });
  };

  const hasNotch = form.notchKind !== "none";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {device ? `Edit ${device.name}` : "Add device"}
          </DialogTitle>
          <DialogDescription>
            Sizes are in device pixels. Body and screen geometry are derived
            from the screenshot size and bezel, so the numbers cannot drift
            apart.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 sm:grid-cols-[1fr_150px]">
          <ScrollArea className="h-105 pr-3">
            <div className="space-y-4 pb-1">
              <FieldRow>
                <TextField
                  label="Name"
                  value={form.name}
                  onChange={(v) => set("name", v)}
                  placeholder="e.g. Galaxy Tab S10"
                />
              </FieldRow>

              <FieldRow>
                <SelectField
                  label="Brand"
                  value={form.brand}
                  onChange={(v) => set("brand", v as FormState["brand"])}
                  options={BRANDS.map((b) => ({ id: b, label: b }))}
                  capitalize
                />
                <SelectField
                  label="Category"
                  value={form.category}
                  onChange={(v) => set("category", v as FormState["category"])}
                  options={CATEGORIES.map((c) => ({ id: c, label: c }))}
                  capitalize
                />
              </FieldRow>

              <FieldRow>
                <NumberField
                  label="Screenshot width"
                  value={form.screenshotWidth}
                  onChange={(v) => set("screenshotWidth", v)}
                />
                <NumberField
                  label="Screenshot height"
                  value={form.screenshotHeight}
                  onChange={(v) => set("screenshotHeight", v)}
                />
                <NumberField
                  label="Scale factor"
                  value={form.scaleFactor}
                  onChange={(v) => set("scaleFactor", v)}
                  hint="device px per CSS px"
                />
              </FieldRow>

              <FieldRow>
                <NumberField
                  label="Bezel"
                  value={form.bezel}
                  onChange={(v) => set("bezel", v)}
                />
                <NumberField
                  label="Body corner radius"
                  value={form.bodyCornerRadius}
                  onChange={(v) => set("bodyCornerRadius", v)}
                />
                <NumberField
                  label="Screen corner radius"
                  value={form.screenCornerRadius}
                  onChange={(v) => set("screenCornerRadius", v)}
                />
              </FieldRow>

              <FieldRow>
                <SelectField
                  label="Notch"
                  value={form.notchKind}
                  onChange={(v) =>
                    set("notchKind", v as FormState["notchKind"])
                  }
                  options={NOTCH_KINDS.map((k) => ({
                    id: k.id,
                    label: k.label,
                  }))}
                />
              </FieldRow>

              {hasNotch && (
                <>
                  <FieldRow>
                    <NumberField
                      label="Notch width"
                      value={form.notchWidth}
                      onChange={(v) => set("notchWidth", v)}
                    />
                    <NumberField
                      label="Notch height"
                      value={form.notchHeight}
                      onChange={(v) => set("notchHeight", v)}
                    />
                    <NumberField
                      label="Corner radius"
                      value={form.notchCornerRadius}
                      onChange={(v) => set("notchCornerRadius", v)}
                    />
                  </FieldRow>
                  <FieldRow>
                    <NumberField
                      label="Offset X"
                      value={form.notchOffsetX}
                      onChange={(v) => set("notchOffsetX", v)}
                      hint="from screen centre"
                    />
                    <NumberField
                      label="Offset Y"
                      value={form.notchOffsetY}
                      onChange={(v) => set("notchOffsetY", v)}
                      hint="from screen top"
                    />
                  </FieldRow>
                </>
              )}

              <div className="flex items-center justify-between rounded-md border p-3">
                <Label className="text-xs">Supports landscape</Label>
                <Switch
                  checked={form.supportsLandscape}
                  onCheckedChange={(v) => set("supportsLandscape", v)}
                />
              </div>

              <div className="flex items-center justify-between rounded-md border p-3">
                <div>
                  <Label className="text-xs">Enabled</Label>
                  <p className="text-[11px] text-muted-foreground">
                    Visible in every user&apos;s device picker.
                  </p>
                </div>
                <Switch
                  checked={form.enabled}
                  onCheckedChange={(v) => set("enabled", v)}
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs">Finishes</Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs"
                    disabled={form.colorways.length >= 6}
                    onClick={() =>
                      set("colorways", [
                        ...form.colorways,
                        { label: "", bodyFill: "#808080" },
                      ])
                    }
                  >
                    <Plus className="size-3.5" />
                    Add finish
                  </Button>
                </div>

                {form.colorways.map((colorway, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <Input
                      value={colorway.label}
                      placeholder="Finish name"
                      className="h-8 flex-1 text-xs"
                      onChange={(e) =>
                        set(
                          "colorways",
                          form.colorways.map((c, i) =>
                            i === index ? { ...c, label: e.target.value } : c,
                          ),
                        )
                      }
                    />
                    <ColorPicker
                      value={colorway.bodyFill}
                      className="w-40"
                      onChange={(bodyFill) =>
                        set(
                          "colorways",
                          form.colorways.map((c, i) =>
                            i === index ? { ...c, bodyFill } : c,
                          ),
                        )
                      }
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-7 shrink-0"
                      disabled={form.colorways.length <= 1}
                      aria-label="Remove finish"
                      onClick={() =>
                        set(
                          "colorways",
                          form.colorways.filter((_, i) => i !== index),
                        )
                      }
                    >
                      <X className="size-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </ScrollArea>

          <div className="hidden flex-col items-center justify-start gap-2 rounded-lg border bg-muted/30 p-4 sm:flex">
            <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              Preview
            </span>
            {preview ? (
              <DeviceSilhouette
                spec={preview}
                className="max-h-64 w-full text-foreground/80"
              />
            ) : (
              <p className="text-center text-[11px] text-muted-foreground">
                Fill in the numbers to see the frame.
              </p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={pending}
          >
            Cancel
          </Button>
          <Button onClick={submit} disabled={pending}>
            {pending && <Loader2 className="size-4 animate-spin" />}
            {device ? "Save changes" : "Create device"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ------------------------------ small primitives ---------------------------- */

function FieldRow({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">{children}</div>
  );
}

function TextField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="col-span-full space-y-1.5">
      <Label className="text-xs font-normal text-muted-foreground">
        {label}
      </Label>
      <Input
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="h-8"
      />
    </div>
  );
}

function NumberField({
  label,
  value,
  onChange,
  hint,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  hint?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-normal text-muted-foreground">
        {label}
      </Label>
      <Input
        inputMode="decimal"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-8"
      />
      {hint && <p className="text-[10px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
  capitalize = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { id: string; label: string }[];
  capitalize?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-normal text-muted-foreground">
        {label}
      </Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="h-8 w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem
              key={option.id}
              value={option.id}
              className={capitalize ? "capitalize" : undefined}
            >
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
