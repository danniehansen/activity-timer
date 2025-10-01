<template>
  <div class="quick-settings-page">
    <div class="settings-section">
      <h3 class="section-title">
        <i class="pi pi-bell"></i>
        Notifications
      </h3>
      <div class="section-content">
        <div v-if="!notificationsEnabled" class="setting-item">
          <p class="help-text">
            Get notified when you approach your time estimate
          </p>
          <Button
            label="Enable Notifications"
            icon="pi pi-bell"
            class="w-full"
            @click="enableNotifications"
          />
        </div>
        <div v-else class="setting-item">
          <label for="notification-percentage" class="setting-label">
            Alert threshold ({{ notificationPercentage }}% of estimate)
          </label>
          <Slider
            id="notification-percentage"
            v-model="notificationPercentage"
            :min="1"
            :max="100"
            class="mb-3"
          />
          <Button
            label="Disable Notifications"
            icon="pi pi-bell-slash"
            severity="danger"
            outlined
            class="w-full"
            @click="disableNotifications"
          />
        </div>
      </div>
    </div>

    <Divider />

    <div class="settings-section">
      <h3 class="section-title">
        <i class="pi pi-directions"></i>
        Timer Behavior
      </h3>
      <div class="section-content">
        <div class="setting-item">
          <div class="flex align-items-center justify-content-between">
            <label for="stop-on-move" class="setting-label">
              Stop timer when card moves
            </label>
            <InputSwitch id="stop-on-move" v-model="stopOnMove" />
          </div>
          <p class="help-text small">
            Automatically stop tracking when you move a card to another list
          </p>
        </div>

        <div class="setting-item">
          <label for="threshold" class="setting-label">
            Minimum tracking duration ({{ threshold }} seconds)
          </label>
          <p class="help-text small">
            Ignore time entries shorter than this to prevent accidental clicks
          </p>
          <Slider
            id="threshold"
            v-model="threshold"
            :min="1"
            :max="180"
            class="mt-2"
          />
        </div>
      </div>
    </div>

    <Divider v-if="isAdmin" />

    <div v-if="isAdmin" class="settings-section">
      <h3 class="section-title">
        <i class="pi pi-eye"></i>
        Visibility
      </h3>
      <div class="section-content">
        <div class="setting-item">
          <label for="visibility" class="setting-label">
            Who can see Activity Timer
          </label>

          <Dropdown
            id="visibility"
            v-model="visibility"
            :options="visibilityOptions"
            option-label="text"
            option-value="value"
            placeholder="Visible to all"
            class="w-full mt-2"
          />
        </div>

        <div v-if="visibility === 'specific-members'" class="setting-item">
          <label for="visibility-members" class="setting-label">
            Specific members
          </label>
          <MultiSelect
            id="visibility-members"
            v-model="visibilityMembers"
            :options="visibilityMembersOptions"
            option-label="text"
            option-value="value"
            placeholder="Select members"
            class="w-full mt-2"
            :filter="visibilityMembersOptions.length > 10"
          />
        </div>
      </div>
    </div>

    <Divider v-if="isAdmin" />

    <div v-if="isAdmin" class="settings-section">
      <h3 class="section-title">
        <i class="pi pi-flag"></i>
        Estimates
      </h3>
      <div class="section-content">
        <div class="setting-item">
          <div class="flex align-items-center justify-content-between">
            <label for="disable-estimate" class="setting-label">
              Disable estimate feature
            </label>
            <InputSwitch id="disable-estimate" v-model="disableEstimate" />
          </div>
          <p class="help-text small">
            Hide all estimate-related features from Activity Timer
          </p>
        </div>
      </div>
    </div>

    <div class="settings-footer">
      <Button label="Close" class="w-full" @click="closeModal" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted } from 'vue';
import {
  getTrelloCard,
  getTrelloInstance,
  resizeTrelloFrame
} from '../components/trello';
import {
  hasNotificationsFeature,
  enableNotificationsFeature,
  disableNotificationsFeature,
  getNotificationPercentage,
  setNotificationPercentage
} from '../utils/notifications';
import {
  hasSettingStopOnMove,
  setSettingStopOnMove,
  getThresholdForTrackings,
  setThresholdForTrackings,
  hasEstimateFeature,
  enableEstimateFeature,
  disableEstimateFeature
} from '../components/settings';
import {
  getVisibility,
  getVisibilityMembers,
  setVisibility,
  setVisibilityMembers,
  Visibility
} from '../utils/visibility';
import { formatMemberName } from '../utils/formatting';
import { Option } from '../types/dropdown';

const notificationsEnabled = ref(false);
const notificationPercentage = ref(80);
const stopOnMove = ref(false);
const threshold = ref(5);
const disableEstimate = ref(false);
const visibility = ref('');
const visibilityMembers = ref<string[]>([]);
const isAdmin = ref(false);

