<template>
  <div class="auth-splash">
    <!-- Help Button in top right -->
    <div class="auth-splash-help">
      <HelpButton :feature="feature" title="Learn more about this feature" />
    </div>

    <div class="auth-content">
      <div v-if="type === 'incognito'">
        <div class="auth-icon">🔒</div>
        <h2>Incognito Mode Detected</h2>
        <p>
          Unfortunately, some internal functionality required for
          {{ featureName }}
          doesn't work in incognito mode. Please use a regular browser window to
          access this feature.
        </p>
      </div>

      <div v-else-if="type === 'error'">
        <div class="auth-icon">⚠️</div>
        <h2>Unexpected Error</h2>
        <p>
          An unrecognized error occurred. Our system has automatically logged it
          and we'll look into the matter. Please try again later or with a
          different browser.
        </p>
      </div>

      <div v-else-if="type === 'unauthorized'">
        <div class="auth-icon">🔐</div>
        <h2>Authorization Required</h2>
        <p>{{ authMessage }}</p>

        <div class="auth-actions">
          <Button
            label="Authorize Access"
            icon="pi pi-unlock"
            class="auth-button"
            size="large"
            @click="$emit('authorize')"
          />
        </div>

        <p v-if="rejectedAuth" class="auth-error">
          ❌ Authorization was rejected. Click the button above to try again.
        </p>

        <!-- Info box with feature explanation -->
        <div class="auth-info-box">
          <div class="info-icon">💡</div>
          <div class="info-content">
            <h3>Why do we need authorization?</h3>
            <p>{{ whyAuthMessage }}</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import Button from 'primevue/button';
import HelpButton from './HelpButton.vue';

interface Props {
  type: 'incognito' | 'error' | 'unauthorized';
  feature: 'calendar' | 'exports';
  rejectedAuth?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  rejectedAuth: false
});

defineEmits<{
  authorize: [];
}>();

const featureName = computed(() => {
  return props.feature === 'calendar' ? 'the Week Calendar' : 'Data Exporters';
});

const authMessage = computed(() => {
  if (props.feature === 'calendar') {
    return 'To access your time tracking data and display it in the calendar, Activity Timer needs your permission to read card information.';
  }
  return 'To access and export your tracking data, Activity Timer needs your permission to read card information.';
});

const whyAuthMessage = computed(() => {
  if (props.feature === 'calendar') {
    return 'We need to read your time tracking data from cards across the board to display them in the weekly calendar view. This allows us to show when you worked on which tasks.';
  }
  return "We need to read your time tracking and estimate data from all cards on the board to generate comprehensive reports. Your data never leaves Trello's systems.";
});
</script>

<style scoped>
.auth-splash {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem 2rem;
  background: linear-gradient(135deg, #f5f7fa 0%, #e9ecef 100%);
}

html[data-color-mode='dark'] .auth-splash {
  background: linear-gradient(135deg, #1a1d23 0%, #2d3139 100%);
}

.auth-splash-help {
  position: absolute;
  top: 1rem;
  right: 1rem;
}

.auth-content {
  max-width: 600px;
  width: 100%;
  text-align: center;
}

.auth-icon {
  font-size: 4rem;
  margin-bottom: 1rem;
  animation: bounce 2s ease-in-out infinite;
}

@keyframes bounce {
  0%,
  100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-10px);
  }
}

h2 {
  margin: 0 0 1rem 0;
  font-size: 1.75rem;
  font-weight: 600;
  color: #172b4d;
}

html[data-color-mode='dark'] h2 {
  color: #e2e8f0;
}

p {
  margin: 0 0 1.5rem 0;
  font-size: 1rem;
  line-height: 1.6;
  color: #5e6c84;
}

html[data-color-mode='dark'] p {
  color: #8c9bab;
}

.auth-actions {
  margin: 2rem 0;
}

.auth-button {
  font-size: 1.1rem;
  padding: 0.75rem 2rem;
}

.auth-error {
  color: #dc3545;
  font-weight: 500;
  margin-top: 1rem;
}

html[data-color-mode='dark'] .auth-error {
  color: #fc8181;
}

.auth-info-box {
  margin-top: 2rem;
  padding: 1.5rem;
  background-color: #e7f3ff;
  border-radius: 8px;
  border-left: 4px solid #0079bf;
  text-align: left;
  display: flex;
  gap: 1rem;
  align-items: flex-start;
}

html[data-color-mode='dark'] .auth-info-box {
  background-color: #1e3a5f;
  border-left-color: #4dabf7;
}

.info-icon {
  font-size: 1.5rem;
  flex-shrink: 0;
}

.info-content {
  flex: 1;
}

.info-content h3 {
  margin: 0 0 0.5rem 0;
  font-size: 1rem;
  font-weight: 600;
  color: #172b4d;
}

html[data-color-mode='dark'] .info-content h3 {
  color: #e2e8f0;
}

.info-content p {
  margin: 0;
  font-size: 0.875rem;
  color: #5e6c84;
}

html[data-color-mode='dark'] .info-content p {
  color: #8c9bab;
}

/* Responsive */
@media (max-width: 600px) {
  .auth-splash {
    padding: 2rem 1rem;
  }

  .auth-icon {
    font-size: 3rem;
  }

  h2 {
    font-size: 1.5rem;
  }

  .auth-info-box {
    flex-direction: column;
    text-align: center;
  }

  .info-icon {
    font-size: 2rem;
  }
}
</style>
