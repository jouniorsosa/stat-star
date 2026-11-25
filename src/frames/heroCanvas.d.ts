/** Draws the themed hero animation on a canvas; returns a function that stops it. */
export function startHero(canvas: HTMLCanvasElement, getTheme: () => string): () => void
