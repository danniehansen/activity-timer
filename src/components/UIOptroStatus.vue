<template>
  <div
    class="badge"
    :class="{
      'badge--pro': !loading && isPro,
      'badge--free': !loading && !isPro
    }"
  >
    <template v-if="!loading && isPro">
      You're on the Pro Plan.
      <a href="https://optro.cloud/account" target="_blank" rel="noreferrer"
        >Manage</a
      >
    </template>

    <template v-else-if="!loading && !isPro">
      You're on the Free Plan
      <a
        :href="`https://www.optro.cloud/app/${powerupId}`"
        target="_blank"
        rel="noreferrer"
        >Upgrade</a
      >
    </template>

    <template v-else> Loading... </template>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { getSubscriptionStatus } from './optro';
import { getPowerupId } from './trello';

const loading = ref(true);
const isPro = ref(false);
const powerupId = getPowerupId();

async function refresh() {
  loading.value = true;
  isPro.value = await getSubscriptionStatus();
  loading.value = false;
}

refresh();
</script>

<style lang="scss" scope>
.badge {
  text-align: center;
  color: white;
  border-radius: 4px;
  padding: 8px;

  &--pro {
    background-color: #42526e;
  }

  &--free {
    background-color: #5aac44;
  }

  a {
    cursor: pointer;
    margin-left: 6px;
    text-decoration: underline;
    color: white;

    &:hover {
      color: white;
      opacity: 0.8;
    }
  }
}
</style>
