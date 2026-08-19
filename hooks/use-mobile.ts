import * as React from "react"

const MOBILE_BREAKPOINT = 768

/**
 * Rewritten from shadcn's generated version, which set state inside an effect to
 * seed the first value and trips this project's `react-hooks/set-state-in-effect`
 * rule. `useSyncExternalStore` reads the same media query without an effect, and
 * its server snapshot keeps the markup desktop-shaped — matching the old hook,
 * whose `undefined` initial state also rendered as false.
 */
function subscribe(onStoreChange: () => void) {
  const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
  mql.addEventListener("change", onStoreChange)
  return () => mql.removeEventListener("change", onStoreChange)
}

const getSnapshot = () => window.innerWidth < MOBILE_BREAKPOINT
const getServerSnapshot = () => false

export function useIsMobile() {
  return React.useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}
