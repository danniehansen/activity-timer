<template>
  <UIRow>
    <UIColumn>
      <UIButton v-if="!isTracking" @click="startTracking">Start timer</UIButton>
      <UIButton v-else @click="stopTracking" :danger="true">Stop timer</UIButton>

      <UIInfo icon="clock">{{ timeSpentDisplay }}</UIInfo>
    </UIColumn>

    <UIColumn v-if="hasEstimates" align-items="right">
      <UIInfo style="cursor: pointer;" @click="changeEstimate">Estimate: {{ ownEstimateDisplay }}</UIInfo>
      <UIInfo style="cursor: pointer;" v-if="ownEstimate != totalEstimate">Total estimate: {{ totalEstimateDisplay }}</UIInfo>
    </UIColumn>
  </UIRow>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import UIInfo from '../../components/UIInfo/UIInfo.vue';
import UIRow from '../../components/UIRow.vue';
import UIButton from '../../components/UIButton.vue';
import UIColumn from '../../components/UIColumn.vue';
import { getMemberId, getTrelloCard } from '../../trello';
import { Card } from '../../components/card';
import { formatTime } from '../../utils/time';
import { hasEstimateFeature } from '../../components/settings';

const isTracking = ref(false);
const trackedTime = ref(0);
const totalEstimate = ref(0);
const ownEstimate = ref(0);
const hasEstimates = ref(false);

let cardId: string | null = null;

const timeSpentDisplay = computed(() => {
  return formatTime(trackedTime.value);
});

const totalEstimateDisplay = computed(() => {
  return formatTime(totalEstimate.value);
});

const ownEstimateDisplay = computed(() => {
  return formatTime(ownEstimate.value);
});

const trelloTick = async () => {
  hasEstimates.value = await hasEstimateFeature();
  const memberId = await getMemberId();
  const card = await getCardModel();
  isTracking.value = await card.isRunning();
  trackedTime.value = await card.getTimeSpent();

  const estimates = await card.getEstimates();
  totalEstimate.value = estimates.totalEstimate;

  const ownEstimateItem = estimates.getByMemberId(memberId);

  if (ownEstimateItem) {
    ownEstimate.value = ownEstimateItem.time;
  } else {
    ownEstimate.value = 0;
  }
};

const getCardModel = async () => {
  const cardId = await getCardId();
  return new Card(cardId);
};

const getCardId = async () => {
  if (cardId) {
    return cardId;
  }

  const card = await getTrelloCard().card('id');
  cardId = card.id;

  return cardId;
};

const startTracking = async () => {
  const card = await getTrelloCard().card('id', 'idList');
  const cardModel = new Card(card.id);
  await cardModel.startTracking(card.idList);
};

const stopTracking = async () => {
  const cardModel = await getCardModel();
  await cardModel.stopTracking();
};

const changeEstimate = async (e: MouseEvent) => {
  const trelloInstance = getTrelloCard();

  await trelloInstance.popup({
    title: 'Change estimate',
    url: './index.html?page=change-estimate',
    height: 120,
    mouseEvent: e
  });
};

getTrelloCard().render(trelloTick);
trelloTick();

// Force clock to update once a minute
setInterval(trelloTick, 1000 * 60);
</script>
