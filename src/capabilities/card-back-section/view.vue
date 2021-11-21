<template>
  <UIRow>
    <UIColumn>
      <UIButton v-if="!isTracking" @click="startTracking">Start timer</UIButton>
      <UIButton v-else @click="stopTracking" :danger="true">Stop timer</UIButton>

      <UIInfo icon="clock">1h 55m</UIInfo>
    </UIColumn>

    <UIColumn align-items="right">
      <UIInfo>Estimate: 3h</UIInfo>
    </UIColumn>
  </UIRow>
</template>

<script setup lang="ts">
import UIInfo from '../../components/UIInfo/UIInfo.vue';
import UIRow from '../../components/UIRow.vue';
import UIButton from '../../components/UIButton.vue';
import UIColumn from '../../components/UIColumn.vue';
import { getTrelloCard } from '../../trello';
import { Card } from '../../components/card';
import { ref } from 'vue';

const isTracking = ref(false);
let cardId: string | null = null;

const trelloTick = async () => {
  const card = await getCardModel();
  isTracking.value = await card.isRunning();
};

const getCardModel = async () => {
  const cardId = await getCardId();
  return new Card(cardId);
};

const getCardId = async () => {
  if (cardId) {
    return cardId;
  }

  const card = await getTrelloCard().card('id', 'idList');
  cardId = card.id;

  return cardId;
};

const startTracking = async () => {
  const card = await getTrelloCard().card('id', 'idList');
  const cardModel = new Card(card.id);
  await cardModel.startTracking(card.idList);
};

const stopTracking = async () => {
  const card = await getTrelloCard().card('id');
  const cardModel = new Card(card.id);
  await cardModel.stopTracking();
};

getTrelloCard().render(trelloTick);
trelloTick();
</script>
