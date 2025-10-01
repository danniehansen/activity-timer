<template>
  <div v-if="loading" class="loading-container">
    <UILoader />
  </div>

  <div v-else class="manage-member-time-page">
    <div v-if="!hasAnyTime" class="empty-state">
      <i class="pi pi-clock empty-icon"></i>
      <h3>No Time Tracked</h3>
      <p>This member hasn't tracked any time on this card yet.</p>
      <Button
        label="Add Time Manually"
        icon="pi pi-plus"
        class="mt-3"
        @click="openAddManualTime"
      />
    </div>

    <div v-else class="time-content">
      <!-- Active Timer Section -->
      <div v-if="activeTimer" class="timer-card active">
        <div class="timer-header">
          <div class="timer-icon">
            <i class="pi pi-play-circle"></i>
          </div>
          <div class="timer-info">
            <span class="timer-label">Currently Running</span>
            <span class="timer-time">{{
              formatDate(new Date(activeTimer.start * 1000))
            }}</span>
          </div>
          <span class="timer-duration">{{
            formatTime(activeTimer.timeInSecond, true)
          }}</span>
        </div>
        <div class="timer-actions">
          <Button
            label="Stop Timer"
            icon="pi pi-stop"
            severity="danger"
            class="w-full"
            @click="stopTimer($event)"
          />
        </div>
      </div>

      <!-- Time Entries List -->
      <div class="entries-section">
        <div class="entries-header">
          <h3 class="entries-title">Time Entries</h3>
          <Button
            label="Add Time"
            icon="pi pi-plus"
            size="small"
            outlined
            @click="openAddManualTime"
          />
        </div>

        <div v-if="timeRanges.length === 0" class="no-entries">
          <p>No completed time entries yet.</p>
        </div>

        <div v-else class="entries-list">
          <div
            v-for="range in sortedRanges"
            :key="range.rangeId"
            class="entry-card"
          >
            <div class="entry-main">
              <div class="entry-icon">
                <i class="pi pi-clock"></i>
              </div>
              <div class="entry-details">
                <span class="entry-date">{{ formatRangeDisplay(range) }}</span>
                <span class="entry-duration">{{
                  formatTime(range.diff, false)
                }}</span>
              </div>
            </div>
            <div class="entry-actions">
              <Button
                icon="pi pi-pencil"
                text
                rounded
                title="Edit"
                @click="editRange(range)"
              />
              <Button
                icon="pi pi-trash"
                text
                rounded
                severity="danger"
                title="Delete"
                @click="confirmDeleteRange(range, $event)"
              />
            </div>
          </div>
        </div>
      </div>

      <!-- Total Section -->
      <div class="total-section">
        <div class="total-card">
          <div class="total-icon">
            <i class="pi pi-clock"></i>
          </div>
          <div class="total-content">
            <span class="total-label">Total Time Tracked</span>
            <span class="total-time">{{ formatTime(totalTime) }}</span>
          </div>
        </div>
      </div>

      <!-- Danger Zone -->
      <div v-if="timeRanges.length > 0 || activeTimer" class="danger-zone">
        <h4 class="danger-title">Danger Zone</h4>
        <Button
          label="Clear All Time for This Member"
          icon="pi pi-trash"
          severity="danger"
          outlined
          class="w-full"
          @click="confirmClearAll($event)"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { getTrelloCard, resizeTrelloFrame } from '../components/trello';
import { Card } from '../components/card';
import { Range } from '../components/range';
import { Ranges } from '../components/ranges';
import { formatTime, formatDate, formatMemberName } from '../utils/formatting';
import UILoader from '../components/UILoader.vue';

const loading = ref(true);
const memberId = ref('');
const memberName = ref('');
const timeRanges = ref<Range[]>([]);
const activeTimer = ref<any>(null);
let cardId = '';

const hasAnyTime = computed(() => {
  return timeRanges.value.length > 0 || activeTimer.value !== null;
});

const sortedRanges = computed(() => {
  return [...timeRanges.value].sort((a, b) => b.start - a.start);
});

const totalTime = computed(() => {
  const rangesTime = timeRanges.value.reduce(
    (sum, range) => sum + range.diff,
    0
  );
  const timerTime = activeTimer.value ? activeTimer.value.timeInSecond : 0;
  return rangesTime + timerTime;
});

onMounted(async () => {
  const params = new URLSearchParams(window.location.search);
  memberId.value = params.get('memberId') || '';

  if (!memberId.value) {
    console.error('No memberId provided');
    loading.value = false;
    return;
  }

  const trello = getTrelloCard();
  const cardData = await trello.card('id');
  cardId = cardData.id;

  // Get member name
  const board = await trello.board('members');
  const member = board.members.find((m) => m.id === memberId.value);
  memberName.value = member ? formatMemberName(member) : 'Unknown Member';

  // Load time data
  await loadTimeData();

  loading.value = false;
  setTimeout(resizeTrelloFrame, 100);
});

