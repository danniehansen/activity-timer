<template>
  <div class="flex flex-column align-items-start pt-4 add-time-container">
    <span class="p-float-label w-full">
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

    <span class="p-float-label w-full">
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

const hours = ref<number>(0);
const minutes = ref<number>(0);

onMounted(() => {
  // Auto-focus the hours input field
  const hoursInput = document.getElementById('f-hours');
  if (hoursInput) {
    hoursInput.focus();
  }
});

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
  gap: 2rem;
}
</style>
