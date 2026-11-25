<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useWorkspace } from '../composables/useWorkspace';
import AppIcon from '../components/ui/AppIcon.vue';
import CreateDialog from '../components/ui/CreateDialog.vue';
import CollectionOverview from '../components/collection/CollectionOverview.vue';

const { workspace, activeProject, createProject, selectPoem, desktop } = useWorkspace();
const router = useRouter();
const creating = ref(false);
function create(title: string) {
  createProject(title);
  creating.value = false;
}
function openPoem(id: string) {
  selectPoem(id);
  void router.push('/');
}
</script>

<template>
  <section class="collection-view">
    <header class="view-toolbar">
      <div class="breadcrumbs">
        <AppIcon name="folder" :size="16" />
        <span>Collection overview</span>
        <AppIcon v-if="activeProject" name="chevron" :size="12" />
        <strong v-if="activeProject">{{ activeProject.title }}</strong>
      </div>
      <div class="canvas-nav">
        <RouterLink v-if="activeProject" to="/collection/canvas" class="text-button">
          Theme canvas
        </RouterLink>
        <RouterLink v-if="activeProject" to="/collection/words" class="text-button">
          Word explorer
        </RouterLink>
        <RouterLink to="/" class="text-button">Back to writing</RouterLink>
      </div>
    </header>
    <div class="collection-scroll">
      <template v-if="activeProject">
        <CollectionOverview
          :key="activeProject.id"
          :project="activeProject"
          :projects="workspace.projects"
          :documents="workspace.documents"
          @open="openPoem"
        />
        <p class="collection-save-note">
          {{
            desktop
              ? 'Collection details save automatically. Use Rename project to apply a new name.'
              : 'Browser preview — changes are temporary.'
          }}
        </p>
      </template>
      <div v-else class="collection-empty">
        <h1>A place for your collection.</h1>
        <p>Create a project to gather your poems and plan what connects them.</p>
        <button class="button primary" @click="creating = true">Create a project</button>
      </div>
    </div>
    <CreateDialog v-if="creating" kind="project" @close="creating = false" @create="create" />
  </section>
</template>
