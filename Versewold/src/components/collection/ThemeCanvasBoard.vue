<script setup lang="ts">
import { computed, ref, shallowRef } from 'vue';
import {
  canvasCoordinate,
  canvasLimits,
  zoomCanvas,
  type CanvasCamera,
  type CanvasCard,
  type CanvasPoint,
  type ThemeCanvas,
} from '../../domain/themeCanvas';

const width = 192;
const height = 100;

const props = defineProps<{
  canvas: ThemeCanvas;
  labels: ReadonlyMap<string, string>;
  selected: string;
}>();
const emit = defineEmits<{
  camera: [camera: CanvasCamera];
  move: [id: string, point: CanvasPoint];
  select: [id: string];
}>();
const viewport = ref<HTMLElement>();
type Drag = {
  pointer: number;
  start: CanvasPoint;
  origin: CanvasPoint;
  cardId?: string;
};
const drag = shallowRef<Drag>();
const preview = shallowRef<CanvasPoint>();
const camera = computed(() =>
  drag.value && !drag.value.cardId && preview.value
    ? { ...props.canvas.camera, ...preview.value }
    : props.canvas.camera,
);
const cards = computed(() =>
  props.canvas.cards.map((card) =>
    drag.value?.cardId === card.id && preview.value ? { ...card, ...preview.value } : card,
  ),
);
const connections = computed(() => {
  const positions = new Map(cards.value.map((card) => [card.id, card]));
  return props.canvas.connections.flatMap((edge) => {
    const from = positions.get(edge.from);
    const to = positions.get(edge.to);
    if (!from || !to) return [];
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    return [{
      id: edge.id,
      label: edge.label,
      x: from.x + width / 2,
      y: from.y + height / 2,
      dx,
      dy,
      length: Math.hypot(dx, dy),
      angle: Math.atan2(dy, dx),
    }];
  });
});

function center(): CanvasPoint {
  return { x: (viewport.value?.clientWidth ?? 0) / 2, y: (viewport.value?.clientHeight ?? 0) / 2 };
}

function visibleOrigin(): CanvasPoint {
  const { x, y, zoom } = camera.value;
  return { x: canvasCoordinate((24 - x) / zoom), y: canvasCoordinate((24 - y) / zoom) };
}

function centerOn(card: CanvasPoint) {
  const point = center();
  const zoom = camera.value.zoom;
  emit('camera', {
    zoom,
    x: canvasCoordinate(point.x - (card.x + width / 2) * zoom, canvasLimits.cameraCoordinate),
    y: canvasCoordinate(point.y - (card.y + height / 2) * zoom, canvasLimits.cameraCoordinate),
  });
}
defineExpose({ centerOn, visibleOrigin });

function reveal(card: CanvasPoint) {
  const element = viewport.value;
  if (!element || drag.value) return;
  const { x, y, zoom } = camera.value;
  const left = x + card.x * zoom;
  const top = y + card.y * zoom;
  if (
    left < 0 || top < 0 ||
    left + width * zoom > element.clientWidth ||
    top + height * zoom > element.clientHeight
  ) centerOn(card);
}

function start(event: PointerEvent, card?: CanvasCard) {
  if (event.button !== 0 || drag.value || !viewport.value) return;
  if (card) emit('select', card.id);
  const origin = card ?? camera.value;
  drag.value = {
    pointer: event.pointerId,
    start: { x: event.clientX, y: event.clientY },
    origin: { x: origin.x, y: origin.y },
    cardId: card?.id,
  };
  viewport.value.setPointerCapture(event.pointerId);
}

function move(event: PointerEvent) {
  const active = drag.value;
  if (!active || event.pointerId !== active.pointer) return;
  const scale = active.cardId ? camera.value.zoom : 1;
  const limit = active.cardId ? canvasLimits.coordinate : canvasLimits.cameraCoordinate;
  preview.value = {
    x: canvasCoordinate(active.origin.x + (event.clientX - active.start.x) / scale, limit),
    y: canvasCoordinate(active.origin.y + (event.clientY - active.start.y) / scale, limit),
  };
}

function finish(event: PointerEvent, save: boolean) {
  const active = drag.value;
  if (!active || event.pointerId !== active.pointer) return;
  if (save) move(event);
  const point = preview.value;
  preview.value = undefined;
  drag.value = undefined;
  if (!save || !point || (point.x === active.origin.x && point.y === active.origin.y)) return;
  if (active.cardId) emit('move', active.cardId, point);
  else emit('camera', { ...point, zoom: props.canvas.camera.zoom });
}

