/**
 * Reads a design token (a CSS variable from src/app/globals.css) at run time.
 * For code that cannot use classes, such as drawing on a canvas.
 */
export function readToken(name: `--${string}`): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

/** A number token, such as a timing in milliseconds, or 0 when it is missing. */
export function readNumberToken(name: `--${string}`): number {
  const value = Number.parseFloat(readToken(name));
  return Number.isFinite(value) ? value : 0;
}
