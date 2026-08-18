/**
 * The transparency checkerboard, as inline style.
 *
 * A transparent PNG is the normal case for a logo or badge, and previewing one on
 * a plain card makes its background indistinguishable from the card — you cannot
 * tell a white logo from a missing one. Inline rather than a Tailwind utility
 * because it is four layered gradients that no arbitrary-value class expresses
 * legibly.
 */
export const CHECKERBOARD: React.CSSProperties = {
  backgroundImage: `
    linear-gradient(45deg, rgb(0 0 0 / 0.08) 25%, transparent 25%),
    linear-gradient(-45deg, rgb(0 0 0 / 0.08) 25%, transparent 25%),
    linear-gradient(45deg, transparent 75%, rgb(0 0 0 / 0.08) 75%),
    linear-gradient(-45deg, transparent 75%, rgb(0 0 0 / 0.08) 75%)
  `,
  backgroundSize: "14px 14px",
  backgroundPosition: "0 0, 0 7px, 7px -7px, -7px 0",
};