const loadTimeData = async () => {
  const card = new Card(cardId);
  const ranges = await card.getRanges();
  const timers = await card.getTimers();

  timeRanges.value = ranges.items.filter(
    (range) => range.memberId === memberId.value
  );
  activeTimer.value = timers.getByMemberId(memberId.value);
};

const formatRangeDisplay = (range: Range | any) => {
  const start = new Date(range.start * 1000);
  const end = new Date(range.end * 1000);
  const rangeOnTheSameDay = start.toDateString() === end.toDateString();

  return `${formatDate(start)} - ${formatDate(end, rangeOnTheSameDay)}`;
};

const stopTimer = async (event: MouseEvent) => {
  const trello = getTrelloCard();

  trello.popup({
    type: 'confirm',
    title: 'Stop Timer',
    message: 'Are you sure you want to stop this timer?',
    confirmText: 'Stop Timer',
    confirmStyle: 'danger',
    cancelText: 'Cancel',
    mouseEvent: event,
    onConfirm: async (t) => {
      const card = new Card(cardId);
      await card.stopTrackingByMemberId(memberId.value, trello);

      await loadTimeData();
      setTimeout(resizeTrelloFrame, 100);

      return t.closePopup();
    },
    onCancel: (t) => t.closePopup()
  });
};

const editRange = async (range: Range | any) => {
  const trello = getTrelloCard();

  await trello.modal({
    title: 'Edit Time Entry',
    url: `./index.html?page=edit-time-range&memberId=${memberId.value}&rangeId=${range.rangeId}`,
    fullscreen: false,
    height: 650
  });

  // Reload data after modal closes
  await loadTimeData();
  setTimeout(resizeTrelloFrame, 100);
};

const confirmDeleteRange = async (range: Range | any, event: MouseEvent) => {
  const trello = getTrelloCard();

  trello.popup({
    type: 'confirm',
    title: 'Delete Time Entry',
    message: `Delete this time entry?\n\n${formatRangeDisplay(
      range
    )}\nDuration: ${formatTime(range.diff, false)}`,
    confirmText: 'Delete',
    confirmStyle: 'danger',
    cancelText: 'Cancel',
    mouseEvent: event,
    onConfirm: async (t) => {
      const card = new Card(cardId);
      const ranges = await card.getRanges();

      // Filter by actual data (memberId, start, end) not rangeId
      // because rangeId is generated locally and changes on reload
      const newRanges = new Ranges(
        cardId,
        ranges.items.filter(
          (item) =>
            !(
              item.memberId === range.memberId &&
              item.start === range.start &&
              item.end === range.end
            )
        )
      );

      try {
        await newRanges.save();
        await loadTimeData();
        setTimeout(resizeTrelloFrame, 100);

        await trello.alert({
          message: 'Time entry deleted successfully',
          display: 'success',
          duration: 3
        });
      } catch (e) {
        await trello.alert({
          message: 'Failed to delete time entry',
          display: 'error',
          duration: 3
        });
      }

      return t.closePopup();
    },
    onCancel: (t) => t.closePopup()
  });
};

const confirmClearAll = async (event: MouseEvent) => {
  const trello = getTrelloCard();

  trello.popup({
    type: 'confirm',
    title: '⚠️ Clear All Time',
    message: `This will permanently delete ALL time tracking for ${
      memberName.value
    } on this card.\n\nTotal time to be deleted: ${formatTime(
      totalTime.value
    )}\n\nThis action cannot be undone. Are you sure?`,
    confirmText: 'Clear All',
    confirmStyle: 'danger',
    cancelText: 'Cancel',
    mouseEvent: event,
    onConfirm: async (t) => {
      const card = new Card(cardId);
      const ranges = await card.getRanges();

      // Remove all ranges for this member
      const newRanges = new Ranges(
        cardId,
        ranges.items.filter((item) => item.memberId !== memberId.value)
      );

      // Stop active timer if exists
      if (activeTimer.value) {
        const timers = await card.getTimers();
        timers.removeByMemberId(memberId.value);
        await timers.save();
      }

      try {
        await newRanges.save();
        await loadTimeData();
        setTimeout(resizeTrelloFrame, 100);

        await trello.alert({
          message: 'All time entries cleared successfully',
          display: 'success',
          duration: 3
        });
      } catch (e) {
        await trello.alert({
          message: 'Failed to clear time entries',
          display: 'error',
          duration: 3
        });
      }

      return t.closePopup();
    },
    onCancel: (t) => t.closePopup()
  });
};

const openAddManualTime = async () => {
  const trello = getTrelloCard();

  await trello.modal({
    title: 'Add Time Manually',
    url: `./index.html?page=add-time-range&memberId=${memberId.value}&cardId=${cardId}`,
    fullscreen: false,
    height: 600
  });

  // Reload data after modal closes
  await loadTimeData();
  setTimeout(resizeTrelloFrame, 100);
};
</script>

