<template>
  <div class="estimates-wrapper">
    <div class="flex flex-column align-items-start estimates-container">
      <!-- Header with help button -->
      <div class="estimate-header w-full">
        <HelpButton feature="estimates" title="Learn about estimates" />
      </div>

      <!-- Your Estimate Input -->
      <div class="estimate-input-section w-full">
        <h3 class="section-title">Your Estimate</h3>
        <div class="input-wrapper w-full">
          <span class="p-float-label w-full">
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
              locale="en-GB"
            />
            <label for="f-estimate">Estimate (in hours)</label>
          </span>
        </div>

        <Button label="Save estimate" class="w-full mt-2" @click="save" />
      </div>

      <!-- All Estimates List -->
      <div v-if="allEstimates.length > 0" class="all-estimates-section w-full">
        <div class="section-header">
          <h3 class="section-title">All Estimates</h3>
          <Button
            v-if="isAdmin"
            label="Clear all"
            severity="danger"
            text
            size="small"
            @click="confirmClearAll"
          />
        </div>

        <div class="estimates-list">
          <div
            v-for="est in allEstimates"
            :key="est.memberId"
            class="estimate-item"
          >
            <div class="estimate-content">
              <span class="member-name">{{ est.memberName }}</span>
              <span class="estimate-time">{{ est.displayTime }}</span>
            </div>
            <Button
              v-if="isAdmin || est.memberId === currentMemberId"
              icon="pi pi-trash"
              severity="danger"
              text
              size="small"
              @click="deleteEstimate(est.memberId)"
            />
          </div>
        </div>

        <div class="total-estimate">
          <strong>Total Estimate:</strong>
          <span>{{ totalEstimateDisplay }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { Card } from '../../components/card';
import { Estimate } from '../../components/estimate';
import {
  getMemberId,
  getTrelloCard,
  resizeTrelloFrame
} from '../../components/trello';
import { formatTime } from '../../utils/formatting';
import { Trello } from '../../types/trello';
import HelpButton from '../../components/HelpButton.vue';

interface EstimateDisplay {
  memberId: string;
  memberName: string;
  displayTime: string;
  time: number;
}

const estimate = ref<number | null>(null);
const allEstimates = ref<EstimateDisplay[]>([]);
const totalEstimate = ref(0);
const currentMemberId = ref('');
const isAdmin = ref(false);

const totalEstimateDisplay = computed(() => {
  return formatTime(totalEstimate.value);
});

const fetchEstimates = async () => {
  const memberId = await getMemberId();
  currentMemberId.value = memberId;

  const card = await getTrelloCard().card('id');
  const cardModel = new Card(card.id);
  const estimates = await cardModel.getEstimates();
  const board = await getTrelloCard().board('members', 'memberships');

  // Check if current user is admin
  const currentMember = await getTrelloCard().member('id');
  const membership = board.memberships?.find(
    (m) => m.idMember === currentMember.id
  );
  isAdmin.value = membership?.memberType === 'admin';

  // Get current user's estimate
  const estimateItem = estimates.getByMemberId(memberId);
  if (estimateItem?.time) {
    estimate.value = estimateItem.time / 3600;
  }

  // Calculate total
  totalEstimate.value = estimates.totalEstimate;

  // Build list of all estimates with member names
  const membersMap = new Map<string, Trello.PowerUp.Member>();
  board.members.forEach((member) => {
    membersMap.set(member.id, member);
  });

  allEstimates.value = estimates.items
    .map((est) => {
      const member = membersMap.get(est.memberId);
      return {
        memberId: est.memberId,
        memberName: member
          ? member.fullName || member.username || 'Unknown'
          : 'Former member',
        displayTime: formatTime(est.time),
        time: est.time
      };
    })
    .sort((a, b) => a.memberName.localeCompare(b.memberName));

  setTimeout(resizeTrelloFrame, 100);
};

const save = async () => {
  const card = await getTrelloCard().card('id');
  const cardModel = new Card(card.id);
  const estimates = await cardModel.getEstimates();

  estimates.removeByMemberId(currentMemberId.value);

  if (estimate.value) {
    estimates.add(new Estimate(currentMemberId.value, estimate.value * 3600));
  }

  await estimates.save();

  // Refresh the list
  await fetchEstimates();

  await getTrelloCard().alert({
    message: 'Estimate saved successfully',
    display: 'success',
    duration: 2
  });
};

const deleteEstimate = async (memberId: string) => {
  // Only allow deleting own estimate, or any estimate if admin
  if (memberId !== currentMemberId.value && !isAdmin.value) {
    await getTrelloCard().alert({
      message: 'You can only delete your own estimate',
      display: 'error',
      duration: 3
    });
    return;
  }

  const card = await getTrelloCard().card('id');
  const cardModel = new Card(card.id);
  const estimates = await cardModel.getEstimates();

  estimates.removeByMemberId(memberId);
  await estimates.save();

  // If deleted own estimate, clear the input
  if (memberId === currentMemberId.value) {
    estimate.value = null;
  }

  // Refresh the list
  await fetchEstimates();

  await getTrelloCard().alert({
    message: 'Estimate deleted',
    display: 'success',
    duration: 2
  });
};

const confirmClearAll = async (e: MouseEvent) => {
  getTrelloCard().popup({
    type: 'confirm',
    title: 'Clear all estimates?',
    message: 'This will remove all estimates from all members. Are you sure?',
    confirmText: 'Yes, clear all',
    confirmStyle: 'danger',
    mouseEvent: e,
    onConfirm: async (t) => {
      const card = await getTrelloCard().card('id');
      const cardModel = new Card(card.id);
      const estimates = await cardModel.getEstimates();

      estimates.clear();
      await estimates.save();

      estimate.value = null;
      await fetchEstimates();

      await getTrelloCard().alert({
        message: 'All estimates cleared',
        display: 'success',
        duration: 2
      });

      return t.closePopup();
    },
    cancelText: 'Cancel'
  });
};

fetchEstimates();
</script>

<style scoped>
.estimates-wrapper {
  display: flex;
  justify-content: center;
  width: 100%;
  padding: 1.5rem 1rem;
}

.estimates-container {
  gap: 1.5rem;
  max-width: 500px;
  width: 100%;
}

.estimate-input-section {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.section-title {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
  color: #172b4d;
  padding-bottom: 0.25rem;
}

html[data-color-mode='dark'] .section-title {
  color: #b6c2cf;
}

.input-wrapper {
  margin-top: 0.5rem;
}

.all-estimates-section {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding-top: 1rem;
  border-top: 1px solid #dfe1e6;
}

html[data-color-mode='dark'] .all-estimates-section {
  border-top-color: #42526e;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.estimates-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  max-height: 300px;
  overflow-y: auto;
}

.estimate-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem 0.75rem;
  background-color: #f4f5f7;
  border-radius: 4px;
  transition: background-color 0.2s;
  min-height: 44px;
}

.estimate-item:hover {
  background-color: #ebecf0;
}

html[data-color-mode='dark'] .estimate-item {
  background-color: #282e33;
}

html[data-color-mode='dark'] .estimate-item:hover {
  background-color: #323940;
}

.estimate-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex: 1;
  gap: 1rem;
  min-width: 0;
}

.member-name {
  font-weight: 500;
  color: #172b4d;
  font-size: 14px;
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

html[data-color-mode='dark'] .member-name {
  color: #b6c2cf;
}

.estimate-time {
  color: #5e6c84;
  font-size: 13px;
  font-weight: 600;
  white-space: nowrap;
  flex-shrink: 0;
}

html[data-color-mode='dark'] .estimate-time {
  color: #8c9bab;
}

.total-estimate {
  display: flex;
  justify-content: space-between;
  padding: 0.75rem;
  background-color: #e4f0f6;
  border-radius: 4px;
  font-size: 14px;
  color: #172b4d;
}

html[data-color-mode='dark'] .total-estimate {
  background-color: #1d2125;
  color: #b6c2cf;
}

.estimate-header {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 0.5rem;
}
</style>
