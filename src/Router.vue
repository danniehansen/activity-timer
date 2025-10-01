<template>
  <link
    v-if="selectedTheme === 'dark'"
    rel="stylesheet"
    :href="darkTheme"
    @load="onStyleLoaded"
  />
  <link
    v-else-if="selectedTheme === 'light'"
    rel="stylesheet"
    :href="lightTheme"
    @load="onStyleLoaded"
  />

  <CapabilityCardBackSection v-if="page === 'card-back-section'" />
  <ChangeEstimate v-else-if="page === 'change-estimate'" />
  <AddTimeManually v-else-if="page === 'add-time-manually'" />
  <Settings v-else-if="page === 'settings'" />
  <QuickSettings v-else-if="page === 'quick-settings'" />
  <ManageMemberTime v-else-if="page === 'manage-member-time'" />
  <EditTimeRange v-else-if="page === 'edit-time-range'" />
  <AddTimeRange v-else-if="page === 'add-time-range'" />
  <WeekCalendar v-else-if="page === 'calendar'" />
  <DataExporterTime v-else-if="page === 'time'" />
  <DataExporterEstimates v-else-if="page === 'estimates'" />
  <DatetimePicker v-else-if="page === 'datetime'" />
  <HelpPage v-else-if="page === 'help'" />
</template>

<script setup lang="ts">
import { getTrelloInstance, resizeTrelloFrame } from './components/trello';
import CapabilityCardBackSection from './capabilities/card-back-section/view.vue';
import ChangeEstimate from './capabilities/card-back-section/change_estimate.vue';
import AddTimeManually from './capabilities/card-back-section/add_time_manually.vue';
import Settings from './pages/Settings.vue';
import QuickSettings from './pages/QuickSettings.vue';
import ManageMemberTime from './pages/ManageMemberTime.vue';
import EditTimeRange from './pages/EditTimeRange.vue';
import AddTimeRange from './pages/AddTimeRange.vue';
import WeekCalendar from './pages/WeekCalendar/index.vue';
import DataExporterTime from './pages/DataExporter/TimeTracking/index.vue';
import DataExporterEstimates from './pages/DataExporter/Estimates/index.vue';
import DatetimePicker from './components/DatetimePicker.vue';
import HelpPage from './pages/HelpPage.vue';
import { ref } from 'vue';
import lightTheme from 'primevue/resources/themes/bootstrap4-light-blue/theme.css?url';
import darkTheme from 'primevue/resources/themes/bootstrap4-dark-blue/theme.css?url';

const t = getTrelloInstance();
const selectedTheme = ref<string | undefined>();

const onThemeChange = (theme: 'light' | 'dark') => {
  selectedTheme.value = theme;
  setTimeout(resizeTrelloFrame);
};

const onStyleLoaded = () => {
  setTimeout(resizeTrelloFrame);
};

if ('getContext' in t) {
  const context = t.getContext();

  if (context?.theme) {
    onThemeChange(context.theme);
  }

  t.subscribeToThemeChanges(onThemeChange);
}

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