<style scoped>
.loading-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 400px;
}

.manage-member-time-page {
  padding: 1.5rem;
  max-width: 500px;
  margin: 0 auto;
}

/* Empty State */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem 1rem;
  text-align: center;
}

.empty-icon {
  font-size: 4rem;
  color: #cbd5e0;
  margin-bottom: 1rem;
}

html[data-color-mode='dark'] .empty-icon {
  color: #4a5568;
}

.empty-state h3 {
  margin: 0 0 0.5rem 0;
  color: #172b4d;
}

html[data-color-mode='dark'] .empty-state h3 {
  color: #e2e8f0;
}

.empty-state p {
  margin: 0;
  color: #6c757d;
}

html[data-color-mode='dark'] .empty-state p {
  color: #cbd5e0;
}

/* Time Content */
.time-content {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

/* Active Timer Card */
.timer-card {
  background: #0079bf;
  border-radius: 8px;
  padding: 1.25rem;
  color: white;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  border: 2px solid rgba(255, 255, 255, 0.2);
}

.timer-header {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1rem;
}

.timer-icon {
  font-size: 2rem;
  opacity: 0.9;
}

.timer-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.timer-label {
  font-size: 0.875rem;
  opacity: 0.9;
  font-weight: 500;
}

.timer-time {
  font-size: 1rem;
  font-weight: 600;
}

.timer-duration {
  font-size: 1.5rem;
  font-weight: 700;
}

.timer-actions {
  display: flex;
  gap: 0.5rem;
}

/* Entries Section */
.entries-section {
  background: #f8f9fa;
  border-radius: 8px;
  padding: 1.25rem;
  border: 1px solid #e9ecef;
}

html[data-color-mode='dark'] .entries-section {
  background: #2d3748;
  border-color: #4a5568;
}

.entries-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.entries-title {
  margin: 0;
  font-size: 1.125rem;
  font-weight: 600;
  color: #172b4d;
}

html[data-color-mode='dark'] .entries-title {
  color: #e2e8f0;
}

.no-entries {
  text-align: center;
  padding: 2rem 1rem;
  color: #6c757d;
}

html[data-color-mode='dark'] .no-entries {
  color: #a0aec0;
}

.entries-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.entry-card {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  background: white;
  border-radius: 6px;
  border: 1px solid #dee2e6;
  transition: box-shadow 0.2s;
}

.entry-card:hover {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

html[data-color-mode='dark'] .entry-card {
  background: #1e2833;
  border-color: #495057;
}

html[data-color-mode='dark'] .entry-card:hover {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
}

.entry-main {
  display: flex;
  align-items: center;
  gap: 1rem;
  flex: 1;
}

.entry-icon {
  font-size: 1.5rem;
  color: #6c757d;
}

html[data-color-mode='dark'] .entry-icon {
  color: #cbd5e0;
}

.entry-details {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.entry-date {
  font-size: 0.9375rem;
  color: #495057;
  font-weight: 500;
}

html[data-color-mode='dark'] .entry-date {
  color: #cbd5e0;
}

.entry-duration {
  font-size: 0.875rem;
  color: #6c757d;
}

html[data-color-mode='dark'] .entry-duration {
  color: #a0aec0;
}

.entry-actions {
  display: flex;
  gap: 0.25rem;
}

/* Total Section */
.total-section {
  margin-top: 0.5rem;
}

.total-card {
  background: #f8f9fa;
  border: 2px solid #e9ecef;
  border-radius: 8px;
  padding: 1.25rem;
  display: flex;
  align-items: center;
  gap: 1rem;
}

html[data-color-mode='dark'] .total-card {
  background: #2d3748;
  border-color: #4a5568;
}

.total-icon {
  width: 48px;
  height: 48px;
  background: #0079bf;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.total-icon i {
  font-size: 1.5rem;
  color: white;
}

.total-content {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  flex: 1;
}

.total-label {
  font-size: 0.875rem;
  font-weight: 500;
  color: #6c757d;
}

html[data-color-mode='dark'] .total-label {
  color: #a0aec0;
}

.total-time {
  font-size: 1.5rem;
  font-weight: 700;
  color: #172b4d;
}

html[data-color-mode='dark'] .total-time {
  color: #e2e8f0;
}

/* Danger Zone */
.danger-zone {
  background: #fff5f5;
  border: 1px solid #feb2b2;
  border-radius: 8px;
  padding: 1.25rem;
}

html[data-color-mode='dark'] .danger-zone {
  background: #3d2020;
  border-color: #742a2a;
}

.danger-title {
  margin: 0 0 1rem 0;
  font-size: 1rem;
  font-weight: 600;
  color: #c53030;
}

html[data-color-mode='dark'] .danger-title {
  color: #fc8181;
}
</style>
