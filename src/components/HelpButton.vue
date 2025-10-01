<template>
  <Button
    :class="['help-button', { 'help-button-subtle': subtle }]"
    :icon="icon"
    :label="label"
    :text="subtle"
    :outlined="!subtle"
    :severity="subtle ? 'secondary' : 'info'"
    size="small"
    :title="title"
    @click="handleClick"
  />
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import Button from 'primevue/button';
import { isActiveUser, markFeatureAsSeen } from './onboarding';
import { getTrelloCard } from './trello';

interface Props {
  feature:
    | 'cardBackSection'
    | 'settings'
    | 'estimates'
    | 'manualTime'
    | 'calendar'
    | 'exports'
    | 'notifications'
    | 'autoTimer';
  title: string;
  icon?: string;
  showLabel?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  icon: 'pi pi-question-circle',
  showLabel: false
});

const subtle = ref(false);

const label = computed(() => {
  if (!props.showLabel) return '';
  return subtle.value ? '' : 'Help';
});

onMounted(async () => {
  // Check if user is already familiar with this feature
  subtle.value = await isActiveUser(props.feature);
});

const handleClick = async () => {
  // Mark feature as seen
  await markFeatureAsSeen(props.feature);

  // After marking, the button becomes subtle
  subtle.value = true;

  // Open Trello modal
  const t = getTrelloCard();
  await t.modal({
    url: `./index.html?page=help`,
    args: { feature: props.feature },
    height: 500
  });
};
</script>

<style scoped>
.help-button {
  transition: all 0.2s ease;
}

.help-button-subtle {
  opacity: 0.6;
}

.help-button-subtle:hover {
  opacity: 1;
}

/* Make sure help button doesn't take too much space */
.help-button :deep(.p-button-label) {
  font-size: 0.875rem;
}
</style>
