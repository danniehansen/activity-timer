<template>
  <!-- Saving Entry Loader -->
  <div v-if="savingEntry" class="saving-overlay">
    <div class="saving-spinner">
      <div class="spinner"></div>
      <div class="saving-text">{{ loadingText }}</div>
    </div>
  </div>

  <!-- Success Message Snackbar -->
  <div v-if="showSuccessMessage" class="success-snackbar">
    <i class="pi pi-check-circle"></i>
    {{ successMessage }}
  </div>

  <AuthSplash v-if="isIncognito" type="incognito" feature="calendar" />

  <AuthSplash v-else-if="unrecognizedError" type="error" feature="calendar" />

  <AuthSplash
    v-else-if="!isAuthorized"
    type="unauthorized"
    feature="calendar"
    :rejected-auth="rejectedAuth"
    @authorize="authorize()"
  />

  <div v-else-if="ready && isAuthorized" class="calendar-container">
    <!-- Header with controls -->
    <div class="calendar-header">
      <div class="calendar-controls">
        <Button
          icon="pi pi-chevron-left"
          text
          title="Previous week"
          @click="previousWeek"
        />
        <Button
          icon="pi pi-calendar"
          text
          title="Go to today"
          @click="goToToday"
        />
        <Button
          icon="pi pi-chevron-right"
          text
          title="Next week"
          @click="nextWeek"
        />
        <span class="week-label">{{ weekLabel }}</span>
      </div>

      <div class="calendar-filters">
        <div v-if="!isAdmin || !selectedMember" class="viewing-indicator">
          <i class="pi pi-user"></i>
          <span>Viewing: {{ currentMemberName }}</span>
        </div>
        <HelpButton feature="calendar" title="Learn about Week Calendar" />
        <Button
          icon="pi pi-cog"
          text
          title="Calendar settings"
          @click="toggleSettings"
        />
        <Dropdown
          v-if="isAdmin"
          v-model="selectedMember"
          :options="memberOptions"
          option-label="text"
          option-value="value"
          placeholder="Filter by member"
          class="member-filter"
          show-clear
          @change="onMemberFilterChange"
        />
      </div>
    </div>

    <!-- Settings Modal -->
    <div
      v-if="showSettings"
      class="card-picker-overlay"
      @click="toggleSettings"
    >
      <div class="card-picker-modal settings-modal" @click.stop>
        <div class="card-picker-header">
          <h3>Calendar Settings</h3>
          <button class="close-btn" @click="toggleSettings">×</button>
        </div>
        <div class="settings-modal-content">
          <div class="settings-grid">
            <div class="p-float-label">
              <Dropdown
                v-model="calendarSettings.weekStartDay"
                input-id="week-start"
                :options="weekStartOptions"
                option-label="text"
                option-value="value"
              />
              <label for="week-start">Week starts on</label>
            </div>

            <div class="p-float-label">
              <Dropdown
                v-model="calendarSettings.businessHoursStart"
                input-id="business-start"
                :options="hourOptions"
                option-label="text"
                option-value="value"
              />
              <label for="business-start">Business hours start</label>
            </div>

            <div class="p-float-label">
              <Dropdown
                v-model="calendarSettings.businessHoursEnd"
                input-id="business-end"
                :options="hourOptions"
                option-label="text"
                option-value="value"
              />
              <label for="business-end">Business hours end</label>
            </div>
          </div>
          <div class="settings-stats">
            <div class="stat-item">
              <strong>Total this week:</strong> {{ totalWeekFormatted }}
            </div>
            <div class="stat-item">
              <strong>Average per day:</strong> {{ averageDayFormatted }}
            </div>
          </div>
          <div class="settings-actions">
            <Button
              label="Save Settings"
              icon="pi pi-check"
              @click="saveSettingsAndClose"
            />
          </div>
        </div>
      </div>
    </div>

    <!-- Calendar Grid -->
    <div ref="calendarGridRef" class="calendar-grid">
      <!-- Time column -->
      <div class="time-column">
        <div class="time-header"></div>
        <div
          v-for="hour in 24"
          :key="hour"
          class="time-slot"
          :class="{
            'business-hours':
              hour - 1 >= calendarSettings.businessHoursStart &&
              hour - 1 < calendarSettings.businessHoursEnd
          }"
        >
          {{ formatHour(hour - 1) }}
        </div>
      </div>

      <!-- Day columns -->
      <div
        v-for="day in weekDays"
        :key="day.date.toString()"
        class="day-column"
        :class="{ today: isToday(day.date) }"
      >
        <div class="day-header">
          <div class="day-name">{{ day.name }}</div>
          <div class="day-date">{{ day.dateStr }}</div>
          <div class="day-total">{{ formatDayTotal(day.date) }}</div>
        </div>
        <div
          class="day-content"
          @click="onDayClick($event, day.date)"
          @mousedown="canWrite ? onDayMouseDown($event, day.date) : undefined"
          @mousemove="onDayMouseMove($event, day.date)"
          @mouseup="canWrite ? onDayMouseUp($event, day.date) : undefined"
          @mouseleave="onDayMouseLeave"
          @mouseenter="onDayMouseEnter(day.date)"
          @drop="canWrite ? onDrop($event, day.date) : undefined"
          @dragover="canWrite ? onDragOver($event) : undefined"
        >
          <!-- Hour slots for grid lines -->
          <div
            v-for="hour in 24"
            :key="hour"
            class="hour-slot"
            :class="{
              'business-hours':
                hour - 1 >= calendarSettings.businessHoursStart &&
                hour - 1 < calendarSettings.businessHoursEnd
            }"
          ></div>

          <!-- Cursor time indicator -->
          <div
            v-if="
              hoverDate &&
              isSameDay(hoverDate, day.date) &&
              hoverTime !== null &&
              !creatingEntry &&
              !hoveringOverEntry &&
              !draggedEntry &&
              !resizingEntry
            "
            class="cursor-time-indicator"
            :style="getCursorIndicatorStyle()"
          >
            <div class="cursor-time-line"></div>
            <div class="cursor-time-label">{{ formatCursorTime() }}</div>
          </div>

          <!-- Drag preview -->
          <div
            v-if="
              draggedEntry &&
              dragPreviewDate &&
              isSameDay(dragPreviewDate, day.date)
            "
            class="time-entry drag-preview"
            :style="getDragPreviewStyle()"
          >
            <div class="entry-content">
              <div class="entry-title">{{ draggedEntry.cardName }}</div>
            </div>
          </div>

          <!-- New entry preview -->
          <div
            v-if="
              newEntryDate &&
              isSameDay(newEntryDate, day.date) &&
              newEntryStart &&
              newEntryEnd
            "
            class="time-entry drag-preview"
            :style="getNewEntryStyle()"
          >
            <div class="entry-content">
              <div class="entry-title">New Time Entry</div>
            </div>
          </div>

          <!-- Time entries -->
          <div
            v-for="entry in getEntriesForDay(day.date)"
            :key="entry.id"
            class="time-entry"
            :class="{
              stacked: entry.isStacked,
              dragging: draggedEntry?.id === entry.id,
              'multi-day': entry.isMultiDay,
              'running-timer': entry.isRunning,
              'read-only': !canWrite
            }"
            :style="getEntryStyle(entry)"
            :draggable="canWrite && !entry.isMultiDay && !entry.isRunning"
            @dragstart="canWrite ? onDragStart($event, entry) : undefined"
            @dragend="canWrite ? onDragEnd : undefined"
            @click.stop="onEntryClick(entry)"
            @mousedown="canWrite ? onEntryMouseDown($event, entry) : undefined"
            @mouseenter="onEntryMouseEnter"
            @mouseleave="onEntryMouseLeave"
          >
            <div class="entry-content">
              <div class="entry-title">
                {{ entry.cardName }}
                <span v-if="entry.isMultiDay" class="multi-day-badge"
                  >Multi-day</span
                >
                <span v-if="entry.isRunning" class="running-badge"
                  >● Running</span
                >
              </div>
              <div class="entry-time">
                {{ formatEntryTime(entry) }}
              </div>
            </div>
            <button
              v-if="canWrite && !entry.isRunning"
              class="delete-entry-btn"
              title="Delete time entry"
              @click.stop="onDeleteEntry(entry, $event)"
              @mousedown.stop
            >
              <i class="pi pi-trash"></i>
            </button>
            <div
              v-if="canWrite && !entry.isMultiDay && !entry.isRunning"
              class="resize-handle resize-top"
              @mousedown.stop="onResizeStart($event, entry, 'top')"
            ></div>
            <div
              v-if="canWrite && !entry.isMultiDay && !entry.isRunning"
              class="resize-handle resize-bottom"
              @mousedown.stop="onResizeStart($event, entry, 'bottom')"
            ></div>
          </div>
        </div>
      </div>
    </div>

    <!-- Card Picker Modal -->
    <div
      v-if="showCardPicker"
      class="card-picker-overlay"
      @click="cancelCardSelection"
    >
      <div class="card-picker-modal" @click.stop>
        <div class="card-picker-header">
          <h3>Select Card for Time Entry</h3>
          <button class="close-btn" @click="cancelCardSelection">×</button>
        </div>
        <div class="card-picker-search">
          <input
            ref="cardSearchInput"
            v-model="cardSearchTerm"
            type="text"
            placeholder="Search cards..."
            class="card-search-input"
          />
        </div>
        <div class="card-picker-list">
          <div
            v-for="card in filteredCards.slice(0, 10)"
            :key="card.id"
            class="card-picker-item"
            @click="createTimeEntry(card.id)"
          >
            {{ card.name }}
          </div>
          <div v-if="filteredCards.length === 0" class="card-picker-empty">
            No cards found
          </div>
          <div v-if="filteredCards.length > 10" class="card-picker-info">
            Showing first 10 of {{ filteredCards.length }} cards. Use search to
            narrow down.
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue';
import {
  clearToken,
  getMemberId,
  getTrelloCard,
  getTrelloInstance,
  isAuthorized as checkAuthorization
} from '../../components/trello';
import { Trello } from '../../types/trello';
import { formatTime } from '../../utils/formatting';
import { Range } from '../../components/range';
import { Card } from '../../components/card';
import { Timer } from '../../components/timer';
import {
  CalendarSettings,
  getCalendarSettings,
  setCalendarSettings
} from '../../components/settings';
import * as Sentry from '@sentry/vue';
import AuthSplash from '../../components/AuthSplash.vue';
import HelpButton from '../../components/HelpButton.vue';

