<template>
  <button v-if="!enabled" class="mod-primary" @click="enable()">Enable notifications</button>
  <button v-else class="mod-danger" @click="disable()">Disable notifications</button>

  <UISlider v-if="enabled" v-model="percentage" :min="1" :max="100" label="Percentage of estimate spent to trigger notification" />
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { getTrelloCard, resizeTrelloFrame } from '../components/trello';
import { debounce } from '../utils/debounce';
import { disableNotificationsFeature, enableNotificationsFeature, getNotificationPercentage, hasNotificationsFeature, setNotificationPercentage } from '../utils/notifications';
import UISlider from '../components/UISlider.vue';

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
  setTimeout(resizeTrelloFrame);
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