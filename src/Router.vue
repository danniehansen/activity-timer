<template>
  <CapabilityCardBackSection v-if="page === 'card-back-section'" />
  <ChangeEstimate v-else-if="page === 'change-estimate'" />
</template>

<script setup lang="ts">
import { defineAsyncComponent } from 'vue';
import { getTrelloInstance } from './trello';

const CapabilityCardBackSection = defineAsyncComponent({
  loader: () => import('./capabilities/card-back-section/view.vue')
});

const ChangeEstimate = defineAsyncComponent({
  loader: () => import('./capabilities/card-back-section/change_estimate.vue')
});

const t = getTrelloInstance();
const urlSearchParams = new URLSearchParams(window.location.search);

let page: string | null = urlSearchParams.get('page');

if ('args' in t) {
  t.args.forEach((arg) => {
    if (arg && typeof arg.page === 'string') {
      page = arg.page;
    }
  });
}
</script>
