<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import type { Project, ProjectTheme } from '../../domain/workspace';
import { collectionThemes } from '../../domain/projectThemes';
import { isPoem } from '../../domain/manuscript/structure';
import {
  canvasCoordinate,
  canvasLimits,
  emptyCanvas,
  removeCanvasCard,
  storeThemeCanvas,
  type CanvasCamera,
  type CanvasCard,
  type CanvasPoint,
  type ThemeCanvas,
} from '../../domain/themeCanvas';
import ThemeCanvasBoard from './ThemeCanvasBoard.vue';

const props = defineProps<{ project: Project }>();
const emit = defineEmits<{ open: [id: string] }>();
const initial = emptyCanvas();
const canvas = computed(() => props.project.themeCanvas ?? initial);
const board = ref<InstanceType<typeof ThemeCanvasBoard>>();
const selected = ref('');
const addKind = ref<CanvasCard['kind']>('poem');
const addTarget = ref('');
const connectTo = ref('');
const connectionLabel = ref('');
const error = ref('');
const poems = computed(() => props.project.poems.filter(isPoem));
const themes = computed(() => collectionThemes(props.project));
const card = computed(() => canvas.value.cards.find((entry) => entry.id === selected.value));
const labels = computed(() => {
  const poemLabels = new Map(poems.value.map((poem) => [poem.id, poem.title || 'Untitled poem']));
  const themeLabels = new Map(themes.value.map((theme) => [theme.id, theme.label]));
  return new Map(canvas.value.cards.map((entry) => {
    switch (entry.kind) {
      case 'poem': return [entry.id, poemLabels.get(entry.targetId) ?? 'Missing poem'] as const;
      case 'theme': return [entry.id, themeLabels.get(entry.targetId) ?? 'Missing theme'] as const;
      case 'note': return [entry.id, entry.text.trim() || 'Blank note'] as const;
    }
  }));
});
const targets = computed(() => {
  const used = new Set(canvas.value.cards
    .filter((entry) => entry.kind === addKind.value)
    .map((entry) => entry.targetId));
  if (addKind.value === 'poem')
    return poems.value.filter((poem) => !used.has(poem.id))
      .map((poem) => ({ id: poem.id, label: poem.title || 'Untitled poem' }));
  if (addKind.value === 'theme') return themes.value.filter((theme) => !used.has(theme.id));
  return [];
});
const related = computed(() => canvas.value.connections.flatMap((edge) => {
  if (edge.from === selected.value) return [{ ...edge, other: edge.to }];
  if (edge.to === selected.value) return [{ ...edge, other: edge.from }];
  return [];
}));
const connectChoices = computed(() => {
  const connected = new Set(related.value.map((edge) => edge.other));
  return canvas.value.cards.filter((entry) => entry.id !== selected.value && !connected.has(entry.id));
});
const atCardLimit = computed(() => canvas.value.cards.length >= canvasLimits.cards);
const atConnectionLimit = computed(() => canvas.value.connections.length >= canvasLimits.connections);
watch(addKind, () => {
  addTarget.value = '';
  error.value = '';
});
watch(selected, () => {
  connectTo.value = '';
  connectionLabel.value = '';
  error.value = '';
});

function commit(next: ThemeCanvas, definitions?: ProjectTheme[]): boolean {
  try {
    storeThemeCanvas(props.project, next, definitions);
    error.value = '';
    return true;
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : String(cause);
    return false;
  }
}

function addPosition(): CanvasPoint {
  const origin = board.value?.visibleOrigin() ?? { x: 24, y: 24 };
  for (let index = 0; index <= canvas.value.cards.length; index++) {
    const x = canvasCoordinate(origin.x + (index % 3) * 216);
    const y = canvasCoordinate(origin.y + Math.floor(index / 3) * 124);
    if (!canvas.value.cards.some((entry) => Math.abs(entry.x - x) < 192 && Math.abs(entry.y - y) < 100))
      return { x, y };
  }
  return origin;
}

function addCard() {
  const kind = addKind.value;
  const base = { id: crypto.randomUUID(), ...addPosition() };
  const targetId = addTarget.value;
  const entry: CanvasCard = kind === 'note' ? { ...base, kind, text: '' } : { ...base, kind, targetId };
  const definitions = kind === 'theme' && !props.project.themeDefinitions?.length
    ? themes.value.map((theme) => ({ ...theme }))
    : undefined;
  if (commit({ ...canvas.value, cards: [...canvas.value.cards, entry] }, definitions)) {
    addTarget.value = '';
    selected.value = entry.id;
    board.value?.centerOn(entry);
  }
}

function moveCard(id: string, point: CanvasPoint) {
  if (!canvas.value.cards.some((entry) => entry.id === id && (entry.x !== point.x || entry.y !== point.y))) return;
  commit({ ...canvas.value, cards: canvas.value.cards.map((entry) => entry.id === id ? { ...entry, ...point } : entry) });
}

function saveCamera(camera: CanvasCamera) {
  const previous = canvas.value.camera;
  if (previous.x !== camera.x || previous.y !== camera.y || previous.zoom !== camera.zoom)
    commit({ ...canvas.value, camera });
}

function jump(event: Event) {
  const value = (event.target as HTMLSelectElement).value;
  const entry = canvas.value.cards.find((item) => item.id === value);
  if (!entry) return;
  selected.value = entry.id;
  board.value?.centerOn(entry);
}

