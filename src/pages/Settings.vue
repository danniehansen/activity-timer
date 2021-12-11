<template>
  <transition name="fade">
    <UILoader v-if="loading" />
  </transition>

  <template v-if="!loading">
    <UIOptroStatus />

    <UICheckbox v-model="disableEstimate" id="disable-estimate" label="Disable estimate feature" />
    <hr />
    <UISlider v-model="threshold" label="Threshold in seconds for accepting trackings" :min="1" :max="180" />
    <hr />
    <UIButton v-if="!autoStartTimerEnabled" @click="enableAutoStartTimer()">Enable auto start timer</UIButton>
    <UIButton v-if="autoStartTimerEnabled" :danger="true" @click="disableAutoStartTimer()">Disable auto start timer</UIButton>
    <div><i v-if="autoStartTimerEnabled">(Requires browser reload after enabling)</i></div>

    <UIDropdown v-if="autoStartTimerEnabled" v-model="autoListId" label="List to auto-start tracking" :options="listOptions" />
  </template>
</template>

<script setup lang="ts">
import { nextTick, ref, watch } from 'vue';
import { clearToken, getTokenDetails, getTrelloCard, getTrelloInstance, prepareWriteAuth, resizeTrelloFrame } from '../components/trello';
import UISlider from '../components/UISlider.vue';
import UICheckbox from '../components/UICheckbox.vue';
import UIButton from '../components/UIButton.vue';
import UIDropdown, { Option } from '../components/UIDropdown.vue';
import { disableEstimateFeature, enableEstimateFeature, getApiHost, getAppKey, getThresholdForTrackings, hasEstimateFeature, setThresholdForTrackings } from '../components/settings';
import { disableAutoTimer, enableAutoTimer, getAutoTimerListId, hasAutoTimer, setAutoTimerListId } from '../utils/auto-timer';
import UIOptroStatus from '../components/UIOptroStatus.vue';
import UILoader from '../components/UILoader.vue';

const autoStartTimerEnabled = ref(false);
const disableEstimate = ref(false);
const threshold = ref(1);
const autoListId = ref('');
const loading = ref(true);
const listOptions = ref<Option[]>([
  {
    text: 'None',
    value: ''
  }
]);

async function initialize () {
  const startTime = Date.now();
  await prepareWriteAuth();

  getTrelloCard().render(trelloTick);
  await new Promise((resolve) => setTimeout(resolve, Math.max(0, 1500 - (Date.now() - startTime))));

  loading.value = false;

  await nextTick();
  await trelloTick();
}

async function enableAutoStartTimer () {
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
    formData.append('callbackURL', `https://${getApiHost()}/webhook?token=${token}&apiKey=${getAppKey()}`);
    formData.append('idModel', board.id);

    const response = await fetch(`https://api.trello.com/1/tokens/${token}/webhooks/?key=${getAppKey()}`, {
      method: 'POST',
      body: formData
    });

    if ([200, 400].includes(response.status)) {
      autoStartTimerEnabled.value = true;
    }
  }
};

async function disableAutoStartTimer () {
  // Clearing the token automatically remove any webhooks existing on it.
  await clearToken();
  autoStartTimerEnabled.value = false;
};

async function trelloTick () {
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
};

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