<template>
  <div class="flex flex-column gap-3 align-items-start pt-4">
    <span class="p-float-label">
      <InputNumber
        id="f-estimate"
        v-model="estimate"
        placeholder="0"
        class="w-full"
        :format="false"
        :use-grouping="false"
        :min-fraction-digits="0"
        :max-fraction-digits="2"
        thousand-separator=""
      />
      <label for="f-estimate">Estimate (in hours)</label>
    </span>

    <Button label="Save estimate" @click="save" />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { Card } from '../../components/card';
import { Estimate } from '../../components/estimate';
import {
  getMemberId,
  getTrelloCard,
  resizeTrelloFrame
} from '../../components/trello';

const estimate = ref<number | null>(null);

const fetchEstimate = async () => {
  const memberId = await getMemberId();
  const card = await getTrelloCard().card('id');
  const cardModel = new Card(card.id);
  const estimates = await cardModel.getEstimates();
  const estimateItem = estimates.getByMemberId(memberId);

  if (estimateItem?.time) {
    estimate.value = estimateItem.time / 3600;
  }
};

const save = async () => {
  const memberId = await getMemberId();
  const card = await getTrelloCard().card('id');
  const cardModel = new Card(card.id);
  const estimates = await cardModel.getEstimates();

  estimates.removeByMemberId(memberId);

  if (estimate.value) {
    estimates.add(new Estimate(memberId, estimate.value * 3600));
  }

  await estimates.save();
  await getTrelloCard().closePopup();
};

fetchEstimate();

setTimeout(resizeTrelloFrame);
</script>
