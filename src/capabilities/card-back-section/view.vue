<template>
  <div v-if="visible" class="activity-timer-card-section">
    <!-- Main actions row -->
    <div
      v-if="canWrite"
      class="flex flex-row justify-content-between gap-2 align-items-center"
    >
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
          :label="`Estimate: ${ownEstimateDisplay}`"
          severity="secondary"
          @click="changeEstimate"
        />

        <Button
          v-if="ownEstimate != totalEstimate"
          :label="`Total: ${totalEstimateDisplay}`"
          severity="secondary"
          @click="viewEstimates"
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
import { formatTime } from '../../utils/formatting';
import { hasEstimateFeature } from '../../components/settings';
import { Trello } from '../../types/trello';
import { isVisible } from '../../utils/visibility';

const isTracking = ref(false);
const trackedTime = ref(0);
const totalEstimate = ref(0);
const ownEstimate = ref(0);
const hasEstimates = ref(false);
const canWrite = ref(false);
const visible = ref(false);
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

const trelloTick = async () => {
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

  // Resize iframe after data changes
  await nextTick();
  setTimeout(resizeTrelloFrame, 100);
};

// Watch for changes that affect layout height
watch([hasEstimates, totalEstimate, visible, canWrite], async () => {
  await nextTick();
  setTimeout(resizeTrelloFrame, 100);
});

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

const changeEstimate = async (e: MouseEvent) => {
  const trelloInstance = getTrelloCard();

  await trelloInstance.popup({
    title: 'Change estimate',
    url: './index.html?page=change-estimate',
    height: 120,
    mouseEvent: e
  });
};

const addTimeManually = async (e: MouseEvent) => {
  const trelloInstance = getTrelloCard();

  await trelloInstance.popup({
    title: 'Add time tracking',
    url: './index.html?page=add-time-manually',
    height: 180,
    mouseEvent: e
  });
};

const viewEstimates = async (e: MouseEvent) => {
  const trelloInstance = getTrelloCard();

  trelloInstance.popup({
    mouseEvent: e,
    title: 'Estimates',
    items: async function (t) {
      const cardModel = getCardModel();
      const items: Trello.PowerUp.PopupOptionsItem[] = [];
      const estimates = await cardModel.getEstimates();
      const board = await t.board('members');

      const membersFound = board.members.map((member) => member.id);

      board.members
        .sort((a, b) => {
          const nameA = (a.fullName ?? '').toUpperCase();
          const nameB = (b.fullName ?? '').toUpperCase();

          if (nameA < nameB) {
            return -1;
          }
          if (nameA > nameB) {
            return 1;
          }

          return 0;
        })
        .forEach((member) => {
          const memberEstimates = estimates.items.filter((estimate) => {
            return estimate.memberId === member.id;
          });

          let memberEstimate = 0;

          memberEstimates.forEach((estimate) => {
            memberEstimate += estimate.time;
          });

          if (memberEstimate > 0) {
            items.push({
              text:
                member.fullName +
                (member.fullName !== member.username
                  ? ' (' + member.username + ')'
                  : '') +
                ': ' +
                formatTime(memberEstimate),
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

      estimates.items.forEach((estimate) => {
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

<style scoped>
html[data-color-mode='dark'] .row {
  background-color: #313940;
}

.activity-timer-card-section {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

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
</style>
