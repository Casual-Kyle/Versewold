<script setup lang="ts">
import { computed, onMounted, onBeforeUnmount, ref } from 'vue';
import { useWorkspace } from '../composables/useWorkspace';
import { structureIssues } from '../domain/forms/structure';
import AppIcon from '../components/ui/AppIcon.vue';
import CreateDialog from '../components/ui/CreateDialog.vue';
import PoemEditor from '../components/editor/PoemEditor.vue';
import FormGuide from '../components/forms/FormGuide.vue';
import LineInspector from '../components/forms/LineInspector.vue';
import FormPicker from '../components/forms/FormPicker.vue';
import FormMap from '../components/forms/FormMap.vue';
import { usePreferences } from '../composables/usePreferences';
import { isPoem } from '../domain/manuscript/structure';
import { pdfPrinting } from '../services/pdfExport';
const { preferences } = usePreferences();

const { activeProject, activePoem, activeForm, forms, body, createProject, createPoem } =
  useWorkspace();
const creating = ref(false);
const focus = ref(false);
const inspectedLine = ref(1);
const editor = ref<InstanceType<typeof PoemEditor>>();
const issues = computed(() =>
  activeForm.value ? structureIssues(activeForm.value, body.value) : [],
);
function begin(title: string) {
  createProject(title);
  createPoem('Untitled poem');
  creating.value = false;
}

function searchShortcut(event: KeyboardEvent) {
  if (
    event.defaultPrevented ||
    pdfPrinting.value ||
    !activePoem.value ||
    document.querySelector('dialog[open]')
  )
    return;
  if ((event.ctrlKey || event.metaKey) && !event.altKey) {
    const key = event.key.toLowerCase();
    if (key === 'f' || key === 'h') {
      event.preventDefault();
      void editor.value?.openSearch(key === 'h');
    } else if (key === 'g') {
      event.preventDefault();
      editor.value?.findNext(event.shiftKey ? -1 : 1);
    }
  } else if (event.key === 'F3' && !event.ctrlKey && !event.metaKey && !event.altKey) {
    event.preventDefault();
    editor.value?.findNext(event.shiftKey ? -1 : 1);
  }
}
onMounted(() => globalThis.addEventListener('keydown', searchShortcut));
onBeforeUnmount(() => globalThis.removeEventListener('keydown', searchShortcut));
</script>

<template>
  <section class="desk-view" :class="{ 'focus-mode': focus }">
    <header class="view-toolbar">
      <div class="breadcrumbs">
        <AppIcon name="folder" :size="16" />
        <span>{{ activeProject?.title ?? 'Your writing desk' }}</span>
        <AppIcon name="chevron" :size="12" />
        <strong>{{ activePoem?.title || 'A fresh page' }}</strong>
      </div>
      <div v-if="activePoem" class="toolbar-actions">
        <button
          class="text-button"
          title="Find and replace in current poem (Ctrl+F / Ctrl+H)"
          @click="editor?.openSearch()"
        >
          <AppIcon name="search" :size="15" />
          Find &amp; replace
        </button>
        <button
          v-if="isPoem(activePoem)"
          class="icon-button"
          :aria-pressed="focus"
          :aria-label="focus ? 'Leave focus mode' : 'Focus on writing'"
          :title="focus ? 'Leave focus mode' : 'Focus on writing'"
          @click="focus = !focus"
        >
          <AppIcon name="focus" />
        </button>
        <button
          v-if="isPoem(activePoem)"
          class="text-button guidance-toggle"
          :aria-pressed="preferences.writing.showGuidance"
          @click="preferences.writing.showGuidance = !preferences.writing.showGuidance"
        >
          Form guide
          <span class="toggle-dot" :class="{ on: preferences.writing.showGuidance }" />
        </button>
        <button
          v-if="isPoem(activePoem)"
          class="text-button guidance-toggle strict-toggle"
          :aria-pressed="preferences.writing.strictFormatting"
          title="Highlight lines that miss count or line-layout targets. English syllables are estimates."
          @click="preferences.writing.strictFormatting = !preferences.writing.strictFormatting"
        >
          Strict
          <span class="toggle-dot" :class="{ on: preferences.writing.strictFormatting }" />
        </button>
      </div>
    </header>
    <div
      v-if="activePoem"
      class="desk-content"
      :class="{
        'without-guide': !preferences.writing.showGuidance || focus || !isPoem(activePoem),
      }"
    >
      <PoemEditor ref="editor" @inspect="inspectedLine = $event" />
      <aside
        v-if="preferences.writing.showGuidance && !focus && isPoem(activePoem)"
        class="inspector"
      >
        <div class="inspector-heading">
          <AppIcon name="leaf" :size="17" />
          <span>FORM INSPECTOR</span>
        </div>
        <FormPicker v-model="activePoem.formId" :forms="forms" />
        <template v-if="activeForm">
          <LineInspector
            :form="activeForm"
            :body="body"
            :source-line="inspectedLine"
            :strict="preferences.writing.strictFormatting"
            @insert-refrain="(line, text) => editor?.replaceLine(line, text)"
          />
          <FormMap
            :form="activeForm"
            :body="body"
            :source-line="inspectedLine"
            @jump="(line) => editor?.focusLine(line)"
          />
          <details class="full-form-guide">
            <summary>Full form &amp; craft notes</summary>
            <FormGuide :form="activeForm" />
          </details>
        </template>
        <p v-else class="inline-notice">
          This poem’s custom template is missing. Your text is safe; restore its JSON file or choose
          another form.
        </p>
        <section v-if="issues.length" class="structure-feedback">
          <h3>STRUCTURE NOTES</h3>
          <p v-for="issue in issues" :key="issue">{{ issue }}</p>
        </section>
      </aside>
    </div>
    <div v-else class="welcome-desk">
      <div class="welcome-ornament">
        <img src="/versewold.svg" alt="" width="106" height="106" />
      </div>
      <span class="eyebrow">WELCOME TO YOUR STUDY</span>
      <h1>
        A quiet place
        <br />
        to find your words.
      </h1>
      <p>
        Gather your poems. Explore their forms.
        <br />
        Give a passing thought somewhere to stay.
      </p>
      <button v-if="!activeProject" class="button primary" @click="creating = true">
        Begin a collection
        <AppIcon name="arrow" :size="16" />
      </button>
      <button v-else class="button primary" @click="createPoem('Untitled poem')">
        Write your first poem
        <AppIcon name="arrow" :size="16" />
      </button>
      <RouterLink to="/forms" class="welcome-library">
        Or wander through the form library
        <AppIcon name="chevron" :size="13" />
      </RouterLink>
      <div class="welcome-footnote">
        <span />
        THE CRAFT OF VERSE
        <span />
      </div>
    </div>
    <CreateDialog v-if="creating" kind="project" @close="creating = false" @create="begin" />
  </section>
</template>