interface TimeEntry {
  id: string;
  cardId: string;
  cardName: string;
  start: Date;
  end: Date;
  memberId: string;
  range: {
    memberId: string;
    start: number;
    end: number;
    diff: number;
    rangeId: number;
    serialize: () => [string, number, number];
  };
  isStacked: boolean;
  stackOffset: number;
  isMultiDay: boolean;
  originalStart: Date;
  originalEnd: Date;
  isRunning?: boolean;
}

interface DayInfo {
  name: string;
  date: Date;
  dateStr: string;
}

const isAuthorized = ref(false);
const isIncognito = ref(false);
const unrecognizedError = ref(false);
const rejectedAuth = ref(false);
const ready = ref(false);
const showSettings = ref(false);
const isAdmin = ref(false);
const canWrite = ref(false);
const selectedMember = ref<string | null>(null);
const currentWeekStart = ref(new Date());
const calendarGridRef = ref<HTMLElement | null>(null);

const memberOptions = ref<{ text: string; value: string }[]>([]);
const memberById: { [key: string]: Trello.PowerUp.Member } = {};
const cardById: { [key: string]: Trello.PowerUp.Card } = {};
const timeEntries = ref<TimeEntry[]>([]); // All entries, unfiltered

const calendarSettings = ref<CalendarSettings>({
  weekStartDay: 1,
  businessHoursStart: 8,
  businessHoursEnd: 18
});

// Computed property that filters entries by week and member
const timeEntriesFiltered = computed(() => {
  // Compute week start/end directly to avoid initialization order issues
  const d = new Date(currentWeekStart.value);
  const day = d.getDay();
  const startDay = calendarSettings.value.weekStartDay;
  const diff = day < startDay ? 7 - startDay + day : day - startDay;
  d.setDate(d.getDate() - diff);
  d.setHours(0, 0, 0, 0);
  const weekStart = d;

  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);
  weekEnd.setHours(23, 59, 59, 999);

  return timeEntries.value.filter((entry) => {
    // Filter by member if specified
    if (
      isAdmin.value &&
      selectedMember.value &&
      entry.memberId !== selectedMember.value
    ) {
      return false;
    }

    // Filter by week - include entries that overlap with the current week
    const entryStart = new Date(entry.start);
    const entryEnd = new Date(entry.end);

    // Entry overlaps with week if it starts before week ends and ends after week starts
    return entryStart <= weekEnd && entryEnd >= weekStart;
  });
});

// Watch for changes to filtered entries and recalculate overlaps
watch(
  timeEntriesFiltered,
  () => {
    detectOverlaps();
  },
  { immediate: true }
);

const weekStartOptions = [
  { text: 'Sunday', value: 0 },
  { text: 'Monday', value: 1 }
];

const hourOptions = Array.from({ length: 24 }, (_, i) => ({
  text: formatHour(i),
  value: i
}));

// Drag and resize state
const draggedEntry = ref<TimeEntry | null>(null);
const dragPreviewDate = ref<Date | null>(null);
const dragPreviewTop = ref(0);
const dragOffsetY = ref(0); // Offset from the top of the entry where user grabbed it
const resizingEntry = ref<TimeEntry | null>(null);
const resizeDirection = ref<'top' | 'bottom' | null>(null);
const resizeStartY = ref(0);
const resizeStartTime = ref(0);
const justFinishedResizing = ref(false);

// New time entry creation state
const creatingEntry = ref(false);
const newEntryStart = ref<Date | null>(null);
const newEntryEnd = ref<Date | null>(null);
const newEntryDate = ref<Date | null>(null);
const newEntryHoverY = ref(0);
const creationStartTime = ref(0);

