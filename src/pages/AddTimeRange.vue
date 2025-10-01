<template>
  <div class="add-time-range-wrapper">
    <div v-if="loading" class="loading-container">
      <UILoader />
    </div>

    <div v-else class="add-time-range-page">
      <div class="info-section">
        <div class="info-item">
          <span class="info-label">Adding time for:</span>
          <span class="info-value">{{ memberName }}</span>
        </div>
      </div>

      <Divider />

      <div class="datetime-section">
        <label for="start-date" class="section-label">
          <i class="pi pi-calendar mr-2"></i>
          Start Time
        </label>
        <Datepicker
          id="start-date"
          v-model="startDate"
          :transitions="false"
          :enable-time-picker="true"
          :dark="isDarkMode"
          auto-apply
          @update:model-value="onDateChange"
        />
      </div>

      <div class="datetime-section">
        <label for="end-date" class="section-label">
          <i class="pi pi-calendar mr-2"></i>
          End Time
        </label>
        <Datepicker
          id="end-date"
          v-model="endDate"
          :transitions="false"
          :enable-time-picker="true"
          :dark="isDarkMode"
          auto-apply
          @update:model-value="onDateChange"
        />
      </div>

      <div v-if="hasError" class="error-message">
        <i class="pi pi-exclamation-triangle"></i>
        {{ errorMessage }}
      </div>

      <div class="new-duration" :class="{ 'has-error': hasError }">
        <div class="duration-content">
          <span class="duration-label">Duration:</span>
          <span class="duration-value" :class="{ error: hasError }">
            {{ formatTime(duration) }}
          </span>
        </div>
      </div>

      <div class="actions-footer">
        <Button
          label="Cancel"
          severity="secondary"
          outlined
          size="large"
          @click="closeModal"
        />
        <Button
          label="Add Time"
          icon="pi pi-plus"
          :disabled="hasError"
          size="large"
          @click="addTime"
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
import { formatTime, formatMemberName } from '../utils/formatting';
import UILoader from '../components/UILoader.vue';
import Datepicker from '@vuepic/vue-datepicker';
import '@vuepic/vue-datepicker/dist/main.css';
import Divider from 'primevue/divider';

const loading = ref(true);
const memberId = ref('');
const memberName = ref('');
const cardId = ref('');
const startDate = ref(new Date());
const endDate = ref(new Date(Date.now() + 3600000)); // 1 hour from now

const isDarkMode = computed(() => {
  return document.documentElement.getAttribute('data-color-mode') === 'dark';
});

const duration = computed(() => {
  if (!startDate.value || !endDate.value) return 0;
  const start = Math.floor(startDate.value.getTime() / 1000);
  const end = Math.floor(endDate.value.getTime() / 1000);
  return Math.max(0, end - start);
});

const hasError = computed(() => {
  if (!startDate.value || !endDate.value) return false;
  return startDate.value >= endDate.value;
});

const errorMessage = computed(() => {
  if (!startDate.value || !endDate.value) return '';
  if (startDate.value >= endDate.value) {
    return 'End time must be after start time';
  }
  return '';
});

onMounted(async () => {
  const params = new URLSearchParams(window.location.search);
  memberId.value = params.get('memberId') || '';
  cardId.value = params.get('cardId') || '';

  if (!memberId.value || !cardId.value) {
    console.error('Missing memberId or cardId');
    loading.value = false;
    return;
  }

  const trello = getTrelloCard();

  // Get member name
  const board = await trello.board('members');
  const member = board.members.find((m) => m.id === memberId.value);
  memberName.value = member ? formatMemberName(member) : 'Unknown Member';

  loading.value = false;
  setTimeout(resizeTrelloFrame, 100);
});

const onDateChange = () => {
  setTimeout(resizeTrelloFrame, 100);
};

const addTime = async () => {
  if (hasError.value || !startDate.value || !endDate.value) return;

  const card = new Card(cardId.value);
  const ranges = await card.getRanges();

  const newRange = new Range(
    memberId.value,
    Math.floor(startDate.value.getTime() / 1000),
    Math.floor(endDate.value.getTime() / 1000)
  );

  ranges.add(newRange);

  try {
    await ranges.save();

    await getTrelloCard().alert({
      message: 'Time entry added successfully',
      display: 'success',
      duration: 3
    });

    getTrelloCard().closeModal();
  } catch (e) {
    await getTrelloCard().alert({
      message: 'Failed to add time entry',
      display: 'error',
      duration: 3
    });
  }
};

