<template>
  <UICheckbox v-model="stopOnMove" id="stop-on-move" label="Stop active tracking when card moves" />

  <i>Other power-up settings exists for administrators on the power-up settings page</i>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { hasSettingStopOnMove, setSettingStopOnMove } from '../components/settings';
import UICheckbox from '../components/UICheckbox.vue';

const stopOnMove = ref(false);

const trelloTick = async () => {
  stopOnMove.value = await hasSettingStopOnMove();
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