"use client";

import { CHECKERBOARD } from "./image-checkerboard";

/**
 * One selectable image in a picker grid.
 *
 * A plain `<img>` rather than `next/image`: these are blob URLs and arbitrary
 * remote URLs at thumbnail size, which is precisely the case the optimiser cannot
 * help with and the remote-patterns allowlist would reject.
 */
export function ImageTile({
  url,
  label,
  onSelect,
}: {
  url: string;
  label: string;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      title={label}
      className="group space-y-1.5 text-left"
    >
      <span
        className="flex aspect-square items-center justify-center overflow-hidden rounded-xl border p-2 transition-colors group-hover:border-primary"
        style={CHECKERBOARD}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={url}
          alt=""
          className="max-h-full max-w-full object-contain"
          loading="lazy"
        />
      </span>
      <span className="block truncate text-[11px] text-muted-foreground">
        {label}
      </span>
    </button>
  );
}
