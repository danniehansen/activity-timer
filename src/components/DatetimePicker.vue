<template>
  <Datepicker
    v-model="date"
    :transitions="false"
    inline
    @update:model-value="onSubmit"
    @update-month-year="resize"
  />
</template>

<script setup lang="ts">
import Datepicker from '@vuepic/vue-datepicker';
import '@vuepic/vue-datepicker/dist/main.css';
import { ref } from 'vue';
import { getTrelloCard, resizeTrelloFrame } from './trello';

const trelloInstance = getTrelloCard();
const initialValue = trelloInstance.arg('initialValue');

const date = ref(initialValue ? new Date(initialValue) : new Date());

const onSubmit = () => {
  /**
   * For some reason we cannot communicate a value back through notifyParent.
   * So to make it possible for us to know the selected value, we use localStorage.
   */
  localStorage.setItem('datetimeValue', date.value.getTime().toString());
  localStorage.setItem(
    'datetimeValueInitially',
    (initialValue ? new Date(initialValue) : new Date()).getTime().toString()
  );

  trelloInstance.notifyParent('done');

  if (trelloInstance.arg('closeOnPick') === '1') {
    trelloInstance.closePopup();
  }
};

const resize = () => {
  setTimeout(resizeTrelloFrame);
};

setTimeout(resizeTrelloFrame);
</script>
