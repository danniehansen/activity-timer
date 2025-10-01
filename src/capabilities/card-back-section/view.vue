<template>
  <div v-if="visible" class="activity-timer-card-section">
    <!-- Header with help button and settings icon -->
    <div class="section-header">
      <h3 class="section-title">Activity Timer</h3>
      <div class="header-actions">
        <Button
          v-if="canWrite"
          icon="pi pi-cog"
          text
          rounded
          size="small"
          title="Quick Settings"
          @click="openQuickSettings"
        />
        <HelpButton
          feature="cardBackSection"
          title="Learn how to use Activity Timer"
        />
      </div>
    </div>

    <!-- Main actions row -->
    <div v-if="canWrite" class="actions-container">
      <div class="flex flex-row gap-2 flex-wrap">
        <Button
          v-if="!isTracking"
          label="Start timer"
          icon="pi pi-play"
          @click="startTracking"
        />
        <Button
          v-else
          label="Stop timer"
          icon="pi pi-stop"
          severity="danger"
          @click="stopTracking"
        />

        <Button
          label="Add time"
          icon="pi pi-plus"
          severity="secondary"
          outlined
          title="Manually add time tracking"
          @click="addTimeManually"
        />

        <Button
          :label="timeSpentDisplay"
          icon="pi pi-clock"
          severity="secondary"
          style="pointer-events: none"
        />
      </div>

      <div v-if="hasEstimates" class="flex flex-row gap-2 flex-wrap">
        <Button
          :label="estimateButtonLabel"
          :icon="ownEstimate != totalEstimate ? 'pi pi-users' : 'pi pi-flag'"
          :title="estimateButtonTitle"
          severity="secondary"
          @click="handleEstimateClick"
        />
      </div>
    </div>

    <!-- Read-only view for non-writers -->
    <div v-else class="flex flex-row gap-2">
      <Button
        v-if="hasEstimates && totalEstimate"
        :label="`Total estimate: ${totalEstimateDisplay}`"
        severity="secondary"
      />
      <p v-else style="margin: 0; color: #6c757d; font-size: 12px">
        No options available.
      </p>
    </div>

    <!-- Progress bar for estimate tracking -->
    <div v-if="hasEstimates && totalEstimate > 0" class="estimate-progress">
      <div class="progress-header">
        <span class="progress-label">
          <strong>{{ timeSpentDisplay }}</strong> / {{ totalEstimateDisplay }}
        </span>
        <span class="progress-percentage" :class="progressPercentageClass">
          {{ progressPercentage }}%
        </span>
      </div>
      <div class="progress-bar-container">
        <div
          class="progress-bar-fill"
          :class="progressBarClass"
          :style="{ width: progressBarWidth }"
        ></div>
      </div>
    </div>

    <!-- Member Summary Section -->
    <div v-if="memberSummary.length > 0" class="member-summary">
      <div class="member-summary-header">
        <span class="member-summary-label">
          <i class="pi pi-users"></i>
          Time by Member
        </span>
        <Button
          v-if="memberSummary.length > 3"
          :icon="showAllMembers ? 'pi pi-chevron-up' : 'pi pi-chevron-down'"
          :label="
            showAllMembers ? 'Show less' : `Show all (${memberSummary.length})`
          "
          text
          size="small"
          severity="secondary"
          @click="toggleShowAllMembers"
        />
      </div>
      <div class="member-list">
        <div
          v-for="member in displayedMembers"
          :key="member.id"
          class="member-row"
        >
          <span class="member-name">{{ member.name }}</span>
          <div class="member-right">
            <span class="member-time">{{ member.timeSpent }}</span>
            <Button
              v-if="canWrite"
              icon="pi pi-pencil"
              text
              rounded
              size="small"
              severity="secondary"
              title="Manage time"
              @click="openManageMemberTime(member.id)"
            />
          </div>
        </div>
      </div>
    </div>

    <!-- Limita announcement footer -->
    <div class="limita-footer">
      <span class="limita-emoji">🚀</span>
      <span class="limita-text"
        >Activity Timer is evolving into
        <a
          href="https://limita.org"
          target="_blank"
          rel="noopener noreferrer"
          class="limita-link"
          >Limita</a
        ></span
      >
      <span class="limita-separator">•</span>
      <a
        href="https://github.com/danniehansen/activity-timer/issues"
        target="_blank"
        rel="noopener noreferrer"
        class="support-link"
        title="Get support or report issues"
        >Support</a
      >
    </div>
  </div>

  <p v-else>Not visible for this user.</p>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue';
