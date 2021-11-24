<template>
  <UICheckbox v-model="disableEstimate" id="disable-estimate" label="Disable estimate feature" />
  <hr />
  <UISlider v-model="threshold" label="Threshold in seconds for accepting trackings" :min="1" :max="180" />
  <hr />
  <UIButton v-if="!enableAutoStartTimer" @click="enableAutoStartTimer = true;">Enable auto start timer</UIButton>
  <UIButton v-if="enableAutoStartTimer" :danger="true" @click="enableAutoStartTimer = false;">Disable auto start timer</UIButton>
  <div><i v-if="enableAutoStartTimer">(Requires browser reload after enabling)</i></div>

  <UIDropdown v-if="enableAutoStartTimer" v-model="autoListId" id="list" label="List to auto-start tracking" :options="listOptions" />
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { getTrelloCard, getTrelloInstance } from '../trello';
import UISlider from '../components/UISlider.vue';
import UICheckbox from '../components/UICheckbox.vue';
import UIButton from '../components/UIButton.vue';
import UIDropdown, { Option } from '../components/UIDropdown.vue';
import { disableEstimateFeature, enableEstimateFeature, getThresholdForTrackings, hasEstimateFeature, setThresholdForTrackings } from '../components/settings';
import { disableAutoTimer, enableAutoTimer, getAutoTimerListId, hasAutoTimer, setAutoTimerListId } from '../utils/auto-timer';

const enableAutoStartTimer = ref(false);
const disableEstimate = ref(false);
const threshold = ref(1);
const autoListId = ref('');
const listOptions = ref<Option[]>([
  {
    text: 'None',
    value: ''
  }
]);

const trelloTick = async () => {
  enableAutoStartTimer.value = await hasAutoTimer();
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

watch(enableAutoStartTimer, () => {
  if (enableAutoStartTimer.value) {
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

<style lang="scss" scoped>
</style>