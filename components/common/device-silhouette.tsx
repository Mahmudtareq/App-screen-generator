import { resolveNotchRect } from "@/lib/devices/geometry";
import type { CornerRadius, DeviceSpec } from "@/lib/devices/types";
import { cn } from "@/lib/utils";

function radiusOf(radius: CornerRadius): number {
  return typeof radius === "number" ? radius : Math.max(...radius);
}

/**
 * A device spec as a small outline drawing — body, screen and notch.
 *
 * Plain SVG rather than a Konva render on purpose: it is used by the device
 * picker and the admin panel, both far outside components/canvas/, and an SVG
 * derived from the same spec numbers is enough to tell an island phone from a
 * punch-hole one at list size.
 */
export function DeviceSilhouette({
  spec,
  className,
}: {
  spec: DeviceSpec;
  className?: string;
}) {
  const { width, height } = spec.body;
  const stroke = Math.max(width, height) * 0.022;
  const pad = stroke;
  const notch = resolveNotchRect(spec);

  return (
    <svg
      viewBox={`${-pad} ${-pad} ${width + pad * 2} ${height + pad * 2}`}
      className={cn("shrink-0", className)}
      aria-hidden="true"
    >
      <rect
        x={0}
        y={0}
        width={width}
        height={height}
        rx={radiusOf(spec.body.cornerRadius)}
        fill="none"
        stroke="currentColor"
        strokeWidth={stroke}
      />
      <rect
        x={spec.screen.x}
        y={spec.screen.y}
        width={spec.screen.width}
        height={spec.screen.height}
        rx={radiusOf(spec.screen.cornerRadius)}
        fill="currentColor"
        opacity={0.08}
      />
      {notch && (
        <rect
          x={notch.x}
          y={notch.y}
          width={notch.width}
          height={notch.height}
          rx={radiusOf(spec.notch.cornerRadius)}
          fill="currentColor"
        />
      )}
    </svg>
  );
}