import {
  getMemberId,
  getTrelloCard,
  resizeTrelloFrame
} from '../../components/trello';
import { Card } from '../../components/card';
import { formatTime, formatMemberName } from '../../utils/formatting';
import { hasEstimateFeature } from '../../components/settings';
import { isVisible } from '../../utils/visibility';
import HelpButton from '../../components/HelpButton.vue';

const isTracking = ref(false);
const trackedTime = ref(0);
const totalEstimate = ref(0);
const ownEstimate = ref(0);
const hasEstimates = ref(false);
const canWrite = ref(false);
const visible = ref(false);
const showAllMembers = ref(false);
const boardMembers = ref<any[]>([]);
const memberSummary = ref<
  Array<{ id: string; name: string; timeSpent: string; timeInSeconds: number }>
>([]);

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

const progressPercentage = computed(() => {
  if (totalEstimate.value === 0) return 0;
  return Math.round((trackedTime.value / totalEstimate.value) * 100);
});

const progressBarWidth = computed(() => {
  const percentage = progressPercentage.value;
  return `${Math.min(percentage, 100)}%`;
});

const progressBarClass = computed(() => {
  const percentage = progressPercentage.value;
  if (percentage >= 100) return 'progress-over';
  if (percentage >= 80) return 'progress-warning';
  return 'progress-good';
});

const progressPercentageClass = computed(() => {
  const percentage = progressPercentage.value;
  if (percentage >= 100) return 'percentage-over';
  if (percentage >= 80) return 'percentage-warning';
  return 'percentage-good';
});

const estimateButtonLabel = computed(() => {
  if (ownEstimate.value !== totalEstimate.value) {
    return `Est: ${ownEstimateDisplay.value} / ${totalEstimateDisplay.value}`;
  }
  return `Estimate: ${ownEstimateDisplay.value}`;
});

const estimateButtonTitle = computed(() => {
  if (ownEstimate.value !== totalEstimate.value) {
    return `Your estimate: ${ownEstimateDisplay.value}, Total: ${totalEstimateDisplay.value}. Click to view all estimates.`;
  }
  return 'Click to change your estimate';
});

const displayedMembers = computed(() => {
  if (showAllMembers.value || memberSummary.value.length <= 3) {
    return memberSummary.value;
  }
  return memberSummary.value.slice(0, 3);
});

const trelloTick = async () => {
  try {
    // Check if we have valid board context before proceeding
    const context = getTrelloCard().getContext();
    if (!context.board) {
      console.debug(
        '[activity-timer] Board context missing, skipping trelloTick'
      );
      return;
    }

    if (!cardId) {
      cardId = (await getTrelloCard().card('id')).id;
    }

    canWrite.value = await getTrelloCard().memberCanWriteToModel('card');
    visible.value = await isVisible();
    hasEstimates.value = await hasEstimateFeature();

    const memberId = await getMemberId();
    const card = getCardModel();

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

    // Load member summary
    await loadMemberSummary();

    // Resize iframe after data changes
    await nextTick();
    setTimeout(resizeTrelloFrame, 100);
  } catch (e) {
    // Silently handle context errors when board is no longer available
    // This commonly occurs when the card is closed or user navigates away
    const errorStr = String(e);
    if (
      errorStr.includes('Invalid context') ||
      errorStr.includes('missing board')
    ) {
      console.debug(
        '[activity-timer] Board context lost during trelloTick, ignoring'
      );
      return;
    }

    // Re-throw unexpected errors
    throw e;
  }
};

