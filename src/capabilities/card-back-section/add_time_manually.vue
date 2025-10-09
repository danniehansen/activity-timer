<template>
  <div class="flex flex-column align-items-start pt-4 add-time-container">
    <!-- Header with button and help -->
    <div class="w-full flex justify-content-between align-items-center">
      <Button
        label="Log Exact Times"
        icon="pi pi-calendar-clock"
        outlined
        size="small"
        @click="openAddTimeRange"
      />
      <HelpButton
        feature="manualTime"
        title="Learn about adding time manually"
      />
    </div>

    <!-- Hours and Minutes inputs side by side -->
    <div class="w-full flex flex-row input-row">
      <span class="p-float-label input-half">
        <InputNumber
          id="f-hours"
          v-model="hours"
          placeholder="0"
          class="w-full"
          :format="false"
          :use-grouping="false"
          :min-fraction-digits="0"
          :max-fraction-digits="2"
          :min="0"
          thousand-separator=""
          locale="en-GB"
        />
        <label for="f-hours">Hours</label>
      </span>

      <span class="p-float-label input-half">
        <InputNumber
          id="f-minutes"
          v-model="minutes"
          placeholder="0"
          class="w-full"
          :format="false"
          :use-grouping="false"
          :min-fraction-digits="0"
          :max-fraction-digits="0"
          :min="0"
          :max="59"
          thousand-separator=""
          locale="en-GB"
        />
        <label for="f-minutes">Minutes</label>
      </span>
    </div>

    <Button label="Add time" class="w-full" @click="save" />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { Card } from '../../components/card';
import { Range } from '../../components/range';
import {
  getMemberId,
  getTrelloCard,
  resizeTrelloFrame
} from '../../components/trello';
import HelpButton from '../../components/HelpButton.vue';

const hours = ref<number>(0);
const minutes = ref<number>(0);

onMounted(() => {
  // Auto-focus the hours input field
  setTimeout(() => {
    const hoursInput = document.querySelector('#f-hours input');
    if (hoursInput) {
      (hoursInput as HTMLInputElement).focus();
    }
  }, 100);
});

const openAddTimeRange = async () => {
  const trello = getTrelloCard();
  const memberId = await getMemberId();
  const card = await trello.card('id');

  await trello.modal({
    title: 'Add Time Range',
    url: `./index.html?page=add-time-range&memberId=${memberId}&cardId=${card.id}`,
    fullscreen: false,
    height: 650
  });

  // Close the popup after the modal is closed
  // This refreshes the data in the parent view
  await trello.closePopup();
};

const save = async () => {
  if (!hours.value && !minutes.value) {
    await getTrelloCard().alert({
      message: 'Please enter hours or minutes',
      duration: 3
    });
    return;
  }

  const memberId = await getMemberId();
  const card = await getTrelloCard().card('id');
  const cardModel = new Card(card.id);
  const ranges = await cardModel.getRanges();

  const totalSeconds = (hours.value || 0) * 3600 + (minutes.value || 0) * 60;
  const endTime = Math.floor(Date.now() / 1000);
  const startTime = endTime - totalSeconds;

  ranges.add(new Range(memberId, startTime, endTime));

  await ranges.save();
  await getTrelloCard().closePopup();
};

setTimeout(resizeTrelloFrame);
</script>

<style scoped>
.add-time-container {
  gap: 1.5rem;
}

/* Ensure button has proper spacing */
.add-time-container > div:first-child {
  margin-bottom: 0.5rem;
}

/* Input row with gap */
.input-row {
  gap: 1rem;
}

/* Input fields at 50% width each with gap accounted for */
.input-half {
  flex: 1;
  min-width: 0;
}

.input-half :deep(.p-inputnumber) {
  width: 100%;
}

.input-half :deep(.p-inputtext) {
  width: 100%;
}
</style>