function editNote(entry: CanvasCard, event: Event) {
  const input = event.target as HTMLTextAreaElement;
  if (entry.kind !== 'note' || input.value === entry.text) return;
  commit({
    ...canvas.value,
    cards: canvas.value.cards.map((item) => item.id === entry.id ? { ...entry, text: input.value } : item),
  });
}

function removeCard(entry: CanvasCard) {
  if (commit(removeCanvasCard(canvas.value, entry.id))) selected.value = '';
}

function connect() {
  if (!card.value || !connectTo.value) return;
  const edge = {
    id: crypto.randomUUID(),
    from: card.value.id,
    to: connectTo.value,
    label: connectionLabel.value.trim(),
  };
  if (commit({ ...canvas.value, connections: [...canvas.value.connections, edge] })) {
    connectTo.value = '';
    connectionLabel.value = '';
  }
}

function editLabel(id: string, event: Event) {
  const input = event.target as HTMLInputElement;
  const current = canvas.value.connections.find((edge) => edge.id === id);
  if (!current) return;
  const label = input.value.trim();
  if (current.label === label) {
    input.value = current.label;
    return;
  }
  const connections = canvas.value.connections.map((edge) => edge.id === id ? { ...edge, label } : edge);
  if (!commit({ ...canvas.value, connections })) input.value = current.label;
}

function removeConnection(id: string) {
  commit({ ...canvas.value, connections: canvas.value.connections.filter((edge) => edge.id !== id) });
}
</script>

<template>
  <div class="canvas-workspace">
    <ThemeCanvasBoard ref="board" :canvas="canvas" :labels="labels" :selected="selected"
      @select="selected = $event" @move="moveCard" @camera="saveCamera" />
    <aside class="canvas-tools" aria-label="Canvas tools">
      <h2>Add a card</h2>
      <form class="canvas-fields" @submit.prevent="addCard">
        <label>Card type
          <select v-model="addKind">
            <option value="poem">Poem</option>
            <option value="theme">Theme</option>
            <option value="note">Note</option>
          </select>
        </label>
        <label v-if="addKind !== 'note'">{{ addKind === 'poem' ? 'Poem' : 'Theme' }}
          <select v-model="addTarget" :disabled="!targets.length">
            <option value="">{{ targets.length ? 'Choose one' : 'No more available' }}</option>
            <option v-for="target in targets" :key="target.id" :value="target.id">{{ target.label }}</option>
          </select>
        </label>
        <RouterLink v-if="addKind === 'theme' && !themes.length" class="planning-link" to="/collection">
          Add a collection theme
        </RouterLink>
        <button type="submit" class="button primary" :disabled="atCardLimit || (addKind !== 'note' && !addTarget)">
          Add card
        </button>
        <small v-if="atCardLimit">The canvas has reached its 250-card limit.</small>
      </form>

      <label v-if="canvas.cards.length" class="canvas-find">Find a card
        <select :value="selected" @change="jump">
          <option value="" disabled>Choose a card</option>
          <option v-for="entry in canvas.cards" :key="entry.id" :value="entry.id">
            {{ entry.kind }} · {{ labels.get(entry.id)?.slice(0, 90) }}
          </option>
        </select>
      </label>

      <template v-if="card">
        <section class="canvas-selection" :key="card.id">
          <h2>{{ card.kind === 'note' ? 'Note' : labels.get(card.id) }}</h2>
          <textarea v-if="card.kind === 'note'" aria-label="Note text" placeholder="Write your note"
            rows="5" :value="card.text" :maxlength="canvasLimits.note * 2" @input="editNote(card, $event)" />
          <button v-if="card.kind === 'poem'" type="button" class="text-button" @click="emit('open', card.targetId)">
            Open poem
          </button>
          <button type="button" class="text-button" @click="removeCard(card)"
            :aria-label="related.length ? 'Remove card and its connections' : 'Remove card'">
            Remove card
          </button>
        </section>

        <section class="canvas-selection" :key="'connections:' + card.id">
          <h2>Connections</h2>
          <ul v-if="related.length" class="canvas-links">
            <li v-for="edge in related" :key="edge.id">
              <span>{{ labels.get(edge.other)?.slice(0, 90) }}</span>
              <input :value="edge.label" :aria-label="'Relationship to ' + labels.get(edge.other)?.slice(0, 90)"
                :maxlength="canvasLimits.label * 2" @change="editLabel(edge.id, $event)" />
              <button type="button" class="text-button" @click="removeConnection(edge.id)">Remove connection</button>
            </li>
          </ul>
          <form v-if="connectChoices.length && !atConnectionLimit" class="canvas-fields" @submit.prevent="connect">
            <label>Connect to
              <select v-model="connectTo">
                <option value="">Choose a card</option>
                <option v-for="entry in connectChoices" :key="entry.id" :value="entry.id">
                  {{ entry.kind }} · {{ labels.get(entry.id)?.slice(0, 90) }}
                </option>
              </select>
            </label>
            <label>Relationship label
              <input v-model="connectionLabel" placeholder="For example, shares an image"
                :maxlength="canvasLimits.label * 2" />
            </label>
            <button type="submit" class="text-button" :disabled="!connectTo || !connectionLabel.trim()">Connect cards</button>
          </form>
          <small v-else-if="atConnectionLimit">The canvas has reached its 500-connection limit.</small>
          <small v-else-if="!related.length">Add another card to connect to this one.</small>
        </section>
      </template>
      <p v-if="error" class="collection-error" role="alert">{{ error }}</p>
    </aside>
  </div>
</template>
