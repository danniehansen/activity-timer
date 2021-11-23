<template>
  <div class="checkbox">
    <input v-model="stopOnMove" type="checkbox" id="stop-on-move" />
    <label for="stop-on-move">Stop active tracking when card moves</label>
  </div>

  <i>Other power-up settings exists for administrators on the power-up settings page</i>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { hasSettingStopOnMove, setSettingStopOnMove } from '../components/settings';

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