function zoomBy(factor: number, point = center()) {
  if (drag.value) return;
  emit('camera', zoomCanvas(camera.value, point, camera.value.zoom * factor));
}

function wheel(event: WheelEvent) {
  const bounds = viewport.value?.getBoundingClientRect();
  if (!bounds || event.deltaY === 0) return;
  zoomBy(event.deltaY < 0 ? 1.12 : 1 / 1.12, {
    x: event.clientX - bounds.left,
    y: event.clientY - bounds.top,
  });
}

const directions: Partial<Record<string, CanvasPoint>> = {
  ArrowUp: { x: 0, y: -1 },
  ArrowDown: { x: 0, y: 1 },
  ArrowLeft: { x: -1, y: 0 },
  ArrowRight: { x: 1, y: 0 },
};
function keyMove(event: KeyboardEvent, card?: CanvasCard) {
  if (drag.value || event.altKey || event.ctrlKey || event.metaKey) return;
  const direction = directions[event.key];
  if (!direction) return;
  event.preventDefault();
  const step = event.shiftKey ? 64 : 16;
  const limit = card ? canvasLimits.coordinate : canvasLimits.cameraCoordinate;
  const origin = card ?? camera.value;
  const point = {
    x: canvasCoordinate(origin.x + step * direction.x, limit),
    y: canvasCoordinate(origin.y + step * direction.y, limit),
  };
  if (card) {
    emit('select', card.id);
    emit('move', card.id, point);
    reveal(point);
  } else emit('camera', { ...point, zoom: camera.value.zoom });
}
</script>

<template>
  <div class="canvas-board">
    <div class="canvas-zoom" role="group" aria-label="Canvas zoom">
      <button
        class="icon-button" aria-label="Zoom out"
        :disabled="camera.zoom <= canvasLimits.minZoom" @click="zoomBy(1 / 1.2)"
      >−</button>
      <output>{{ Math.round(camera.zoom * 100) }}%</output>
      <button
        class="icon-button" aria-label="Zoom in"
        :disabled="camera.zoom >= canvasLimits.maxZoom" @click="zoomBy(1.2)"
      >+</button>
      <button class="text-button" @click="emit('camera', { x: 0, y: 0, zoom: 1 })">Reset view</button>
    </div>
    <div
      ref="viewport"
      class="canvas-viewport"
      :class="{ 'is-panning': drag && !drag.cardId }"
      :style="{
        backgroundSize: 24 * camera.zoom + 'px ' + 24 * camera.zoom + 'px',
        backgroundPosition: camera.x + 'px ' + camera.y + 'px',
      }"
      tabindex="0"
      role="group"
      aria-label="Theme canvas. Arrow keys pan the canvas. Arrow keys on a card move the card."
      @pointerdown.self="start($event)"
      @pointermove="move"
      @pointerup="finish($event, true)"
      @pointercancel="finish($event, false)"
      @lostpointercapture="finish($event, false)"
      @keydown.self="keyMove($event)"
      @wheel.prevent="wheel"
    >
      <p v-if="!cards.length" class="canvas-placeholder">Add a poem, theme, or note to get started.</p>
      <div class="canvas-plane" :style="{ transform: 'translate(' + camera.x + 'px, ' + camera.y + 'px) scale(' + camera.zoom + ')' }">
        <template v-for="edge in connections" :key="edge.id">
          <span class="canvas-line" aria-hidden="true" :style="{ left: edge.x + 'px', top: edge.y + 'px', width: edge.length + 'px', transform: 'rotate(' + edge.angle + 'rad)' }" />
          <span class="canvas-line-label" aria-hidden="true" :style="{ left: edge.x + edge.dx / 2 + 'px', top: edge.y + edge.dy / 2 + 'px' }">{{ edge.label }}</span>
        </template>
        <button
          v-for="card in cards" :key="card.id"
          type="button"
          class="canvas-card"
          :class="'card-' + card.kind"
          :aria-pressed="card.id === selected"
          :style="{ left: card.x + 'px', top: card.y + 'px', width: width + 'px', height: height + 'px' }"
          :title="labels.get(card.id)"
          @pointerdown.stop="start($event, card)"
          @click="emit('select', card.id)"
          @focus="reveal(card)"
          @keydown="keyMove($event, card)"
        >
          <small>{{ card.kind }}</small>
          <strong>{{ labels.get(card.id) }}</strong>
        </button>
      </div>
    </div>
    <p class="canvas-hint">Drag cards to arrange them. Drag the background to pan, or scroll to zoom.</p>
  </div>
</template>
