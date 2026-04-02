<template>
  <section class="stage-selector-shell" aria-label="Stage selector">
    <div class="stage-selector-track" role="tablist" aria-label="Workflow stages">
      <button
        v-for="stage in stages"
        :key="stage.id"
        type="button"
        :class="[
          'stage-selector-button wa-button dense',
          stage.id === activeStage ? 'wa-button--primary' : 'wa-button--sunken',
        ]"
        :data-stage-id="stage.id"
        role="tab"
        :aria-selected="String(stage.id === activeStage)"
        :data-stage-active="String(stage.id === activeStage)"
        @click="$emit('select-stage', stage.id)"
      >
        {{ stage.label }}
      </button>
    </div>
  </section>
</template>

<script setup>
defineProps({
  activeStage: {
    type: String,
    required: true,
  },
});

defineEmits(["select-stage"]);

const stages = [
  { id: "workspace", label: "Workspace" },
  { id: "findings", label: "Findings" },
  { id: "deepdive", label: "Deep Dive" },
  { id: "support", label: "Support" },
];
</script>

<style scoped>
.stage-selector-shell {
  display: flex;
  justify-content: center;
}

.stage-selector-track {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.25rem;
  border-radius: 9999px;
  background: var(--surface-sunken);
  border: 1px solid var(--border);
}

.stage-selector-button {
  border-radius: 9999px;
  letter-spacing: 0.04em;
}
</style>