// Cursor time indicator state
const hoverDate = ref<Date | null>(null);
const hoverTime = ref<number | null>(null); // Minutes from midnight
const hoveringOverEntry = ref(false);

// Card picker state
const showCardPicker = ref(false);
const cardSearchTerm = ref('');
const allCards = ref<Array<{ id: string; name: string }>>([]);
const cardSearchInput = ref<HTMLInputElement | null>(null);
const savingEntry = ref(true); // Start with loader visible
const loadingText = ref('Loading calendar...');
const showSuccessMessage = ref(false);
const successMessage = ref('');

const filteredCards = computed(() => {
  const term = cardSearchTerm.value.toLowerCase().trim();
  if (!term) return allCards.value;
  return allCards.value.filter((card) =>
    card.name.toLowerCase().includes(term)
  );
});

function formatHour(hour: number): string {
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 || 12;
  return `${displayHour} ${ampm}`;
}

function getWeekStart(date: Date, startDay: 0 | 1): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day < startDay ? 7 - startDay + day : day - startDay;
  d.setDate(d.getDate() - diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function getWeekDays(startDate: Date): DayInfo[] {
  const days: DayInfo[] = [];
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  for (let i = 0; i < 7; i++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);
    days.push({
      name: dayNames[date.getDay()],
      date: date,
      dateStr: `${date.getMonth() + 1}/${date.getDate()}`
    });
  }

  return days;
}

const weekDays = computed(() =>
  getWeekDays(
    getWeekStart(currentWeekStart.value, calendarSettings.value.weekStartDay)
  )
);

const weekLabel = computed(() => {
  const start = weekDays.value[0].date;
  const end = weekDays.value[6].date;
  const startStr = `${start.toLocaleDateString('en-US', {
    month: 'short'
  })} ${start.getDate()}`;
  const endStr = `${end.toLocaleDateString('en-US', {
    month: 'short'
  })} ${end.getDate()}, ${end.getFullYear()}`;
  return `${startStr} - ${endStr}`;
});

const currentMemberName = computed(() => {
  return 'Your Time Entries';
});

function isToday(date: Date): boolean {
  const today = new Date();
  return (
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
  );
}

function isSameDay(date1: Date, date2: Date): boolean {
  return (
    date1.getDate() === date2.getDate() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getFullYear() === date2.getFullYear()
  );
}

function getDragPreviewStyle(): Record<string, string> {
  if (!draggedEntry.value) return {};

  const duration =
    draggedEntry.value.end.getTime() - draggedEntry.value.start.getTime();
  const durationMinutes = duration / (60 * 1000);

  // Each hour is 60px tall, so calculate height in pixels
  // heightPx = (minutes / 60 minutes per hour) * 60 pixels per hour = minutes in pixels
  const heightPx = durationMinutes;
  const topPx = (dragPreviewTop.value / 100) * (24 * 60);

  return {
    top: `${topPx}px`,
    height: `${heightPx}px`
  };
}

function previousWeek() {
  const newDate = new Date(currentWeekStart.value);
  newDate.setDate(newDate.getDate() - 7);
  currentWeekStart.value = newDate;
}

function nextWeek() {
  const newDate = new Date(currentWeekStart.value);
  newDate.setDate(newDate.getDate() + 7);
  currentWeekStart.value = newDate;
}

function goToToday() {
  currentWeekStart.value = new Date();
}

function toggleSettings() {
  showSettings.value = !showSettings.value;
}

async function saveSettings() {
  await setCalendarSettings(calendarSettings.value);
  // Recalculate week days when start day changes
  currentWeekStart.value = new Date(currentWeekStart.value);
}

async function saveSettingsAndClose() {
  await saveSettings();

  // Show success message
  successMessage.value = 'Settings saved successfully!';
  showSuccessMessage.value = true;

  // Close the settings modal
  showSettings.value = false;

  // Hide success message after 3 seconds
  setTimeout(() => {
    showSuccessMessage.value = false;
  }, 3000);
}

function getEntriesForDay(date: Date): TimeEntry[] {
  return timeEntriesFiltered.value.filter((entry) => {
    const entryDate = new Date(entry.start);
    return (
      entryDate.getDate() === date.getDate() &&
      entryDate.getMonth() === date.getMonth() &&
      entryDate.getFullYear() === date.getFullYear()
    );
  });
}

function getEntryStyle(entry: TimeEntry): Record<string, string> {
  const startHour = entry.start.getHours();
  const startMinute = entry.start.getMinutes();
  const endHour = entry.end.getHours();
  const endMinute = entry.end.getMinutes();

  const topPercent = ((startHour * 60 + startMinute) / (24 * 60)) * 100;
  const heightPercent =
    ((endHour * 60 + endMinute - (startHour * 60 + startMinute)) / (24 * 60)) *
    100;

  const style: Record<string, string> = {
    top: `${topPercent}%`,
    height: `${heightPercent}%`
  };

  if (entry.isStacked) {
    style.left = `${entry.stackOffset * 5}px`;
    style.width = 'calc(100% - ' + (entry.stackOffset * 5 + 5) + 'px)';
  }

  return style;
}

function formatEntryTime(entry: TimeEntry): string {
  const startTime = entry.start.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
  const endTime = entry.end.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
  const duration = Math.round(
    (entry.end.getTime() - entry.start.getTime()) / 1000
  );
  return `${startTime} - ${endTime} (${formatTime(duration, true)})`;
}

function formatDayTotal(date: Date): string {
  const entries = getEntriesForDay(date);
  const total = entries.reduce((sum, entry) => {
    return sum + (entry.end.getTime() - entry.start.getTime()) / 1000;
  }, 0);
  return total > 0 ? formatTime(Math.floor(total), true) : '';
}

const totalWeekFormatted = computed(() => {
  const total = timeEntriesFiltered.value.reduce((sum, entry) => {
    return sum + (entry.end.getTime() - entry.start.getTime()) / 1000;
  }, 0);
  return formatTime(Math.floor(total), true);
});

const averageDayFormatted = computed(() => {
  const total = timeEntriesFiltered.value.reduce((sum, entry) => {
    return sum + (entry.end.getTime() - entry.start.getTime()) / 1000;
  }, 0);
  const average = total / 7;
  return formatTime(Math.floor(average), true);
});

// Drag and drop handlers
function onDragStart(event: DragEvent, entry: TimeEntry) {
  event.stopPropagation();

  // Clear any previous drag state first
  dragPreviewDate.value = null;
  dragPreviewTop.value = 0;
  dragOffsetY.value = 0;

  draggedEntry.value = entry;

  // Calculate the offset from where the user grabbed the entry
  const target = event.currentTarget as HTMLElement;
  const rect = target.getBoundingClientRect();
  dragOffsetY.value = event.clientY - rect.top;

  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/html', '');
    // Create a transparent drag image to hide default
    const img = new Image();
    img.src =
      'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
    event.dataTransfer.setDragImage(img, 0, 0);
  }
}

