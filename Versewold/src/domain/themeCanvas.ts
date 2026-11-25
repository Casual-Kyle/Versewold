import type { Project } from './workspace.ts';

export interface CanvasPoint {
  x: number;
  y: number;
}

export interface CanvasCamera extends CanvasPoint {
  zoom: number;
}

export type CanvasCard = CanvasPoint & { id: string } & (
  | { kind: 'poem' | 'theme'; targetId: string; text?: never }
  | { kind: 'note'; text: string; targetId?: never }
);

export interface CanvasConnection {
  id: string;
  from: string;
  to: string;
  label: string;
}

export interface ThemeCanvas {
  cards: CanvasCard[];
  connections: CanvasConnection[];
  camera: CanvasCamera;
}

export const canvasLimits = {
  cards: 250,
  connections: 500,
  coordinate: 100_000,
  cameraCoordinate: 300_000,
  minZoom: 0.4,
  maxZoom: 2,
  note: 2_000,
  label: 100,
} as const;

const idPattern = /^[A-Za-z0-9-]{1,100}$/u;
const control = /\p{Cc}/u;
const noteControl = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f-\u009f]/u;

export function emptyCanvas(): ThemeCanvas {
  return { cards: [], connections: [], camera: { x: 0, y: 0, zoom: 1 } };
}

export function canvasCoordinate(value: number, limit: number = canvasLimits.coordinate): number {
  return Math.round(Math.min(limit, Math.max(-limit, value)));
}

function validPoint(value: CanvasPoint, bound: number = canvasLimits.coordinate): boolean {
  return Number.isInteger(value.x) && Number.isInteger(value.y)
    && Math.abs(value.x) <= bound && Math.abs(value.y) <= bound;
}

function validId(value: unknown): value is string {
  return typeof value === 'string' && idPattern.test(value);
}

export function validateThemeCanvas(project: Pick<Project, 'themeCanvas' | 'poems' | 'themeDefinitions'>): void {
  const canvas = project.themeCanvas;
  if (canvas === undefined) return;
  if (!canvas || !Array.isArray(canvas.cards) || !Array.isArray(canvas.connections)
    || canvas.cards.length > canvasLimits.cards || canvas.connections.length > canvasLimits.connections
    || !canvas.camera || !validPoint(canvas.camera, canvasLimits.cameraCoordinate) || !Number.isFinite(canvas.camera.zoom)
    || canvas.camera.zoom < canvasLimits.minZoom || canvas.camera.zoom > canvasLimits.maxZoom)
    throw new Error('Invalid theme canvas layout.');

  const poems = new Set(project.poems.filter((poem) => (poem.kind ?? 'poem') === 'poem').map((poem) => poem.id));
  const themes = new Set((project.themeDefinitions ?? []).map((theme) => theme.id));
  const cards = new Set<string>();
  const references = new Set<string>();
  for (const card of canvas.cards) {
    if (!card || !validId(card.id) || cards.has(card.id) || !validPoint(card))
      throw new Error('Invalid or duplicate canvas card.');
    cards.add(card.id);
    if (card.kind === 'note') {
      if (typeof card.text !== 'string' || [...card.text].length > canvasLimits.note
        || noteControl.test(card.text) || card.targetId !== undefined)
        throw new Error('Canvas notes can contain up to 2,000 characters.');
      continue;
    }
    const targets = card.kind === 'poem' ? poems : card.kind === 'theme' ? themes : undefined;
    if (!targets || !validId(card.targetId) || !targets.has(card.targetId) || card.text !== undefined)
      throw new Error('A canvas card refers to a missing poem or theme.');
    const reference = card.kind + ':' + card.targetId;
    if (references.has(reference)) throw new Error('This poem or theme is already on the canvas.');
    references.add(reference);
  }

  const connections = new Set<string>();
  const pairs = new Set<string>();
  for (const edge of canvas.connections) {
    if (!edge || !validId(edge.id) || connections.has(edge.id) || !cards.has(edge.from)
      || !cards.has(edge.to) || edge.from === edge.to || typeof edge.label !== 'string'
      || !edge.label.trim() || [...edge.label].length > canvasLimits.label || control.test(edge.label))
      throw new Error('A connection needs two different cards and a label of up to 100 characters.');
    connections.add(edge.id);
    const pair = [edge.from, edge.to].sort().join(':');
    if (pairs.has(pair)) throw new Error('These cards already have a connection.');
    pairs.add(pair);
  }
}

/** Project copies get fresh card and connection IDs alongside fresh source IDs. */
export function remapThemeCanvas(
  canvas: ThemeCanvas,
  poems: ReadonlyMap<string, string>,
  themes: ReadonlyMap<string, string>,
  id: () => string,
): ThemeCanvas {
  const cards = new Map(canvas.cards.map((card) => [card.id, id()]));
  function mapped(ids: ReadonlyMap<string, string>, previous: string): string {
    const next = ids.get(previous);
    if (!next) throw new Error('A canvas reference could not be remapped.');
    return next;
  }
  return {
    camera: { ...canvas.camera },
    cards: canvas.cards.map((card) => {
      const nextId = mapped(cards, card.id);
      if (card.kind === 'note') return { ...card, id: nextId };
      return { ...card, id: nextId, targetId: mapped(card.kind === 'poem' ? poems : themes, card.targetId) };
    }),
    connections: canvas.connections.map((edge) => ({
      ...edge, id: id(), from: mapped(cards, edge.from), to: mapped(cards, edge.to),
    })),
  };
}

export function removeCanvasCard(canvas: ThemeCanvas, id: string): ThemeCanvas {
  return {
    ...canvas,
    cards: canvas.cards.filter((card) => card.id !== id),
    connections: canvas.connections.filter((edge) => edge.from !== id && edge.to !== id),
  };
}

/** Keep the board location under the given screen point fixed when zooming. */
export function zoomCanvas(camera: CanvasCamera, point: CanvasPoint, next: number): CanvasCamera {
  const zoom = Math.min(canvasLimits.maxZoom, Math.max(canvasLimits.minZoom, next));
  const ratio = zoom / camera.zoom;
  return {
    zoom,
    x: canvasCoordinate(point.x - (point.x - camera.x) * ratio, canvasLimits.cameraCoordinate),
    y: canvasCoordinate(point.y - (point.y - camera.y) * ratio, canvasLimits.cameraCoordinate),
  };
}
