<template>
  <transition v-if="loading" name="fade" appear>
    <UILoader />
  </transition>

  <div v-if="!loading" class="flex flex-column gap-3 pr-3 pl-3">
    <UIOptroStatus />

    <div class="flex align-items-center">
      <Checkbox
        v-model="disableEstimate"
        input-id="f-disable-estimate"
        :binary="true"
      />
      <label for="f-disable-estimate" class="ml-2"
        >Disable estimate feature</label
      >
    </div>

    <div class="flex flex-column gap-1">
      <label for="f-threshold"
        >Threshold in seconds for accepting trackings</label
      >

      <div class="flex flex-column">
        <InputNumber id="f-threshold" v-model="threshold" placeholder="0" />

        <Slider v-model="threshold" :min="1" :max="180" />
      </div>
    </div>

    <div>
      <Button
        v-if="!autoStartTimerEnabled"
        label="Enable auto start timer"
        class="w-full"
        @click="enableAutoStartTimer()"
      />

      <Button
        v-else
        label="Disable auto start timer"
        severity="danger"
        class="w-full"
        @click="disableAutoStartTimer()"
      />

      <div>
        <i v-if="autoStartTimerEnabled"
          >(Requires browser reload after enabling)</i
        >
      </div>
    </div>

    <div v-if="autoStartTimerEnabled" class="flex flex-column gap-1">
      <label for="f-auto-start-list">List to auto-start tracking</label>

      <Dropdown
        v-model="autoListId"
        input-id="f-auto-start-list"
        :options="listOptions"
        option-label="text"
        option-value="value"
        placeholder="Select list"
        class="w-full"
        :filter="listOptions.length > 10"
        :show-clear="!!autoListId"
      />
    </div>

    <div class="flex flex-column gap-1">
      <label for="f-visibility">Visibility</label>

      <Dropdown
        v-model="visibility"
        input-id="f-visibility"
        :options="visibilityOptions"
        option-label="text"
        option-value="value"
        placeholder="Visible to all"
        class="w-full"
        :filter="visibilityOptions.length > 10"
        :show-clear="!!visibility"
      />
    </div>

    <div
      v-if="visibility === 'specific-members'"
      class="flex flex-column gap-1"
    >
      <label for="f-visibility-members">Visibility members</label>

      <MultiSelect
        v-model="visibilityMembers"
        input-id="f-visibility-members"
        :options="visibilityMembersOptions"
        option-label="text"
        option-value="value"
        placeholder="Visible to all"
        class="w-full"
        :filter="visibilityMembersOptions.length > 10"
        :show-clear="visibilityMembers.length > 0"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { nextTick, ref, watch } from 'vue';
import {
  clearToken,
  getTrelloCard,
  getTrelloInstance,
  prepareWriteAuth,
  resizeTrelloFrame
} from '../components/trello';
import {
  disableEstimateFeature,
  enableEstimateFeature,
  getApiHost,
  getAppKey,
  getThresholdForTrackings,
  hasEstimateFeature,
  setThresholdForTrackings
} from '../components/settings';
import {
  disableAutoTimer,
  enableAutoTimer,
  getAutoTimerListId,
  hasAutoTimer,
  setAutoTimerListId
} from '../utils/auto-timer';
import UIOptroStatus from '../components/UIOptroStatus.vue';
import UILoader from '../components/UILoader.vue';
import {
  getVisibility,
  getVisibilityMembers,
  setVisibility,
  setVisibilityMembers,
  Visibility
} from '../utils/visibility';
import { formatMemberName } from '../utils/formatting';
import { Option } from '../types/dropdown';

const autoStartTimerEnabled = ref(false);
const disableEstimate = ref(false);
const threshold = ref(1);
const autoListId = ref('');
const loading = ref(true);
const visibility = ref('');
const visibilityOptions = ref<Option[]>([
  {
    text: 'Visible to all',
    value: ''
  },
  {
    text: 'Visible to specific members',
    value: 'specific-members'
  },
  {
    text: 'Visible to members of board',
    value: 'members-of-board'
  }
]);

const visibilityMembers = ref<string[]>([]);
const visibilityMembersOptions = ref<Option[]>([]);

const listOptions = ref<Option[]>([
  {
    text: 'None',
    value: ''
  }
]);

async function initialize() {
  const startTime = Date.now();
  await prepareWriteAuth();

  const userVisibility = await getVisibility();

  switch (userVisibility) {
    case Visibility.MEMBERS_OF_BOARD:
      visibility.value = 'members-of-board';
      break;

    case Visibility.SPECIFIC_MEMBERS:
      visibility.value = 'specific-members';
      break;
  }

  const members = await getTrelloCard().board('members');
  visibilityMembersOptions.value = members.members.map((member) => {
    return {
      text: formatMemberName(member),
      value: member.id
    };
  });

  visibilityMembers.value = await getVisibilityMembers();

  getTrelloCard().render(trelloTick);
  await new Promise((resolve) =>
    setTimeout(resolve, Math.max(0, 1500 - (Date.now() - startTime)))
  );

  loading.value = false;

  await nextTick();
  await trelloTick();
}

async function enableAutoStartTimer() {
  try {
    await getTrelloCard().getRestApi().authorize({
      scope: 'read,write',
      expiration: 'never'
    });
  } catch (e) {
    if (e instanceof Error && e.name === 'restApi::AuthDeniedError') {
      return;
    }

    await clearToken();
    throw e;
  }

  const token = await getTrelloCard().getRestApi().getToken();

  if (token) {
    const board = await getTrelloCard().board('id');

    const formData = new FormData();
    formData.append('description', 'Activity timer - auto timer');
    formData.append(
      'callbackURL',
      `https://${getApiHost()}/webhook?token=${token}&apiKey=${getAppKey()}`
    );
    formData.append('idModel', board.id);

    const response = await fetch(
      `https://api.trello.com/1/tokens/${token}/webhooks/?key=${getAppKey()}`,
      {
        method: 'POST',
        body: formData
      }
    );

    if ([200, 400].includes(response.status)) {
      autoStartTimerEnabled.value = true;
    }
  }
}

async function disableAutoStartTimer() {
  // Clearing the token automatically remove any webhooks existing on it.
  await clearToken();
  autoStartTimerEnabled.value = false;
}

async function trelloTick() {
  autoStartTimerEnabled.value = await hasAutoTimer();
  disableEstimate.value = !(await hasEstimateFeature());
  threshold.value = await getThresholdForTrackings();
  autoListId.value = await getAutoTimerListId();

  const lists = await getTrelloInstance().lists('all');

  listOptions.value = [
    {
      text: 'None',
      value: ''
    },
    ...lists.map<Option>((list) => {
      return {
        text: list.name,
        value: list.id
      };
    })
  ];

  setTimeout(resizeTrelloFrame);
}

watch(disableEstimate, () => {
  if (disableEstimate.value) {
    disableEstimateFeature();
  } else {
    enableEstimateFeature();
  }
});

watch(threshold, () => {
  setThresholdForTrackings(threshold.value);
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
});

watch(visibilityMembers, async () => {
  await setVisibilityMembers(visibilityMembers.value);
});

watch(autoStartTimerEnabled, () => {
  if (autoStartTimerEnabled.value) {
    enableAutoTimer();
  } else {
    disableAutoTimer();
  }
});

watch(autoListId, () => {
  setAutoTimerListId(autoListId.value);
});

initialize();
</script>

<style>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.5s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