function onDragEnd(event: DragEvent) {
  event.stopPropagation();
  draggedEntry.value = null;
  dragPreviewDate.value = null;
  dragOffsetY.value = 0; // Clear offset to prevent flickering
}

function onDragOver(event: DragEvent) {
  event.preventDefault();
  event.stopPropagation();
  if (event.dataTransfer) {
    event.dataTransfer.dropEffect = 'move';
  }

  // Show preview of where it will drop
  if (draggedEntry.value) {
    const target = event.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();

    // Calculate position accounting for where user grabbed the entry
    const y = event.clientY - rect.top - dragOffsetY.value;
    const percentY = Math.max(0, Math.min(1, y / rect.height));
    const totalMinutes = percentY * 24 * 60;
    const roundedMinutes = Math.round(totalMinutes / 15) * 15;

    dragPreviewTop.value = (roundedMinutes / (24 * 60)) * 100;

    // Update the preview date to the current column
    const dayColumn = target.closest('.day-column');
    if (dayColumn) {
      const dayIndex =
        Array.from(dayColumn.parentElement?.children || []).indexOf(dayColumn) -
        1;
      if (dayIndex >= 0 && weekDays.value[dayIndex]) {
        dragPreviewDate.value = weekDays.value[dayIndex].date;
      }
    }
  }
}

function onDrop(event: DragEvent, date: Date) {
  event.preventDefault();
  event.stopPropagation();

  if (!draggedEntry.value) return;

  const target = event.currentTarget as HTMLElement;
  const rect = target.getBoundingClientRect();

  // Calculate position accounting for where user grabbed the entry
  const y = event.clientY - rect.top - dragOffsetY.value;
  const percentY = y / rect.height;
  const totalMinutes = percentY * 24 * 60;

  // Round to nearest 15 minutes
  const roundedMinutes = Math.round(totalMinutes / 15) * 15;
  const hours = Math.floor(roundedMinutes / 60);
  const minutes = roundedMinutes % 60;

  const duration =
    draggedEntry.value.end.getTime() - draggedEntry.value.start.getTime();

  const newStart = new Date(date);
  newStart.setHours(hours, minutes, 0, 0);

  const newEnd = new Date(newStart.getTime() + duration);

  updateTimeEntry(draggedEntry.value, newStart, newEnd);

  // Clear all drag state
  draggedEntry.value = null;
  dragPreviewDate.value = null;
  dragPreviewTop.value = 0;
  dragOffsetY.value = 0;
}

function onDayClick(_event: MouseEvent, _date: Date) {
  // Click is now handled by mousedown/mouseup flow
  // Kept for future use if needed
}

function onDayMouseDown(event: MouseEvent, date: Date) {
  // Check if clicking on an existing entry or resize handle
  const target = event.target as HTMLElement;
  if (
    target.closest('.time-entry') ||
    target.classList.contains('resize-handle')
  ) {
    return;
  }

  creatingEntry.value = true;
  creationStartTime.value = Date.now();

  const container = event.currentTarget as HTMLElement;
  const rect = container.getBoundingClientRect();
  const y = event.clientY - rect.top;
  const percentY = y / rect.height;
  const totalMinutes = percentY * 24 * 60;
  const roundedMinutes = Math.round(totalMinutes / 15) * 15;
  const hours = Math.floor(roundedMinutes / 60);
  const minutes = roundedMinutes % 60;

  const start = new Date(date);
  start.setHours(hours, minutes, 0, 0);

  newEntryStart.value = start;
  newEntryEnd.value = new Date(start);
  newEntryDate.value = date;
}

function onDayMouseMove(event: MouseEvent, date: Date) {
  const container = event.currentTarget as HTMLElement;
  const rect = container.getBoundingClientRect();
  const y = event.clientY - rect.top;
  const percentY = Math.max(0, Math.min(1, y / rect.height));
  const totalMinutes = percentY * 24 * 60;
  const roundedMinutes = Math.round(totalMinutes / 15) * 15;

  // Update cursor indicator
  hoverDate.value = date;
  hoverTime.value = roundedMinutes;

  // Handle creation entry dragging
  if (creatingEntry.value && newEntryStart.value) {
    const hours = Math.floor(roundedMinutes / 60);
    const minutes = roundedMinutes % 60;

    const currentTime = new Date(date);
    currentTime.setHours(hours, minutes, 0, 0);

    // Update end time based on cursor position
    if (currentTime > newEntryStart.value) {
      newEntryEnd.value = currentTime;
    } else {
      // If dragging upwards, adjust start instead
      newEntryEnd.value = newEntryStart.value;
      newEntryStart.value = currentTime;
    }

    newEntryHoverY.value = y;
  }
}

function onDayMouseUp(_event: MouseEvent, _date: Date) {
  if (!creatingEntry.value) return;

  const mouseHoldTime = Date.now() - creationStartTime.value;
  creatingEntry.value = false;

  // Only create if we have a valid duration (at least 15 minutes)
  if (newEntryStart.value && newEntryEnd.value) {
    const duration =
      newEntryEnd.value.getTime() - newEntryStart.value.getTime();
    const minDuration = 15 * 60 * 1000;

    // If mouse was held for less than 200ms and didn't move much, treat as click
    const isQuickClick = mouseHoldTime < 200 && duration < minDuration;

    if (isQuickClick) {
      // Quick click - create 15 minute entry
      newEntryEnd.value = new Date(newEntryStart.value);
      newEntryEnd.value.setMinutes(newEntryEnd.value.getMinutes() + 15);
      promptForCard();
    } else if (duration >= minDuration) {
      // Dragged for valid duration - prompt for card selection
      promptForCard();
    } else {
      // Duration too small - clear
      newEntryStart.value = null;
      newEntryEnd.value = null;
      newEntryDate.value = null;
    }
  }
}

function onDayMouseEnter(date: Date) {
  hoverDate.value = date;
}

function onDayMouseLeave() {
  // Clear cursor indicator
  hoverDate.value = null;
  hoverTime.value = null;

  // Cancel creation if mouse leaves
  if (creatingEntry.value) {
    creatingEntry.value = false;
    newEntryStart.value = null;
    newEntryEnd.value = null;
    newEntryDate.value = null;
  }
}

function getNewEntryStyle(): Record<string, string> {
  if (!newEntryStart.value || !newEntryEnd.value) return {};

  const startMinutes =
    newEntryStart.value.getHours() * 60 + newEntryStart.value.getMinutes();
  const endMinutes =
    newEntryEnd.value.getHours() * 60 + newEntryEnd.value.getMinutes();

  const topPx = startMinutes;
  const heightPx = endMinutes - startMinutes;

  return {
    top: `${topPx}px`,
    height: `${heightPx}px`
  };
}

function getCursorIndicatorStyle(): Record<string, string> {
  if (hoverTime.value === null) return {};

  return {
    top: `${hoverTime.value}px`
  };
}

