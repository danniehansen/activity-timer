<template>
  <label>Estimate (in hours):</label>
  <input v-model="estimate" type="text" placeholder="0" />

  <UIButton @click="save">Save estimate</UIButton>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { Card } from '../../components/card';
import { Estimate } from '../../components/estimate';
import UIButton from '../../components/UIButton.vue';
import { getMemberId, getTrelloCard, resizeTrelloFrame } from '../../components/trello';

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
    estimates.add(
      new Estimate(
        memberId,
        estimate.value * 3600
      )
    );
  }

  await estimates.save();
  await getTrelloCard().closePopup();
};

fetchEstimate();

setTimeout(resizeTrelloFrame);
</script>