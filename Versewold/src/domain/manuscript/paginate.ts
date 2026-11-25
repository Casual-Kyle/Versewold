import { documentKey, type Project, type PoemEntry } from '../workspace.ts';
import {
  manuscriptGroups,
  displayDate,
  projectWordCount,
  localDate,
  isPoem,
  poemSignature,
  validateProjectStructure,
} from './structure.ts';
import { mmToPt, paperSize, validateManuscript } from './settings.ts';
import type { ManuscriptPage, ManuscriptLine, ManuscriptSettings, MeasureText } from './types.ts';

/** Break only for page presentation. The stored logical lines remain unchanged.
 * Code points keep surrogate pairs together; combining marks stay with the
 * preceding character where the browser exposes grapheme segmentation. */
export function wrapLine(text: string, width: number, measure: (text: string) => number): string[] {
  if (!text || measure(text) <= width) return [text];
  const segments =
    typeof Intl.Segmenter === 'function'
      ? [...new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(text)].map(
          (part) => part.segment,
        )
      : [...text];
  const result: string[] = [];
  let start = 0;
  while (start < segments.length) {
    let low = start + 1,
      high = segments.length,
      end = low;
    if (measure(segments[start]) > width)
      throw new Error(
        'A character is wider than the usable page. Increase the page width or reduce the font.',
      );
    while (low <= high) {
      const middle = Math.floor((low + high) / 2);
      if (measure(segments.slice(start, middle).join('')) <= width) {
        end = middle;
        low = middle + 1;
      } else high = middle - 1;
    }
    if (end < segments.length) {
      for (let position = end - 1; position > start; position--) {
        if (
          /\s/u.test(segments[position]) &&
          segments.slice(start, position).some((segment) => /\S/u.test(segment))
        ) {
          end = position + 1;
          break;
        }
      }
    }
    result.push(segments.slice(start, end).join(''));
    start = end;
  }
  return result;
}

/** Shared page geometry drives both the on-screen sheets and native PDF print.
 * All measurements are points; no DOM/Canvas dependency enters this module. */