function formatCursorTime(): string {
  if (hoverTime.value === null) return '';

  const hours = Math.floor(hoverTime.value / 60);
  const minutes = hoverTime.value % 60;
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const displayHour = hours % 12 || 12;
  const displayMinutes = minutes.toString().padStart(2, '0');

  return `${displayHour}:${displayMinutes} ${ampm}`;
}

async function promptForCard() {
  showCardPicker.value = true;
  cardSearchTerm.value = '';

  // Load cards if not already loaded
  if (allCards.value.length === 0) {
    try {
      allCards.value = await getTrelloInstance().cards('id', 'name');
    } catch (error) {
      console.error('Failed to load cards:', error);
      await getTrelloCard().alert({
        message: 'Failed to load cards',
        display: 'error',
        duration: 5
      });
    }
  }

  // Focus the search input after the modal is rendered
  await nextTick();
  cardSearchInput.value?.focus();
}

async function createTimeEntry(cardId: string) {
  if (!newEntryStart.value || !newEntryEnd.value) return;

  // Close card picker and show loading
  showCardPicker.value = false;
  savingEntry.value = true;
  loadingText.value = 'Creating time entry...';

  try {
    const memberId = await getMemberId();
    const startUnix = Math.floor(newEntryStart.value.getTime() / 1000);
    const endUnix = Math.floor(newEntryEnd.value.getTime() / 1000);

    const card = new Card(cardId);
    const ranges = await card.getRanges();
    const range = new Range(memberId, startUnix, endUnix);
    ranges.add(range);
    await ranges.save();

    // Wait 2 seconds before reloading
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Reload entries to show the new one
    await loadTimeEntries();

    // Clear creation state
    newEntryStart.value = null;
    newEntryEnd.value = null;
    newEntryDate.value = null;

    await getTrelloCard().alert({
      message: 'Time entry created successfully',
      display: 'success',
      duration: 3
    });
  } catch (error) {
    Sentry.captureException(error);
    console.error('Failed to create time entry:', error);
    await getTrelloCard().alert({
      message: 'Failed to create time entry',
      display: 'error',
      duration: 5
    });
  } finally {
    savingEntry.value = false;
  }
}

function cancelCardSelection() {
  showCardPicker.value = false;
  newEntryStart.value = null;
  newEntryEnd.value = null;
  newEntryDate.value = null;
}

function onEntryClick(entry: TimeEntry) {
  // Don't open if we just finished resizing
  if (justFinishedResizing.value) {
    justFinishedResizing.value = false;
    return;
  }
  // Open the card
  getTrelloCard().showCard(entry.cardId);
}

function onEntryMouseEnter() {
  hoveringOverEntry.value = true;
}

function onEntryMouseLeave() {
  hoveringOverEntry.value = false;
}

async function onDeleteEntry(entry: TimeEntry, event: MouseEvent) {
  const trello = getTrelloInstance<Trello.PowerUp.IFrame>();

  trello.popup({
    type: 'confirm',
    title: 'Delete Time Entry',
    message: `Are you sure you want to delete this time entry?\n\nCard: ${
      entry.cardName
    }\nTime: ${formatEntryTime(entry)}`,
    confirmText: 'Delete',
    confirmStyle: 'danger',
    cancelText: 'Cancel',
    mouseEvent: event,
    onConfirm: async (t) => {
      try {
        savingEntry.value = true;
        loadingText.value = 'Deleting time entry...';

        // Load the card and its ranges
        const cardModel = new Card(entry.cardId);
        const ranges = await cardModel.getRanges();

        // Filter out the range we want to delete by matching the actual data
        // (memberId, start, and end times from the original range)
        const filteredRanges = ranges.filter(
          (range) =>
            !(
              range.memberId === entry.range.memberId &&
              range.start === entry.range.start &&
              range.end === entry.range.end
            )
        );

        // Save the updated ranges
        await trello.set(
          entry.cardId,
          'shared',
          'act-timer-ranges',
          filteredRanges.serialize()
        );

        // Wait a bit to ensure the data is saved
        await new Promise((resolve) => setTimeout(resolve, 500));

        // Reload time entries
        await loadTimeEntries();
      } catch (error) {
        Sentry.captureException(error);
        console.debug('Failed to delete time entry:', error);
        alert('Failed to delete time entry. Please try again.');
      } finally {
        savingEntry.value = false;
      }

      return t.closePopup();
    },
    onCancel: (t) => t.closePopup()
  });
}

// Resize handlers
function onEntryMouseDown(event: MouseEvent, _entry: TimeEntry) {
  // Prevent starting drag when clicking resize handles or delete button
  const target = event.target as HTMLElement;
  if (
    target.classList.contains('resize-handle') ||
    target.classList.contains('delete-entry-btn') ||
    target.closest('.delete-entry-btn')
  ) {
    event.stopPropagation();
  }
}

function onResizeStart(
  event: MouseEvent,
  entry: TimeEntry,
  direction: 'top' | 'bottom'
) {
  event.preventDefault();
  event.stopPropagation();

  resizingEntry.value = entry;
  resizeDirection.value = direction;
  resizeStartY.value = event.clientY;
  resizeStartTime.value =
    direction === 'top' ? entry.start.getTime() : entry.end.getTime();

  // Prevent the modal from closing by using capture phase
  const handleMouseMove = (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onResizeMove(e);
  };
  const handleMouseUp = (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    justFinishedResizing.value = true;
    onResizeEnd();

    // Clear the flag after a short delay
    setTimeout(() => {
      justFinishedResizing.value = false;
    }, 200);

    document.removeEventListener('mousemove', handleMouseMove, true);
    document.removeEventListener('mouseup', handleMouseUp, true);
  };

  document.addEventListener('mousemove', handleMouseMove, true);
  document.addEventListener('mouseup', handleMouseUp, true);
}

function onResizeMove(event: MouseEvent) {
  event.preventDefault();
  event.stopPropagation();

  if (!resizingEntry.value || !resizeDirection.value) return;

  const dayColumn = (event.target as HTMLElement).closest('.day-content');
  if (!dayColumn) return;

  const rect = dayColumn.getBoundingClientRect();
  const y = event.clientY - rect.top;
  const percentY = y / rect.height;
  const totalMinutes = percentY * 24 * 60;

  // Round to nearest 15 minutes
  const roundedMinutes = Math.round(totalMinutes / 15) * 15;
  const hours = Math.floor(roundedMinutes / 60);
  const minutes = roundedMinutes % 60;

  const minDuration = 15 * 60 * 1000; // 15 minutes in milliseconds

  if (resizeDirection.value === 'top') {
    const newStart = new Date(resizingEntry.value.start);
    newStart.setHours(hours, minutes, 0, 0);

    // Ensure at least 15 minutes duration
    const newDuration = resizingEntry.value.end.getTime() - newStart.getTime();
    if (newDuration >= minDuration) {
      resizingEntry.value.start = newStart;
    }
  } else {
    const newEnd = new Date(resizingEntry.value.end);
    newEnd.setHours(hours, minutes, 0, 0);

    // Ensure at least 15 minutes duration
    const newDuration = newEnd.getTime() - resizingEntry.value.start.getTime();
    if (newDuration >= minDuration) {
      resizingEntry.value.end = newEnd;
    }
  }
}