const closeModal = () => {
  getTrelloCard().closeModal();
};
</script>

<style scoped>
.add-time-range-wrapper {
  min-height: 600px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.loading-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 400px;
}

.add-time-range-page {
  padding: 1.5rem;
  width: 100%;
  max-width: 500px;
}

.info-section {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding: 1rem;
  background: #f8f9fa;
  border-radius: 8px;
  margin-bottom: 0.5rem;
}

html[data-color-mode='dark'] .info-section {
  background: #2d3748;
}

.info-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.info-label {
  font-size: 0.875rem;
  color: #6c757d;
  font-weight: 500;
}

html[data-color-mode='dark'] .info-label {
  color: #a0aec0;
}

.info-value {
  font-size: 0.9375rem;
  color: #172b4d;
  font-weight: 600;
}

html[data-color-mode='dark'] .info-value {
  color: #e2e8f0;
}

.datetime-section {
  margin-bottom: 1rem;
}

.section-label {
  display: flex;
  align-items: center;
  margin: 0 0 0.5rem 0;
  font-size: 0.875rem;
  font-weight: 600;
  color: #172b4d;
}

html[data-color-mode='dark'] .section-label {
  color: #e2e8f0;
}

.section-label i {
  color: #6c757d;
  font-size: 0.875rem;
}

html[data-color-mode='dark'] .section-label i {
  color: #cbd5e0;
}

.error-message {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem;
  background: #fff5f5;
  border: 1px solid #feb2b2;
  border-radius: 6px;
  color: #c53030;
  font-size: 0.875rem;
  margin-bottom: 1rem;
}

html[data-color-mode='dark'] .error-message {
  background: #3d2020;
  border-color: #742a2a;
  color: #fc8181;
}

.new-duration {
  padding: 1rem 1.25rem;
  background: #f8f9fa;
  border: 2px solid #0079bf;
  border-radius: 8px;
  margin-bottom: 1rem;
}

html[data-color-mode='dark'] .new-duration {
  background: #2d3748;
  border-color: #0079bf;
}

.new-duration.has-error {
  border-color: #dc3545;
  background: #fff5f5;
}

html[data-color-mode='dark'] .new-duration.has-error {
  background: #3d2020;
  border-color: #fc8181;
}

.duration-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.duration-label {
  font-size: 0.875rem;
  color: #6c757d;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

html[data-color-mode='dark'] .duration-label {
  color: #a0aec0;
}

.duration-value {
  font-size: 1.75rem;
  color: #0079bf;
  font-weight: 700;
}

html[data-color-mode='dark'] .duration-value {
  color: #4dabf7;
}

.new-duration.has-error .duration-value {
  color: #dc3545;
}

html[data-color-mode='dark'] .new-duration.has-error .duration-value {
  color: #fc8181;
}

.actions-footer {
  display: flex;
  gap: 0.75rem;
  padding-top: 0.5rem;
}

.actions-footer .p-button {
  flex: 1;
}

/* Datepicker dark mode overrides */
html[data-color-mode='dark'] :deep(.dp__theme_light) {
  --dp-background-color: #1e2833;
  --dp-text-color: #e2e8f0;
  --dp-hover-color: #2d3748;
  --dp-hover-text-color: #e2e8f0;
  --dp-hover-icon-color: #cbd5e0;
  --dp-primary-color: #0079bf;
  --dp-primary-text-color: #ffffff;
  --dp-secondary-color: #4a5568;
  --dp-border-color: #4a5568;
  --dp-menu-border-color: #4a5568;
  --dp-border-color-hover: #718096;
  --dp-disabled-color: #4a5568;
  --dp-scroll-bar-background: #2d3748;
  --dp-scroll-bar-color: #4a5568;
  --dp-success-color: #48bb78;
  --dp-success-color-disabled: #2f855a;
  --dp-icon-color: #a0aec0;
  --dp-danger-color: #f56565;
  --dp-highlight-color: rgba(0, 121, 191, 0.2);
}

html[data-color-mode='dark'] :deep(.dp__input) {
  background-color: #1e2833;
  border-color: #4a5568;
  color: #e2e8f0;
}

html[data-color-mode='dark'] :deep(.dp__input:hover) {
  border-color: #718096;
}

html[data-color-mode='dark'] :deep(.dp__input:focus) {
  border-color: #0079bf;
}

html[data-color-mode='dark'] :deep(.dp__input_icon) {
  color: #a0aec0;
}
</style>
