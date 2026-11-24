import defaults from './defaults.json' with { type: 'json' };
import type { ManuscriptSettings } from './types.ts';

export const mmToPt = (millimetres: number) => (millimetres * 72) / 25.4;
export const defaultManuscript = (): ManuscriptSettings =>
  structuredClone(defaults) as ManuscriptSettings;

export function paperSize(settings: ManuscriptSettings) {
  const sizes = {
    letter: [215.9, 279.4],
    a4: [210, 297],
    a5: [148, 210],
    custom: [settings.customWidthMm, settings.customHeightMm],
  };
  const [width, height] = sizes[settings.paper];
  return settings.orientation === 'landscape'
    ? { width: height, height: width }
    : { width, height };
}

/** Imported layout JSON is checked before it reaches CSS or the print engine. */
export function validateManuscript(input: unknown): ManuscriptSettings {
  if (!input || typeof input !== 'object' || Array.isArray(input))
    throw new Error('Invalid manuscript settings.');
  const settings = input as ManuscriptSettings;
  const base = defaultManuscript();
  if (
    Object.keys(settings).some((key) => !(key in base)) ||
    Object.keys(base).some((key) => !(key in settings))
  )
    throw new Error('Incomplete or unknown manuscript settings.');
  if (
    !['letter', 'a4', 'a5', 'custom'].includes(settings.paper) ||
    !['portrait', 'landscape'].includes(settings.orientation) ||
    !['none', 'today', 'revised'].includes(settings.titleDate) ||
    !['none', 'composed', 'revised'].includes(settings.poemDate)
  )
    throw new Error('Unknown manuscript option.');
  for (const key of [
    'titlePage',
    'titleWordCount',
    'countTitles',
    'showPoemAuthor',
    'sectionPages',
    'poemNewPage',
    'pageNumbers',
  ] as const)
    if (typeof settings[key] !== 'boolean') throw new Error('Invalid manuscript toggle.');
  const range = (value: number, min: number, max: number) =>
    Number.isFinite(value) && value >= min && value <= max;
  if (
    !range(settings.customWidthMm, 100, 432) ||
    !range(settings.customHeightMm, 100, 610) ||
    !range(settings.fontSize, 8, 32) ||
    !range(settings.titleSize, 10, 40) ||
    !range(settings.lineSpacing, 1, 3)
  )
    throw new Error('Manuscript dimensions or typography are outside the supported range.');
  if (
    typeof settings.fontFamily !== 'string' ||
    !settings.fontFamily.trim() ||
    settings.fontFamily.length > 120 ||
    /[\p{Cc}]/u.test(settings.fontFamily)
  )
    throw new Error('Choose a valid font family.');
  const margins = settings.margins;
  if (
    !margins ||
    Object.keys(margins).length !== 4 ||
    !['top', 'bottom', 'left', 'right'].every((key) =>
      range(margins[key as keyof typeof margins], 0, 100),
    )
  )
    throw new Error('Margins must be between 0 and 100 mm.');
  const { width, height } = paperSize(settings);
  if (width - margins.left - margins.right < 40 || height - margins.top - margins.bottom < 40)
    throw new Error('Leave at least 40 mm of usable page width and height.');
  return settings;
}
