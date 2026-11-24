import type { MeasureText } from '../domain/manuscript/types';

/** Canvas shares the WebView's installed/bundled fonts and fallback shaping.
 * Measuring a point-sized font as the same numeric px size returns point units;
 * the preview/print CSS converts those points to physical page dimensions. */
export async function manuscriptMeasure(fontFamily: string): Promise<MeasureText> {
  const family = JSON.stringify(fontFamily);
  await Promise.all([
    document.fonts.load(`12px ${family}`),
    document.fonts.load(`bold 12px ${family}`),
  ]);
  await document.fonts.ready;
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  if (!context) throw new Error('The page preview cannot measure text in this webview.');
  return (text, size, weight) => {
    context.font = `${weight} ${size}px ${family}, serif`;
    return context.measureText(text).width;
  };
}
