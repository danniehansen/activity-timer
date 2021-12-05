<template>
  <UIRow>
    <div>
      <UIButton v-if="!isTracking" @click="startTracking">Start timer</UIButton>
      <UIButton v-else @click="stopTracking" :danger="true">Stop timer</UIButton>

      <UIInfo icon="clock">{{ timeSpentDisplay }}</UIInfo>
    </div>

    <div v-if="hasEstimates">
      <UIInfo style="cursor: pointer;" @click="changeEstimate">Estimate: {{ ownEstimateDisplay }}</UIInfo>
      <UIInfo style="cursor: pointer;" v-if="ownEstimate != totalEstimate" @click="viewEstimates">Total estimate: {{ totalEstimateDisplay }}</UIInfo>
    </div>
  </UIRow>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import UIInfo from '../../components/UIInfo/UIInfo.vue';
import UIRow from '../../components/UIRow.vue';
import UIButton from '../../components/UIButton.vue';
import { getMemberId, getTrelloCard, resizeTrelloFrame } from '../../components/trello';
import { Card } from '../../components/card';
import { formatTime } from '../../utils/formatting';
import { hasEstimateFeature } from '../../components/settings';
import { Trello } from '../../types/trello';

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
  await cardModel.stopTracking(getTrelloCard());
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

const viewEstimates = async (e: MouseEvent) => {
  const trelloInstance = getTrelloCard();

  trelloInstance.popup({
    mouseEvent: e,
    title: 'Estimates',
    items: async function (t) {
      const cardModel = await getCardModel();
      const items: Trello.PowerUp.PopupOptionsItem[] = [];
      const estimates = await cardModel.getEstimates();
      const board = await t.board('members');

      const membersFound = board.members.map((member) => member.id);

      board.members.sort((a, b) => {
        const nameA = (a.fullName ?? '').toUpperCase();
        const nameB = (b.fullName ?? '').toUpperCase();

        if (nameA < nameB) {
          return -1;
        }
        if (nameA > nameB) {
          return 1;
        }

        return 0;
      }).forEach((member) => {
        const memberEstimates = estimates.items.filter((estimate) => {
          return estimate.memberId === member.id;
        });

        let memberEstimate = 0;

        memberEstimates.forEach((estimate) => {
          memberEstimate += estimate.time;
        });

        if (memberEstimate > 0) {
          items.push({
            text: member.fullName + (member.fullName !== member.username ? ' (' + member.username + ')' : '') + ': ' + formatTime(memberEstimate),
            callback: async (t: Trello.PowerUp.IFrame) => {
              return t.popup({
                type: 'confirm',
                title: 'Delete estimate?',
                message: 'Are you sure you wish to delete this estimate?',
                confirmText: 'Yes, delete',
                onConfirm: async (t) => {
                  estimates.removeByMemberId(member.id);
                  await estimates.save();
                  return t.closePopup();
                },
                confirmStyle: 'danger',
                cancelText: 'No, cancel'
              });
            }
          });
        }
      });

      estimates.items.forEach((estimate, estimateIndex) => {
        if (!membersFound.includes(estimate.memberId)) {
          items.push({
            text: 'N/A: ' + formatTime(estimate.time),
            callback: async (t) => {
              return t.popup({
                type: 'confirm',
                title: 'Delete estimate?',
                message: 'Are you sure you wish to delete this estimate?',
                confirmText: 'Yes, delete',
                onConfirm: async (t) => {
                  estimates.removeByMemberId(estimate.memberId);
                  await estimates.save();
                  return t.closePopup();
                },
                confirmStyle: 'danger',
                cancelText: 'No, cancel'
              });
            }
          });
        }
      });

      items.push({
        text: 'Clear estimates',
        callback: async (t: Trello.PowerUp.IFrame) => {
          return t.popup({
            type: 'confirm',
            title: 'Are you sure?',
            message: '',
            confirmText: 'Yes, clear estimates',
            onConfirm: async (t) => {
              estimates.clear();
              await estimates.save();
              return t.closePopup();
            },
            confirmStyle: 'danger',
            cancelText: 'No, cancel'
          });
        }
      });

      return items;
    }
  });
};

getTrelloCard().render(trelloTick);
trelloTick();

// Force clock to update once a minute
setInterval(trelloTick, 1000 * 60);
</script>