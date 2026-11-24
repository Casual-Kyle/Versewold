<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useWorkspace } from '../composables/useWorkspace';
import AppIcon from '../components/ui/AppIcon.vue';
import FormGuide from '../components/forms/FormGuide.vue';
import type { PoetryForm } from '../domain/forms/types';
import { openSource } from '../services/openSource';
import { catalogStatus, findForms, type CatalogFilter } from '../domain/forms/search';
const { forms, createPoem, formError } = useWorkspace();
const router = useRouter();
const query = ref('');
const selected = ref<PoetryForm>();
const detail = ref<HTMLElement>();
const sourceError = ref('');
const filter = ref<CatalogFilter>('all');
const visibleCount = ref(24);
const filtered = computed(() => findForms(forms.value, query.value, filter.value));
const visible = computed(() => filtered.value.slice(0, visibleCount.value));
watch([query, filter], () => {
  visibleCount.value = 24;
  selected.value = undefined;
});
const supportLabels = {
  structured: 'Structural template',
  guided: 'Guided writing',
  reference: 'Reference',
};
function compose(form: PoetryForm) {
  if (catalogStatus(form) === 'reference') return;
  createPoem('Untitled poem', form.id);
  void router.push('/');
}
async function explore(form: PoetryForm) {
  selected.value = selected.value?.id === form.id ? undefined : form;
  await nextTick();
  detail.value?.scrollIntoView({
    block: 'start',
    behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
  });
}
async function readSource(url: string) {
  try {
    await openSource(url);
    sourceError.value = '';
  } catch (cause) {
    sourceError.value = String(cause);
  }
}
</script>

<template>
  <section class="library-view">
    <div class="view-toolbar">
      <div class="breadcrumbs">
        <AppIcon name="book" :size="16" />
        <span>The form library</span>
      </div>
      <span class="muted">{{ forms.length }} entries to explore</span>
    </div>
    <div class="library-content">
      <header class="library-intro">
        <span class="eyebrow">A LITTLE STRUCTURE. ENDLESS POSSIBILITY.</span>
        <h1>Find a shape for your words.</h1>
        <p>Some thoughts need a sonnet. Others need room to roam.</p>
      </header>
      <label class="search-field">
        <AppIcon name="search" />
        <input
          v-model="query"
          aria-label="Search poetic forms"
          placeholder="Search forms, traditions, or techniques…"
        />
      </label>
      <div class="catalog-controls">
        <label for="catalog-filter" class="sr-only">Template support</label>
        <select id="catalog-filter" v-model="filter">
          <option value="all">All entries</option>
          <option value="structured">Structural templates</option>
          <option value="guided">Guided writing</option>
          <option value="reference">Reference &amp; terminology</option>
        </select>
        <span class="muted" role="status">
          {{ filtered.length }} {{ filtered.length === 1 ? 'match' : 'matches' }}
        </span>
      </div>
      <p v-if="formError" class="inline-notice">{{ formError }}</p>
      <div class="form-catalog">
        <article v-for="form in visible" :key="form.id" class="form-entry">
          <div class="form-entry-heading">
            <span class="eyebrow">{{ form.tags[0] }}</span>
            <AppIcon name="leaf" :size="19" />
          </div>
          <h2>{{ form.name }}</h2>
          <span class="catalog-support" :class="catalogStatus(form)">
            {{ supportLabels[catalogStatus(form)] }}
          </span>
          <p>{{ form.summary }}</p>
          <footer>
            <button class="text-button" @click="explore(form)">
              {{ selected?.id === form.id ? 'Close notes' : 'Explore form' }}
              <AppIcon name="chevron" :size="13" />
            </button>
            <button
              v-if="catalogStatus(form) !== 'reference'"
              class="icon-button"
              :aria-label="`Write a ${form.name} poem`"
              title="Write in this form"
              @click="compose(form)"
            >
              <AppIcon name="pen" :size="17" />
            </button>
          </footer>
        </article>
      </div>
      <button
        v-if="visible.length < filtered.length"
        class="button secondary catalog-more"
        @click="visibleCount += 24"
      >
        Show more · {{ filtered.length - visible.length }} remaining
      </button>
      <p v-if="!filtered.length" class="empty-results">No forms found. Try a different word.</p>
      <section v-if="selected" ref="detail" class="form-detail">
        <div>
          <FormGuide :form="selected" />
          <button
            v-if="catalogStatus(selected) !== 'reference'"
            class="button primary"
            @click="compose(selected)"
          >
            Write in this form
            <AppIcon name="arrow" :size="16" />
          </button>
        </div>
        <div class="source-notes">
          <h3>READ FURTHER</h3>
          <a
            v-for="source in selected.sources"
            :key="source.url"
            :href="source.url"
            target="_blank"
            rel="noopener noreferrer"
            @click.prevent="readSource(source.url)"
          >
            {{ source.title }} ↗
          </a>
          <p v-if="sourceError" class="inline-notice">{{ sourceError }}</p>
          <p>
            Custom forms can be added as JSON templates in your data folder. See Preferences for its
            location.
          </p>
        </div>
      </section>
      <footer class="library-footnote">
        Traditions are a starting point. Your voice makes them yours.
      </footer>
    </div>
  </section>
</template>
