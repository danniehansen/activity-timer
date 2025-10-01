<template>
  <div class="help-page">
    <div class="help-content">
      <!-- eslint-disable-next-line vue/no-v-html -->
      <div v-html="formattedContent"></div>

      <div v-if="videoUrl" class="video-container">
        <a
          :href="videoUrl"
          target="_blank"
          rel="noopener noreferrer"
          class="video-link"
        >
          <i class="pi pi-play-circle"></i> Watch video tutorial
        </a>
      </div>

      <div v-if="docsUrl" class="docs-link-container">
        <a
          :href="docsUrl"
          target="_blank"
          rel="noopener noreferrer"
          class="docs-link"
        >
          <i class="pi pi-book"></i> Read detailed documentation
        </a>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { getTrelloCard } from '../components/trello';
import { helpContent } from '../utils/help-content';

const feature = getTrelloCard().arg('feature') as keyof typeof helpContent;
const content = helpContent[feature];

const formattedContent = computed(() => {
  if (!content) return '';

  let text = content.content;

  // Convert **bold** to <strong>
  text = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

  // Convert *italic* to <em>
  text = text.replace(/\*(.*?)\*/g, '<em>$1</em>');

  // Convert line breaks to <br>
  text = text.replace(/\n/g, '<br>');

  // Convert bullet points
  text = text.replace(/^- /gm, '• ');

  return text;
});

const videoUrl = computed(() => content?.videoUrl);
const docsUrl = computed(() => content?.docsUrl);

onMounted(() => {
  // Set modal title
  if (content?.title) {
    getTrelloCard().updateModal({
      title: content.title
    });
  }
});
</script>

<style scoped>
.help-page {
  padding: 1.5rem;
  max-width: 800px;
  margin: 0 auto;
}

.help-content {
  line-height: 1.6;
  color: #172b4d;
  font-size: 14px;
}

html[data-color-mode='dark'] .help-content {
  color: #b6c2cf;
}

.help-content :deep(strong) {
  font-weight: 600;
  color: #091e42;
}

html[data-color-mode='dark'] .help-content :deep(strong) {
  color: #e2e8f0;
}

.help-content :deep(em) {
  font-style: italic;
  color: #5e6c84;
}

html[data-color-mode='dark'] .help-content :deep(em) {
  color: #8c9bab;
}

.video-container,
.docs-link-container {
  margin-top: 1.5rem;
  padding-top: 1rem;
  border-top: 1px solid #dfe1e6;
}

html[data-color-mode='dark'] .video-container,
html[data-color-mode='dark'] .docs-link-container {
  border-top-color: #42526e;
}

.video-link,
.docs-link {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  color: #0079bf;
  text-decoration: none;
  font-weight: 500;
  transition: color 0.2s;
}

.video-link:hover,
.docs-link:hover {
  color: #005a8c;
  text-decoration: underline;
}

html[data-color-mode='dark'] .video-link,
html[data-color-mode='dark'] .docs-link {
  color: #4dabf7;
}

html[data-color-mode='dark'] .video-link:hover,
html[data-color-mode='dark'] .docs-link:hover {
  color: #74c0fc;
}

.video-link i,
.docs-link i {
  font-size: 1.2rem;
}
</style>