const visibilityOptions = ref<Option[]>([
  { text: 'Visible to all', value: '' },
  { text: 'Visible to specific members', value: 'specific-members' },
  { text: 'Visible to members of board', value: 'members-of-board' }
]);

const visibilityMembersOptions = ref<Option[]>([]);

let notificationCheckInterval: number | null = null;
let waitingForPermission = false; // Track if user is actively granting permission

onMounted(async () => {
  // Load all settings
  notificationsEnabled.value = await hasNotificationsFeature();
  notificationPercentage.value = await getNotificationPercentage();
  stopOnMove.value = await hasSettingStopOnMove();
  threshold.value = await getThresholdForTrackings();
  disableEstimate.value = !(await hasEstimateFeature());

  // Check if current user is admin
  const currentMember = await getTrelloInstance().member('id');
  const board = await getTrelloInstance().board('members', 'memberships');
  const membership = board.memberships?.find(
    (m) => m.idMember === currentMember.id
  );
  isAdmin.value = membership?.memberType === 'admin';

  // Only load visibility settings for admins
  if (isAdmin.value) {
    const userVisibility = await getVisibility();
    switch (userVisibility) {
      case Visibility.MEMBERS_OF_BOARD:
        visibility.value = 'members-of-board';
        break;
      case Visibility.SPECIFIC_MEMBERS:
        visibility.value = 'specific-members';
        break;
    }

    visibilityMembersOptions.value = board.members.map((member) => ({
      text: formatMemberName(member),
      value: member.id
    }));

    visibilityMembers.value = await getVisibilityMembers();
  }

  // Start polling for notification permission changes
  // This only auto-enables if user is actively trying to grant permission
  notificationCheckInterval = setInterval(async () => {
    if (
      waitingForPermission &&
      !notificationsEnabled.value &&
      Notification.permission === 'granted'
    ) {
      await enableNotificationsFeature();
      notificationsEnabled.value = true;
      waitingForPermission = false; // Stop auto-enabling after successful grant
    }
  }, 1000); // Check every second

  setTimeout(resizeTrelloFrame, 100);
});

onUnmounted(() => {
  // Clean up interval when component is unmounted
  if (notificationCheckInterval) {
    clearInterval(notificationCheckInterval);
  }
});

// Watch for changes
watch(notificationPercentage, () => {
  setNotificationPercentage(notificationPercentage.value);
});

watch(stopOnMove, () => {
  setSettingStopOnMove(stopOnMove.value);
});

watch(threshold, () => {
  setThresholdForTrackings(threshold.value);
});

watch(disableEstimate, () => {
  if (disableEstimate.value) {
    disableEstimateFeature();
  } else {
    enableEstimateFeature();
  }
});

watch(visibility, async () => {
  switch (visibility.value) {
    case 'specific-members':
      await setVisibility(Visibility.SPECIFIC_MEMBERS);
      break;
    case 'members-of-board':
      await setVisibility(Visibility.MEMBERS_OF_BOARD);
      break;
    default:
      await setVisibility(Visibility.ALL);
  }
  setTimeout(resizeTrelloFrame, 100);
});

watch(visibilityMembers, async () => {
  await setVisibilityMembers(visibilityMembers.value);
});

const enableNotifications = async () => {
  if (Notification.permission === 'granted') {
    await enableNotificationsFeature();
    notificationsEnabled.value = true;
  } else {
    waitingForPermission = true; // Set flag so interval knows to auto-enable
    window.open('./index.html?page=enable-notifications');
  }
};

const disableNotifications = async () => {
  waitingForPermission = false; // Clear flag to prevent auto-re-enabling
  await disableNotificationsFeature();
  notificationsEnabled.value = false;
};

const closeModal = () => {
  getTrelloCard().closeModal();
};
</script>

<style scoped>
.quick-settings-page {
  padding: 1.5rem;
  max-width: 450px;
  margin: 0 auto;
}

.settings-section {
  margin-bottom: 1rem;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin: 0 0 1rem 0;
  font-size: 1.125rem;
  font-weight: 600;
  color: #172b4d;
}

html[data-color-mode='dark'] .section-title {
  color: #e2e8f0;
}

.section-title i {
  color: #6c757d;
}

html[data-color-mode='dark'] .section-title i {
  color: #cbd5e0;
}

.section-content {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.setting-item {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.setting-label {
  font-size: 0.9375rem;
  font-weight: 500;
  color: #495057;
}

html[data-color-mode='dark'] .setting-label {
  color: #cbd5e0;
}

.help-text {
  margin: 0;
  font-size: 0.875rem;
  color: #6c757d;
  line-height: 1.5;
}

html[data-color-mode='dark'] .help-text {
  color: #a0aec0;
}

.help-text.small {
  font-size: 0.8125rem;
}

.settings-footer {
  margin-top: 2rem;
  padding-top: 1rem;
  border-top: 1px solid #e9ecef;
}

html[data-color-mode='dark'] .settings-footer {
  border-top-color: #4a5568;
}
</style>