function onResizeEnd() {
  if (resizingEntry.value) {
    updateTimeEntry(
      resizingEntry.value,
      resizingEntry.value.start,
      resizingEntry.value.end
    );
  }

  resizingEntry.value = null;
  resizeDirection.value = null;
}

async function updateTimeEntry(entry: TimeEntry, newStart: Date, newEnd: Date) {
  // Show loading overlay
  savingEntry.value = true;
  loadingText.value = 'Saving changes...';

  try {
    const card = new Card(entry.cardId);
    const ranges = await card.getRanges();

    // Find the range by matching memberId, start, and end times
    // rangeId is not reliable as it's just an incrementing counter that resets
    const originalStartUnix = Math.floor(entry.originalStart.getTime() / 1000);
    const originalEndUnix = Math.floor(entry.originalEnd.getTime() / 1000);

    const rangeToUpdate = ranges.items.find(
      (r) =>
        r.memberId === entry.memberId &&
        r.start === originalStartUnix &&
        r.end === originalEndUnix
    );

    if (rangeToUpdate) {
      // Update the range times
      rangeToUpdate.start = Math.floor(newStart.getTime() / 1000);
      rangeToUpdate.end = Math.floor(newEnd.getTime() / 1000);

      // Save the updated ranges
      await ranges.save();
    } else {
      console.error('Range details:', {
        isMultiDay: entry.isMultiDay,
        memberId: entry.memberId,
        originalStart: entry.originalStart,
        originalEnd: entry.originalEnd,
        originalStartUnix,
        originalEndUnix,
        availableRanges: ranges.items.map((r) => ({
          memberId: r.memberId,
          start: r.start,
          end: r.end
        }))
      });
      throw new Error('Range not found in card ranges');
    }

    // Wait at least 500ms before reloading
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Reload entries to ensure consistency
    await loadTimeEntries();

    await getTrelloCard().alert({
      message: 'Time entry updated successfully',
      display: 'success',
      duration: 2
    });
  } catch (error) {
    Sentry.captureException(error);
    console.error('Failed to update time entry:', error);
    await getTrelloCard().alert({
      message: 'Failed to update time entry',
      display: 'error',
      duration: 5
    });
  } finally {
    savingEntry.value = false;
  }
}

function detectOverlaps() {
  // Group entries by day
  const entriesByDay = new Map<string, TimeEntry[]>();

  timeEntriesFiltered.value.forEach((entry) => {
    const key = `${entry.start.getFullYear()}-${entry.start.getMonth()}-${entry.start.getDate()}`;
    if (!entriesByDay.has(key)) {
      entriesByDay.set(key, []);
    }
    entriesByDay.get(key)!.push(entry);
  });

  // Check for overlaps within each day
  entriesByDay.forEach((entries) => {
    entries.forEach((entry) => {
      entry.isStacked = false;
      entry.stackOffset = 0;
    });

    for (let i = 0; i < entries.length; i++) {
      for (let j = i + 1; j < entries.length; j++) {
        const entry1 = entries[i];
        const entry2 = entries[j];

        if (entry1.start < entry2.end && entry1.end > entry2.start) {
          entry2.isStacked = true;
          entry2.stackOffset = entry1.stackOffset + 1;
        }
      }
    }
  });
}

async function onMemberFilterChange() {
  await loadTimeEntries();
}

async function loadTimeEntries() {
  const startTime = Date.now();
  savingEntry.value = true; // Show loading spinner
  loadingText.value = 'Loading time entries...';

  try {
    // Get cards directly from the board (only active cards, not archived)
    const data = await getTrelloInstance().cards('id', 'name');

    const entries: TimeEntry[] = [];

    // Process each card to get time ranges - load ALL entries, no filtering
    for (const card of data) {
      cardById[card.id] = card;

      const cardModel = new Card(card.id);
      const ranges = await cardModel.getRanges();

      ranges.items.forEach((range) => {
        const startDate = new Date(range.start * 1000);
        const endDate = new Date(range.end * 1000);

        // Split entries that span multiple days
        const currentDate = new Date(startDate);
        currentDate.setHours(0, 0, 0, 0);

        const isMultiDay =
          startDate.getDate() !== endDate.getDate() ||
          startDate.getMonth() !== endDate.getMonth() ||
          startDate.getFullYear() !== endDate.getFullYear();

        while (currentDate <= endDate) {
          const dayStart = new Date(currentDate);
          const dayEnd = new Date(currentDate);
          dayEnd.setHours(23, 59, 59, 999);

          const segmentStart =
            currentDate.getTime() === dayStart.getTime() && startDate > dayStart
              ? startDate
              : dayStart;
          const segmentEnd = endDate < dayEnd ? endDate : dayEnd;

          // Only add if segment has actual duration
          if (segmentStart < segmentEnd) {
            const entry: TimeEntry = {
              id: `${card.id}-${range.rangeId}-${currentDate.getTime()}`,
              cardId: card.id,
              cardName: card.name,
              start: new Date(segmentStart),
              end: new Date(segmentEnd),
              memberId: range.memberId,
              range: range,
              isStacked: false,
              stackOffset: 0,
              isMultiDay: isMultiDay,
              originalStart: startDate,
              originalEnd: endDate,
              isRunning: false
            };
            entries.push(entry);
          }

          // Move to next day
          currentDate.setDate(currentDate.getDate() + 1);
          currentDate.setHours(0, 0, 0, 0);
        }
      });
    }

    // Query active running timers and add them to the entries
    const currentMemberId = await getMemberId();

    for (const card of data) {
      const cardModel = new Card(card.id);
      const cardTimers = await cardModel.getTimers();

      // Determine which member(s) to check for running timers
      let timersToCheck: Timer[] = [];

      if (isAdmin.value && selectedMember.value) {
        // Admin viewing a specific member: check only that member's timer
        const timer = cardTimers.getByMemberId(selectedMember.value);
        if (timer) timersToCheck.push(timer);
      } else if (isAdmin.value && !selectedMember.value) {
        // Admin viewing all members: check all timers
        timersToCheck = cardTimers.items;
      } else {
        // Regular user: check only their own timer
        const timer = cardTimers.getByMemberId(currentMemberId);
        if (timer) timersToCheck.push(timer);
      }

      timersToCheck.forEach((timer) => {
        const startDate = new Date(timer.start * 1000);
        const now = new Date();

        // Add running timer entry for today
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const runningEntry: TimeEntry = {
          id: `${card.id}-running-${timer.memberId}`,
          cardId: card.id,
          cardName: card.name,
          start: startDate > today ? startDate : today,
          end: now,
          memberId: timer.memberId,
          range: new Range(
            timer.memberId,
            timer.start,
            Math.floor(now.getTime() / 1000)
          ),
          isStacked: false,
          stackOffset: 0,
          isMultiDay:
            startDate.getDate() !== now.getDate() ||
            startDate.getMonth() !== now.getMonth() ||
            startDate.getFullYear() !== now.getFullYear(),
          originalStart: startDate,
          originalEnd: now,
          isRunning: true
        };
        entries.push(runningEntry);
      });
    }

    timeEntries.value = entries;

    // Ensure loading shows for at least 2 seconds
    const elapsedTime = Date.now() - startTime;
    const remainingTime = Math.max(0, 2000 - elapsedTime);
    if (remainingTime > 0) {
      await new Promise((resolve) => setTimeout(resolve, remainingTime));
    }
  } catch (e) {
    Sentry.captureException(e);
    console.error('Failed to load time entries:', e);

    // Ensure loading shows for at least 2 seconds even on error
    const elapsedTime = Date.now() - startTime;
    const remainingTime = Math.max(0, 2000 - elapsedTime);
    if (remainingTime > 0) {
      await new Promise((resolve) => setTimeout(resolve, remainingTime));
    }
  } finally {
    savingEntry.value = false; // Hide loading spinner
    loadingText.value = 'Saving changes...'; // Reset to default
  }
}

