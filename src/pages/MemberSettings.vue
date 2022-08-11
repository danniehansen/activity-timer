<template>
  <UIOptroStatus />

  <UICheckbox
    v-model="stopOnMove"
    id="stop-on-move"
    label="Stop active tracking when card moves"
  />

  <i
    >Other power-up settings exists for administrators on the power-up settings
    page</i
  >

  <a v-if="subscribeForNews" :href="subscribeForNews" target="_blank"
    >Subscribe to updates about Activity timer</a
  >
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import {
  hasSettingStopOnMove,
  setSettingStopOnMove
} from '../components/settings';
import { resizeTrelloFrame } from '../components/trello';
import UICheckbox from '../components/UICheckbox.vue';
import UIOptroStatus from '../components/UIOptroStatus.vue';

const subscribeForNews = ref('');
const stopOnMove = ref(false);

const trelloTick = async () => {
  stopOnMove.value = await hasSettingStopOnMove();

  if (typeof import.meta.env.VITE_MAILCHIMP_LINK === 'string') {
    subscribeForNews.value = import.meta.env.VITE_MAILCHIMP_LINK;
  }

  setTimeout(resizeTrelloFrame);
};

watch(stopOnMove, () => {
  setSettingStopOnMove(stopOnMove.value);
});

trelloTick();
</script>

<style lang="scss" scoped>
.checkbox {
  padding: 0 0 0 22px;
  position: relative;

  input {
    position: absolute;
    left: 0;
    top: 2px;
    margin: 0;
    box-shadow: inset 0 0 0 2px #dfe1e6 !important;

    &:checked {
      box-shadow: inset 0 0 0 2px #172b4d !important;
    }
  }
}
</style>

<style lang="scss" scoped>
a {
  display: inline-block;
  font-size: 12px;
  padding: 3px 6px;
  background-color: rgba(9, 30, 66, 0.04);
  text-decoration: none;
  border-radius: 3px;
  margin-top: 15px;
}
</style>
