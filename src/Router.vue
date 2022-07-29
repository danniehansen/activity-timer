<template>
  <CapabilityCardBackSection v-if="page === 'card-back-section'" />
  <ChangeEstimate v-else-if="page === 'change-estimate'" />
  <MemberSettings v-else-if="page === 'member-settings'" />
  <NotificationSettings v-else-if="page === 'notification-settings'" />
  <Settings v-else-if="page === 'settings'" />
  <DataExporterTime v-else-if="page === 'time'" />
  <DataExporterEstimates v-else-if="page === 'estimates'" />
  <DatetimePicker v-else-if="page === 'datetime'" />
</template>

<script setup lang="ts">
import { getTrelloInstance } from './components/trello';
import CapabilityCardBackSection from './capabilities/card-back-section/view.vue';
import ChangeEstimate from './capabilities/card-back-section/change_estimate.vue';
import MemberSettings from './pages/MemberSettings.vue';
import NotificationSettings from './pages/NotificationSettings.vue';
import Settings from './pages/Settings.vue';
import DataExporterTime from './pages/DataExporter/TimeTracking/index.vue';
import DataExporterEstimates from './pages/DataExporter/Estimates/index.vue';
import DatetimePicker from './components/DatetimePicker.vue';

const t = getTrelloInstance();
const urlSearchParams = new URLSearchParams(window.location.search);

let page: string | null = urlSearchParams.get('page');

if ('args' in t) {
  t.args.forEach((arg) => {
    if (arg && typeof arg.page === 'string') {
      page = arg.page;
    }
  });
}

if (page === 'enable-notifications') {
  Notification.requestPermission()
    .then(() => {
      window.close();
    })
    .catch(() => {
      window.close();
    });
}
</script>

<style lang="scss">
* {
  box-sizing: border-box;
}
</style>