async function initialize() {
  try {
    // Show loader for initialization
    savingEntry.value = true;
    loadingText.value = 'Initializing calendar...';

    // Load calendar settings
    calendarSettings.value = await getCalendarSettings();

    // Initialize week start
    currentWeekStart.value = getWeekStart(
      new Date(),
      calendarSettings.value.weekStartDay
    );

    // Get board members
    const board = await getTrelloInstance().board('members', 'memberships');

    board.members.forEach((member) => {
      memberById[member.id] = member;
    });

    // Check if current user is admin
    const currentMember = await getTrelloInstance().member('id');
    const membership = board.memberships?.find(
      (m) => m.idMember === currentMember.id
    );
    isAdmin.value = membership?.memberType === 'admin';

    // Check if current user can write to the board
    canWrite.value = await getTrelloCard().memberCanWriteToModel('board');

    memberOptions.value = board.members
      .sort((a, b) => {
        const nameA = (a.fullName ?? '').toUpperCase();
        const nameB = (b.fullName ?? '').toUpperCase();
        return nameA < nameB ? -1 : nameA > nameB ? 1 : 0;
      })
      .map((member) => ({
        value: member.id,
        text: member.fullName || member.username || 'Unknown'
      }));

    if (isAuthorized.value) {
      // loadTimeEntries will manage the loader (change text, ensure 2s minimum, then hide)
      await loadTimeEntries();
    } else {
      // If not authorized, just hide the loading spinner
      savingEntry.value = false;
    }

    ready.value = true;
  } catch (e) {
    Sentry.captureException(e);

    await getTrelloCard().alert({
      message: 'An error occurred while initializing the calendar',
      display: 'error',
      duration: 5
    });
  }
}

async function trelloTick() {
  try {
    isAuthorized.value = await checkAuthorization();
  } catch (e) {
    if (e instanceof Error && e.name === 'restApi::ApiNotConfiguredError') {
      isIncognito.value = true;
    } else {
      unrecognizedError.value = true;
      throw e;
    }
  }
}

async function authorize() {
  rejectedAuth.value = false;

  try {
    await getTrelloCard().getRestApi().clearToken();

    await getTrelloCard().getRestApi().authorize({
      scope: 'read,write',
      expiration: 'never'
    });

    await trelloTick();
    await initialize();
  } catch (e) {
    if (e instanceof Error && e.name === 'restApi::AuthDeniedError') {
      rejectedAuth.value = true;
      return;
    }

    Sentry.captureException(e);

    await clearToken();
    throw e;
  }
}

onMounted(() => {
  trelloTick().then(() => {
    initialize();
    getTrelloCard().render(trelloTick);
  });
});

onUnmounted(() => {
  document.removeEventListener('mousemove', onResizeMove);
  document.removeEventListener('mouseup', onResizeEnd);
});
</script>

<style lang="scss" scoped>
.calendar-container {
  height: 100vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  user-select: none;
}

.calendar-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 24px;
  border-bottom: 1px solid var(--surface-border);
  background: var(--surface-ground);
  flex-shrink: 0;
}

.calendar-controls {
  display: flex;
  align-items: center;
  gap: 8px;
}

.week-label {
  font-size: 18px;
  font-weight: 600;
  margin-left: 16px;
}

.calendar-filters {
  display: flex;
  align-items: center;
  gap: 12px;
}

.member-filter {
  min-width: 200px;
}

.viewing-indicator {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background: var(--primary-color);
  color: var(--primary-color-text);
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;

  i {
    font-size: 16px;
  }
}

.settings-modal {
  max-width: 600px;
  width: 90%;
}

.settings-modal-content {
  padding: 32px 24px 24px;
}

.settings-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 28px;
  margin-bottom: 24px;
}

.settings-stats {
  display: flex;
  gap: 24px;
  padding-top: 16px;
  border-top: 1px solid var(--surface-border);
}

.stat-item {
  font-size: 14px;
  color: var(--text-color-secondary);

  strong {
    color: var(--text-color);
    font-weight: 600;
  }
}

.settings-actions {
  margin-top: 24px;
  display: flex;
  justify-content: flex-end;
}

.success-snackbar {
  position: fixed;
  bottom: 24px;
  left: 50%;
  transform: translateX(-50%);
  background: #22c55e;
  color: white;
  padding: 14px 24px;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  display: flex;
  align-items: center;
  gap: 10px;
  z-index: 10000;
  font-size: 14px;
  font-weight: 500;
  animation: slideUp 0.3s ease-out;

  i {
    font-size: 18px;
  }
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateX(-50%) translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateX(-50%) translateY(0);
  }
}

.calendar-grid {
  display: flex;
  flex: 1;
  overflow: auto;
  background: var(--surface-ground);
}

.time-column {
  width: 80px;
  flex-shrink: 0;
  border-right: 1px solid var(--surface-border);
  position: sticky;
  left: 0;
  background: var(--surface-card);
  z-index: 10;
}

.time-header {
  height: 80px;
  border-bottom: 1px solid var(--surface-border);
}

.time-slot {
  height: 60px;
  display: flex;
  align-items: flex-start;
  justify-content: flex-end;
  padding: 4px 8px;
  font-size: 12px;
  color: var(--text-color-secondary);
  border-bottom: 1px solid var(--surface-border);

  &.business-hours {
    background: var(--surface-hover);
  }
}

.day-column {
  flex: 1;
  min-width: 120px;
  border-right: 1px solid var(--surface-border);

  &.today {
    .day-header {
      background: var(--surface-100);
    }

    .day-content {
      background: var(--surface-50);
    }

    .hour-slot {
      background: var(--surface-50);

      &.business-hours {
        background: var(--surface-100);
      }
    }
  }
}

.day-header {
  height: 80px;
  padding: 12px;
  border-bottom: 1px solid var(--surface-border);
  background: var(--surface-card);
  text-align: center;
  position: sticky;
  top: 0;
  z-index: 5;
}

.day-name {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-color-secondary);
  text-transform: uppercase;
}

.day-date {
  font-size: 24px;
  font-weight: 600;
  margin: 4px 0;
  color: var(--text-color);
}

