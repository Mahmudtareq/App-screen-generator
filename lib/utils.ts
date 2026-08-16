import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Trailing-edge debounce, preserving `this` for callers that need it. */
export function debounce<Args extends unknown[]>(
  fn: (...args: Args) => void,
  waitMs: number,
) {
  let timer: ReturnType<typeof setTimeout> | undefined

  return function debounced(this: unknown, ...args: Args) {
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => fn.apply(this, args), waitMs)
  }
}

export function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}
