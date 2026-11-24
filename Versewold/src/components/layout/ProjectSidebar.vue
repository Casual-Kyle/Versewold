<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useWorkspace } from '../../composables/useWorkspace';
import AppIcon from '../ui/AppIcon.vue';
import CreateDialog from '../ui/CreateDialog.vue';
import ProjectFilesDialog from './ProjectFilesDialog.vue';
import { useProjectFiles } from '../../composables/useProjectFiles';
import ProjectOutline from './ProjectOutline.vue';
const files = useProjectFiles();

const {
  workspace,
  activeProject,
  activePoem,
  forms,
  selectProject,
  selectPoem,
  createProject,
  createPoem,
} = useWorkspace();
const router = useRouter();
const creating = ref<'project' | 'poem' | null>(null);
function create(title: string) {
  if (creating.value === 'project') {
    createProject(title);
    createPoem('Untitled poem');
  } else createPoem(title);
  creating.value = null;
  void router.push('/');
}
function openPoem(id: string) {
  selectPoem(id);
  void router.push('/');
}
</script>

<template>
  <aside class="project-sidebar">
    <div class="sidebar-heading">
      <span class="eyebrow">YOUR LIBRARY</span>
      <button
        class="icon-button"
        aria-label="New project"
        title="New project"
        @click="creating = 'project'"
      >
        <AppIcon name="plus" :size="17" />
      </button>
    </div>
    <label class="sr-only" for="project-select">Current project</label>
    <div v-if="workspace.projects.length" class="project-select">
      <AppIcon name="folder" />
      <select
        id="project-select"
        :value="activeProject?.id"
        @change="selectProject(($event.target as HTMLSelectElement).value)"
      >
        <option v-for="project in workspace.projects" :key="project.id" :value="project.id">
          {{ project.title }}
        </option>
      </select>
    </div>
    <button v-else class="new-collection" @click="creating = 'project'">
      <AppIcon name="folder" />
      Create a project
      <AppIcon name="plus" :size="15" />
    </button>
    <div class="sidebar-section">
      <span>Manuscript</span>
      <span class="count">{{ activeProject?.poems.length ?? 0 }}</span>
    </div>
    <ProjectOutline @open="openPoem" />
    <button class="text-button add-poem" :disabled="!activeProject" @click="creating = 'poem'">
      <AppIcon name="plus" :size="16" />
      New poem
    </button>
    <div class="sidebar-file-actions">
      <button
        class="text-button"
        title="Save pending writing and settings (Ctrl+S)"
        @click="files.run('save')"
      >
        <AppIcon name="save" :size="16" />
        Save now
      </button>
      <button class="text-button" @click="files.opened.value = true">
        <AppIcon name="export" :size="16" />
        Files &amp; export
      </button>
    </div>
    <RouterLink class="settings-link" to="/settings">
      <AppIcon name="settings" :size="17" />
      Preferences
    </RouterLink>
    <CreateDialog v-if="creating" :kind="creating" @close="creating = null" @create="create" />
    <ProjectFilesDialog v-if="files.opened.value" @close="files.opened.value = false" />
  </aside>
</template>
