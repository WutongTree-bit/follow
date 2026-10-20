/** Shared geometry for the page wordmark, app icons and share-image wordmarks. */
export const BRAND_MARK = {
  viewBox: "0 0 512 512",
  ring: "M414 212A164 164 0 1 1 328 109",
  dot: { cx: 388, cy: 144, r: 19 },
  bars: [
    { x: 167, y: 260, width: 42, height: 66, rx: 10 },
    { x: 235, y: 216, width: 42, height: 110, rx: 10 },
    { x: 303, y: 172, width: 42, height: 154, rx: 10 },
  ],
} as const;
