/**
 * Sizes the canvas backing store to match its CSS size at the current
 * devicePixelRatio. Returns false when the canvas has no layout size yet.
 */
export function fitCanvasToDisplaySize(canvas: HTMLCanvasElement): boolean {
  const { clientWidth, clientHeight } = canvas;
  if (clientWidth === 0 || clientHeight === 0) return false;
  const dpr = window.devicePixelRatio || 1;
  canvas.width = Math.round(clientWidth * dpr);
  canvas.height = Math.round(clientHeight * dpr);
  return true;
}