const loadMemberSummary = async () => {
  const card = getCardModel();
  const ranges = await card.getRanges();
  const timers = await card.getTimers();
  const board = await getTrelloCard().board('members');
  boardMembers.value = board.members;

  const summary: Array<{
    id: string;
    name: string;
    timeSpent: string;
    timeInSeconds: number;
  }> = [];

  board.members
    .sort((a, b) => {
      const nameA = (a.fullName ?? '').toUpperCase();
      const nameB = (b.fullName ?? '').toUpperCase();
      if (nameA < nameB) return -1;
      if (nameA > nameB) return 1;
      return 0;
    })
    .forEach((member) => {
      const timer = timers.getByMemberId(member.id);
      const timeInSeconds =
        ranges.items
          .filter((item) => item.memberId === member.id)
          .reduce((a, b) => a + b.diff, 0) + (timer ? timer.timeInSecond : 0);

      if (timeInSeconds !== 0) {
        summary.push({
          id: member.id,
          name: formatMemberName(member),
          timeSpent: formatTime(timeInSeconds),
          timeInSeconds
        });
      }
    });

  memberSummary.value = summary;
};

// Watch for changes that affect layout height
watch(
  [hasEstimates, totalEstimate, visible, canWrite, showAllMembers],
  async () => {
    await nextTick();
    setTimeout(resizeTrelloFrame, 100);
  }
);

const getCardModel = () => {
  if (!cardId) {
    throw new Error('Unable to locate cardId');
  }
  return new Card(cardId);
};

const startTracking = async () => {
  const card = await getTrelloCard().card('id', 'idList');
  const cardModel = new Card(card.id);
  await cardModel.startTracking(card.idList);
};

const stopTracking = async () => {
  const cardModel = getCardModel();
  await cardModel.stopTracking(getTrelloCard());
};

const handleEstimateClick = async () => {
  const trelloInstance = getTrelloCard();

  await trelloInstance.modal({
    title: 'Estimates',
    url: './index.html?page=change-estimate',
    fullscreen: false,
    height: 600
  });
};

const addTimeManually = async (e?: MouseEvent) => {
  const trelloInstance = getTrelloCard();

  await trelloInstance.popup({
    title: 'Add time tracking',
    url: './index.html?page=add-time-manually',
    height: 180,
    mouseEvent: e
  });
};

const toggleShowAllMembers = async () => {
  showAllMembers.value = !showAllMembers.value;
};

const openQuickSettings = async () => {
  const trelloInstance = getTrelloCard();

  await trelloInstance.modal({
    title: 'Quick Settings',
    url: './index.html?page=quick-settings',
    fullscreen: false,
    height: 500
  });
};

const openManageMemberTime = async (memberId: string) => {
  const trelloInstance = getTrelloCard();

  await trelloInstance.modal({
    title: 'Manage Time',
    url: `./index.html?page=manage-member-time&memberId=${memberId}`,
    fullscreen: false,
    height: 700
  });
};

getTrelloCard().render(trelloTick);
trelloTick();

// Force clock to update once a minute
setInterval(trelloTick, 1000 * 60);
</script>

<style scoped>
html[data-color-mode='dark'] .row {
  background-color: #313940;
}

.activity-timer-card-section {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.25rem;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.section-title {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: #172b4d;
}

html[data-color-mode='dark'] .section-title {
  color: #b6c2cf;
}

.actions-container {
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: flex-start;
  gap: 0.5rem;
  flex-wrap: wrap;
}

/* Member Summary Styles */
.member-summary {
  border-top: 1px solid #e9ecef;
  padding-top: 0.75rem;
  margin-top: 0.5rem;
}

html[data-color-mode='dark'] .member-summary {
  border-top-color: #4a5568;
}

.member-summary-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.75rem;
}

