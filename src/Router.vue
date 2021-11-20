<template>
  <capabilityCardBackSection v-if="page === 'card-back-section'" />
</template>

<script setup lang="ts">
import { defineAsyncComponent } from '@vue/runtime-core';
import { getTrelloInstance } from './trello';

const capabilityCardBackSection = defineAsyncComponent({
  loader: () => import('./capabilities/card-back-section/view.vue')
});

const t = getTrelloInstance();
let page: string | null = null;

if ('args' in t) {
  t.args.forEach((arg) => {
    if (typeof arg.page === 'string') {
      page = arg.page;
    }
  });
}
</script>