export function paginateManuscript(
  project: Project,
  documents: Record<string, string>,
  settings: ManuscriptSettings,
  author: string,
  measure: MeasureText,
  today = localDate(),
) {
  settings = validateManuscript(settings);
  validateProjectStructure(project);
  const dimensions = paperSize(settings);
  const width = mmToPt(dimensions.width),
    height = mmToPt(dimensions.height);
  const left = mmToPt(settings.margins.left),
    right = mmToPt(settings.margins.right);
  const top = mmToPt(settings.margins.top),
    bottom = mmToPt(settings.margins.bottom);
  const contentWidth = width - left - right;
  const bottomEdge = height - Math.max(bottom, settings.pageNumbers ? 20 : 0);
  const step = settings.fontSize * 1.2 * settings.lineSpacing;
  const pages: ManuscriptPage[] = [];
  // Completed poems reserve footer space on their final page only. A shared
  // page can hold several signatures in the same order as its poems.
  type Signature = { lines: string[] };
  const signatures = new Map<ManuscriptPage, Signature[]>();
  const signatureSize = 10,
    signatureStep = 12,
    signatureGap = 6;
  function signatureHeight(entries: Signature[]) {
    return (
      entries.reduce((height, entry) => height + entry.lines.length * signatureStep, 0) +
      Math.max(0, entries.length - 1) * signatureGap
    );
  }
  function textBottom(page?: ManuscriptPage, incoming?: Signature) {
    const entries = [
      ...(page ? (signatures.get(page) ?? []) : []),
      ...(incoming ? [incoming] : []),
    ];
    return bottomEdge - (entries.length ? signatureHeight(entries) + 12 : 0);
  }
  const count = projectWordCount(project, documents, settings.countTitles);
  let current: ManuscriptPage | undefined;
  let cursor = top;

  function newPage(kind: ManuscriptPage['kind'], label: string, documentId?: string) {
    if (pages.length >= 500)
      throw new Error(
        'This layout exceeds 500 pages. Reduce spacing, adjust margins, or split the project.',
      );
    current = { id: `page-${pages.length + 1}`, kind, label, documentId, lines: [] };
    pages.push(current);
    cursor = top;
    return current;
  }
  function line(
    text: string,
    y: number,
    size: number,
    role: ManuscriptLine['role'],
    align: ManuscriptLine['align'] = 'left',
    weight: ManuscriptLine['weight'] = 'normal',
  ) {
    current!.lines.push({ text, x: left, y, width: contentWidth, size, role, align, weight });
  }
  function centered(
    text: string,
    y: number,
    size: number,
    role: ManuscriptLine['role'],
    weight: ManuscriptLine['weight'] = 'normal',
  ) {
    const lines = wrapLine(text, contentWidth, (text) => measure(text, size, weight));
    lines.forEach((text, index) =>
      line(text, y + index * size * 1.3, size, role, 'center', weight),
    );
    return y + lines.length * size * 1.3;
  }
  const projectAuthor = project.authorName?.trim() || author.trim();
  if (settings.titlePage) {
    newPage('title', 'Title page');
    if (settings.titleWordCount)
      line(`${count.toLocaleString('en')} words`, top, 10, 'metadata', 'right');
    const titleSize = Math.min(40, settings.titleSize * 1.5);
    let y = top + Math.min((bottomEdge - top) * 0.3, 170);
    y = centered(project.title, y, titleSize, 'heading', 'bold') + 24;
    if (projectAuthor) y = centered(projectAuthor, y, settings.fontSize, 'metadata') + 20;
    const latest = project.poems
      .map((poem) => poem.updatedAt ?? '')
      .sort()
      .at(-1);
    const date =
      settings.titleDate === 'today'
        ? displayDate(today)
        : settings.titleDate === 'revised'
          ? displayDate(latest)
          : '';
    if (date) centered(date, y, settings.fontSize, 'metadata');
    if (current!.lines.some((row) => row.y + row.size * 1.3 > bottomEdge))
      throw new Error('The title page does not fit. Reduce the title size or margins.');
    current = undefined;
  }

  function addDocument(poem: PoemEntry) {
    const body = documents[documentKey(project.id, poem.id)];
    if (typeof body !== 'string') throw new Error(`Missing text for ${poem.title}.`);
    const signatureText =
      settings.poemSignature && isPoem(poem) ? poemSignature(poem, projectAuthor) : '';
    const signature: Signature | undefined = signatureText
      ? {
          lines: wrapLine(signatureText, contentWidth, (text) =>
            measure(text, signatureSize, 'normal'),
          ),
        }
      : undefined;
    if (signature && top + settings.fontSize * 1.2 > textBottom(undefined, signature))
      throw new Error(
        `The signature for "${poem.title}" does not fit. Increase the usable page area or shorten the author name.`,
      );
    const logicalLines = body.replace(/\r\n?/g, '\n').replace(/\t/g, '    ').split('\n');
    // Trailing empty source positions need no extra blank PDF pages.
    while (logicalLines.length && !logicalLines.at(-1)!.trim()) logicalLines.pop();
    const bodyLines = logicalLines.flatMap((logical) =>
      wrapLine(logical, contentWidth, (text) => measure(text, settings.fontSize, 'normal')),
    );
    const firstPageSignature = bodyLines.length <= 1 ? signature : undefined;
    const headingLines = wrapLine(poem.title, contentWidth, (text) =>
      measure(text, settings.titleSize, 'bold'),
    );
    const metadata: string[] = [];
    if (settings.showPoemAuthor) {
      const name = poem.author?.trim() || projectAuthor;
      if (name) metadata.push(name);
    }
    const date =
      settings.poemDate === 'composed'
        ? displayDate(poem.composedOn)
        : settings.poemDate === 'revised'
          ? displayDate(poem.updatedAt)
          : '';
    if (date) metadata.push(`${settings.poemDate === 'composed' ? 'Composed' : 'Revised'} ${date}`);
    const metadataLines = metadata.flatMap((text) =>
      wrapLine(text, contentWidth, (value) => measure(value, 10, 'normal')),
    );
    const headingHeight =
      headingLines.length * settings.titleSize * 1.3 + metadataLines.length * 14 + step;
    if (headingHeight + step > textBottom(undefined, firstPageSignature) - top)
      throw new Error(
        `The heading for “${poem.title}” does not fit. Reduce the title size or margins.`,
      );
    if (
      !current ||
      (settings.poemNewPage && current.documentId) ||
      poem.kind === 'dedication' ||
      poem.kind === 'about' ||
      cursor + headingHeight + step > textBottom(current, firstPageSignature)
    )
      newPage('text', poem.title, poem.id);
    else cursor += step;
    current!.documentId ??= poem.id;
    headingLines.forEach((text) => {
      line(text, cursor, settings.titleSize, 'heading', 'left', 'bold');
      cursor += settings.titleSize * 1.3;
    });
    metadataLines.forEach((text) => {
      line(text, cursor, 10, 'metadata');
      cursor += 14;
    });
    cursor += step * 0.7;
    for (const [index, text] of bodyLines.entries()) {
      // Keep the last written line with its signature. Earlier pages use their
      // full available height rather than reserving an unused signature band.
      const finalSignature = index === bodyLines.length - 1 ? signature : undefined;
      if (cursor + settings.fontSize * 1.2 > textBottom(current, finalSignature)) {
        newPage('text', `${poem.title} (continued)`, poem.id);
        if (top >= 18) line(`${poem.title} (continued)`, top - 18, 9, 'metadata');
      }
      line(text, cursor, settings.fontSize, 'body');
      cursor += step;
    }
    if (signature) signatures.set(current!, [...(signatures.get(current!) ?? []), signature]);
    if (poem.kind === 'dedication' || poem.kind === 'about') current = undefined;
  }

  for (const group of manuscriptGroups(project)) {
    if (group.title) {
      if (settings.sectionPages) {
        newPage('section', group.title);
        centered(
          group.title,
          top + (bottomEdge - top) * 0.32,
          settings.titleSize,
          'heading',
          'bold',
        );
        if (current!.lines.some((row) => row.y + row.size * 1.3 > bottomEdge))
          throw new Error('A section title does not fit on its page.');
        current = undefined;
      } else if (group.documents.length) {
        newPage('text', group.title);
        for (const text of wrapLine(group.title, contentWidth, (value) =>
          measure(value, settings.titleSize, 'bold'),
        )) {
          line(text, cursor, settings.titleSize, 'heading', 'left', 'bold');
          cursor += settings.titleSize * 1.3;
        }
        cursor += step;
      }
    }
    group.documents.forEach(addDocument);
  }
  let number = 0;
  for (const page of pages) {
    if (page.kind === 'title') continue;
    const entries = signatures.get(page) ?? [];
    let signatureY = bottomEdge - signatureHeight(entries);
    for (const entry of entries) {
      for (const text of entry.lines) {
        page.lines.push({
          text,
          x: left,
          y: signatureY,
          width: contentWidth,
          size: signatureSize,
          weight: 'normal',
          align: 'right',
          role: 'signature',
        });
        signatureY += signatureStep;
      }
      signatureY += signatureGap;
    }
    number++;
    if (settings.pageNumbers)
      page.lines.push({
        text: String(number),
        x: left,
        y: Math.min(height - 12, height - bottom + 12),
        width: contentWidth,
        size: 9,
        weight: 'normal',
        align: 'center',
        role: 'footer',
      });
  }
  return {
    pages,
    width,
    height,
    widthMm: dimensions.width,
    heightMm: dimensions.height,
    wordCount: count,
  };
}