.member-summary-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 11px;
  font-weight: 600;
  color: #6c757d;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

html[data-color-mode='dark'] .member-summary-label {
  color: #a0aec0;
}

.member-summary-label i {
  font-size: 12px;
}

.member-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.member-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem 0.75rem;
  background: #f8f9fa;
  border-radius: 4px;
  transition: background-color 0.2s;
}

.member-row:hover {
  background: #e9ecef;
}

html[data-color-mode='dark'] .member-row {
  background: #2d3748;
}

html[data-color-mode='dark'] .member-row:hover {
  background: #374151;
}

.member-name {
  font-size: 13px;
  font-weight: 500;
  color: #172b4d;
  flex: 1;
}

html[data-color-mode='dark'] .member-name {
  color: #e2e8f0;
}

.member-right {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.member-time {
  font-size: 13px;
  font-weight: 600;
  color: #6c757d;
  font-variant-numeric: tabular-nums;
}

html[data-color-mode='dark'] .member-time {
  color: #cbd5e0;
}

/* Progress bar styles */
.estimate-progress {
  width: 100%;
  padding: 0.5rem 0;
}

.progress-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
  font-size: 12px;
}

.progress-label {
  color: #495057;
}

html[data-color-mode='dark'] .progress-label {
  color: #cbd5e0;
}

.progress-percentage {
  font-weight: 600;
}

.percentage-good {
  color: #28a745;
}

.percentage-warning {
  color: #ffc107;
}

.percentage-over {
  color: #dc3545;
}

html[data-color-mode='dark'] .percentage-good {
  color: #48bb78;
}

html[data-color-mode='dark'] .percentage-warning {
  color: #ecc94b;
}

html[data-color-mode='dark'] .percentage-over {
  color: #fc8181;
}

.progress-bar-container {
  width: 100%;
  height: 8px;
  background-color: #e9ecef;
  border-radius: 4px;
  overflow: hidden;
}

html[data-color-mode='dark'] .progress-bar-container {
  background-color: #4a5568;
}

.progress-bar-fill {
  height: 100%;
  transition: width 0.3s ease, background-color 0.3s ease;
  border-radius: 4px;
}

.progress-good {
  background-color: #28a745;
}

.progress-warning {
  background-color: #ffc107;
}

.progress-over {
  background-color: #dc3545;
}

html[data-color-mode='dark'] .progress-good {
  background-color: #48bb78;
}

html[data-color-mode='dark'] .progress-warning {
  background-color: #ecc94b;
}

html[data-color-mode='dark'] .progress-over {
  background-color: #fc8181;
}

/* Limita Footer */
.limita-footer {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding-top: 0.5rem;
  border-top: 1px solid #e9ecef;
  font-size: 11px;
  color: #6c757d;
  line-height: 1.2;
}

html[data-color-mode='dark'] .limita-footer {
  border-top-color: #495057;
}

.limita-emoji {
  font-size: 12px;
  line-height: 1;
  display: inline-flex;
  align-items: center;
}

.limita-text {
  line-height: 1.2;
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
}

.limita-link,
.support-link {
  color: #0079bf;
  text-decoration: none;
  font-weight: 500;
  transition: color 0.2s;
}

.limita-link:hover,
.support-link:hover {
  color: #005a8c;
  text-decoration: underline;
}

html[data-color-mode='dark'] .limita-link,
html[data-color-mode='dark'] .support-link {
  color: #4dabf7;
}

html[data-color-mode='dark'] .limita-link:hover,
html[data-color-mode='dark'] .support-link:hover {
  color: #74c0fc;
}

.limita-separator {
  color: #dee2e6;
  line-height: 1;
  display: inline-flex;
  align-items: center;
}

html[data-color-mode='dark'] .limita-separator {
  color: #495057;
}
</style>