.day-total {
  font-size: 11px;
  color: var(--text-color-secondary);
  margin-top: 4px;
}

.day-content {
  position: relative;
  height: calc(60px * 24);
}

.hour-slot {
  height: 60px;
  border-bottom: 1px solid var(--surface-border);

  &.business-hours {
    background: var(--surface-hover);
  }
}

.cursor-time-indicator {
  position: absolute;
  left: 0;
  right: 0;
  pointer-events: none;
  z-index: 4;
  height: 0;
}

.cursor-time-line {
  position: absolute;
  left: 0;
  right: 0;
  height: 2px;
  background: var(--primary-color);
  opacity: 0.4;
  box-shadow: 0 0 4px rgba(0, 0, 0, 0.2);

  &::before {
    content: '';
    position: absolute;
    left: 0;
    top: -3px;
    width: 8px;
    height: 8px;
    background: var(--primary-color);
    border-radius: 50%;
    opacity: 0.6;
  }
}

.cursor-time-label {
  position: absolute;
  left: 12px;
  top: -10px;
  background: var(--primary-color);
  color: var(--primary-color-text);
  padding: 2px 8px;
  border-radius: 3px;
  font-size: 11px;
  font-weight: 600;
  opacity: 0.85;
  white-space: nowrap;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
}

.time-entry {
  position: absolute;
  left: 2px;
  right: 2px;
  background: var(--primary-color);
  color: var(--primary-color-text);
  border-radius: 3px;
  border: none;
  padding: 6px 8px;
  cursor: move;
  overflow: hidden;
  z-index: 1;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  transition: box-shadow 0.2s, opacity 0.2s, background 0.2s;
  font-size: 13px;

  &:hover {
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
    background: var(--primary-600);
    z-index: 2;
  }

  &.stacked {
    box-shadow: 0 3px 6px rgba(0, 0, 0, 0.25);
  }

  &.dragging {
    opacity: 0.5;
  }

  &.drag-preview {
    background: var(--primary-300);
    opacity: 0.6;
    border: 2px dashed var(--primary-color);
    cursor: move;
    pointer-events: none;
    z-index: 0;
  }

  &.multi-day {
    cursor: pointer;
    opacity: 0.85;
    border-left: 3px solid var(--primary-600);

    &:hover {
      opacity: 1;
    }
  }

  &.running-timer {
    background: #ef4444;
    color: white;
    cursor: pointer;
    animation: pulse-running 2s ease-in-out infinite;
    border: 2px solid #dc2626;
    z-index: 3;
    min-height: 60px;

    &:hover {
      background: #ef4444;
      box-shadow: 0 4px 12px rgba(239, 68, 68, 0.5);
    }
  }

  &.read-only {
    cursor: pointer;
    opacity: 0.9;

    &:hover {
      cursor: pointer;
      background: var(--primary-color);
    }
  }
}

@keyframes pulse-running {
  0%,
  100% {
    box-shadow: 0 2px 8px rgba(239, 68, 68, 0.4);
  }
  50% {
    box-shadow: 0 4px 16px rgba(239, 68, 68, 0.8);
  }
}

@keyframes blink-dot {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.3;
  }
}

.entry-content {
  pointer-events: none;
}

.entry-title {
  font-size: 13px;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  line-height: 1.3;
}

.multi-day-badge {
  font-size: 9px;
  background: rgba(255, 255, 255, 0.3);
  padding: 2px 4px;
  border-radius: 2px;
  margin-left: 4px;
  font-weight: normal;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.running-badge {
  font-size: 10px;
  background: rgba(255, 255, 255, 0.25);
  padding: 2px 6px;
  border-radius: 3px;
  margin-left: 6px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  animation: blink-dot 1.5s ease-in-out infinite;
}

.entry-time {
  font-size: 11px;
  opacity: 0.95;
  margin-top: 3px;
  line-height: 1.3;
}

.delete-entry-btn {
  position: absolute;
  top: 4px;
  right: 4px;
  background: rgba(0, 0, 0, 0.3);
  color: white;
  border: none;
  border-radius: 3px;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  opacity: 0;
  transition: opacity 0.2s, background 0.2s;
  z-index: 10;
  padding: 0;

  &:hover {
    background: #dc2626;
    opacity: 1 !important;
  }

  i {
    font-size: 12px;
  }
}

.time-entry:hover .delete-entry-btn {
  opacity: 0.8;
}

.resize-handle {
  position: absolute;
  left: 0;
  right: 0;
  height: 8px;
  cursor: ns-resize;
  z-index: 3;

  &.resize-top {
    top: 0;
  }

  &.resize-bottom {
    bottom: 0;
  }

  &:hover {
    background: rgba(255, 255, 255, 0.3);
  }
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.5s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

p {
  margin: 25px 0;
}

/* Saving Overlay */
.saving-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1001;
}

.saving-spinner {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}

.spinner {
  width: 48px;
  height: 48px;
  border: 4px solid rgba(255, 255, 255, 0.2);
  border-top-color: var(--primary-color);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.saving-text {
  color: white;
  font-size: 16px;
  font-weight: 500;
}

/* Card Picker Modal */
.card-picker-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.card-picker-modal {
  background: var(--surface-card);
  border-radius: 8px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
  width: 90%;
  max-width: 500px;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
}

.card-picker-header {
  padding: 16px 20px;
  border-bottom: 1px solid var(--surface-border);
  display: flex;
  justify-content: space-between;
  align-items: center;

  h3 {
    margin: 0;
    font-size: 18px;
    font-weight: 600;
    color: var(--text-color);
  }
}

.close-btn {
  background: none;
  border: none;
  font-size: 28px;
  line-height: 1;
  cursor: pointer;
  color: var(--text-color-secondary);
  padding: 0;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  transition: all 0.2s;

  &:hover {
    background: var(--surface-hover);
    color: var(--text-color);
  }
}

.card-picker-search {
  padding: 16px 20px;
  border-bottom: 1px solid var(--surface-border);
}

.card-search-input {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid var(--surface-border);
  border-radius: 4px;
  font-size: 14px;
  background: var(--surface-ground);
  color: var(--text-color);
  transition: border-color 0.2s;

  &:focus {
    outline: none;
    border-color: var(--primary-color);
  }

  &::placeholder {
    color: var(--text-color-secondary);
  }
}

.card-picker-list {
  flex: 1;
  overflow-y: auto;
  padding: 8px 0;
}

.card-picker-item {
  padding: 12px 20px;
  cursor: pointer;
  color: var(--text-color);
  transition: background 0.2s;
  border-bottom: 1px solid var(--surface-border);

  &:hover {
    background: var(--surface-hover);
  }

  &:last-child {
    border-bottom: none;
  }
}

.card-picker-empty,
.card-picker-info {
  padding: 20px;
  text-align: center;
  color: var(--text-color-secondary);
  font-size: 14px;
}

.card-picker-info {
  font-style: italic;
  background: var(--surface-hover);
  margin: 8px;
  padding: 12px;
  border-radius: 4px;
}
</style>
