<template>
  <button v-if="!enabled" class="mod-primary" @click="enable()">Enable notifications</button>
  <button v-else class="mod-danger" @click="disable()">Disable notifications</button>

  <template v-if="enabled">
    <label>Percentage of estimate spent to trigger notification</label>

    <UIRow>
      <input v-model="percentage" type="range" min="1" max="100" />
      <input v-model="percentage" type="number" />
    </UIRow>
  </template>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import UIRow from '../components/UIRow.vue';
import { getTrelloCard } from '../trello';
import { debounce } from '../utils/debounce';
import { disableNotificationsFeature, enableNotificationsFeature, getNotificationPercentage, hasNotificationsFeature, setNotificationPercentage } from '../utils/notifications';

const percentage = ref(80);
const enabled = ref(false);

watch(percentage, debounce(() => {
  percentage.value = Math.max(1, Math.min(percentage.value, 100));
  setNotificationPercentage(percentage.value);
}, 375));

const enable = async () => {
  if (Notification.permission === 'granted') {
    await enableNotificationsFeature();
  } else {
    window.open('./index.html?page=enable-notifications');
  }
};

const disable = async () => {
  await disableNotificationsFeature();
};

const trelloTick = async () => {
  enabled.value = await hasNotificationsFeature();
};

setInterval(async () => {
  const disabled = await getTrelloCard().get('member', 'private', 'act-timer-disable-notifications');

  if (!disabled && Notification.permission === 'granted') {
    const hasNotificationsEnabled = await hasNotificationsFeature();

    if (!hasNotificationsEnabled) {
      await enableNotificationsFeature();
      percentage.value = 80;
    }
  }
}, 1000);

getTrelloCard().render(trelloTick);
trelloTick();

getNotificationPercentage().then((percent) => {
  percentage.value = percent;
});
</script>

<style lang="scss" scoped>
input[type="number"] {
  width: 55px;
}

input[type="range"] {
  padding: 2px 0;
  line-height: 16px;
  height: 16px;
  width: 100%;
  margin-right: 10px;
  margin-top: 10px;
  margin-bottom: 0;

  &::-webkit-slider-thumb {
    width: 10px;
    height: 10px;
    padding: 0;
    background-color: #172B4D;
    appearance: none;
    border-radius: 50%;
  }
}
</style>