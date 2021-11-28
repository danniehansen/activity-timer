<template>
  <UICheckbox v-model="disableEstimate" id="disable-estimate" label="Disable estimate feature" />
  <hr />
  <UISlider v-model="threshold" label="Threshold in seconds for accepting trackings" :min="1" :max="180" />
  <hr />
  <UIButton v-if="!autoStartTimerEnabled" @click="enableAutoStartTimer()">Enable auto start timer</UIButton>
  <UIButton v-if="autoStartTimerEnabled" :danger="true" @click="disableAutoStartTimer()">Disable auto start timer</UIButton>
  <div><i v-if="autoStartTimerEnabled">(Requires browser reload after enabling)</i></div>

  <UIDropdown v-if="autoStartTimerEnabled" v-model="autoListId" id="list" label="List to auto-start tracking" :options="listOptions" />
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { getTrelloCard, getTrelloInstance, resizeTrelloFrame } from '../components/trello';
import UISlider from '../components/UISlider.vue';
import UICheckbox from '../components/UICheckbox.vue';
import UIButton from '../components/UIButton.vue';
import UIDropdown, { Option } from '../components/UIDropdown.vue';
import { disableEstimateFeature, enableEstimateFeature, getApiHost, getAppKey, getThresholdForTrackings, hasEstimateFeature, setThresholdForTrackings } from '../components/settings';
import { disableAutoTimer, enableAutoTimer, getAutoTimerListId, hasAutoTimer, setAutoTimerListId } from '../utils/auto-timer';

interface WebookResponseItem {
  webhooks: {
    id: string;
  }[]
}

const autoStartTimerEnabled = ref(false);
const disableEstimate = ref(false);
const threshold = ref(1);
const autoListId = ref('');
const listOptions = ref<Option[]>([
  {
    text: 'None',
    value: ''
  }
]);

const enableAutoStartTimer = async () => {
  await getTrelloCard().getRestApi().authorize({
    scope: 'read,write,account',
    expiration: 'never'
  });

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

    if (response.status === 200) {
      autoStartTimerEnabled.value = true;
    }
  }
};

const disableAutoStartTimer = async () => {
  const token = await getTrelloCard().getRestApi().getToken();

  if (token) {
    fetch(`https://api.trello.com/1/members/me/tokens?webhooks=true&key=${getAppKey()}&token=${token}`)
      .then<WebookResponseItem[]>(response => response.json())
      .then(async data => {
        if (data && data.length > 0) {
          const promises: Promise<Response>[] = [];

          data.forEach((item) => {
            if (item.webhooks && item.webhooks.length > 0) {
              item.webhooks.forEach((webhook) => {
                promises.push(
                  fetch(`https://api.trello.com/1/webhooks/${webhook.id}?key=${getAppKey()}&token=${token}`, {
                    method: 'DELETE'
                  })
                );
              });
            }
          });

          await Promise.all(promises);
        }
      });
  }

  autoStartTimerEnabled.value = false;
};

const trelloTick = async () => {
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

getTrelloCard().render(trelloTick);
trelloTick();
</script>