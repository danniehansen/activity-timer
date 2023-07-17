<template>
  <span :class="`icon icon-${props.icon}`"></span>
</template>

<script setup lang="ts">
import { PropType } from 'vue';
import { Icon } from './Types';

const props = defineProps({
  icon: {
    type: String as PropType<Icon>,
    required: true
  }
});
</script>

<style scoped>
@font-face {
  font-family: 'icomoon';
  src: url('./assets/fonts/icomoon.eot');
  src: url('./assets/fonts/icomoon.eot') format('embedded-opentype'),
    url('./assets/fonts/icomoon.ttf') format('truetype'),
    url('./assets/fonts/icomoon.woff') format('woff'),
    url('./assets/fonts/icomoon.svg') format('svg');
  font-weight: normal;
  font-style: normal;
  font-display: block;
}

[class^='icon-'],
[class*=' icon-'] {
  /* use !important to prevent issues with browser extensions that change fonts */
  font-family: 'icomoon' !important;
  speak: never;
  font-style: normal;
  font-weight: normal;
  font-variant: normal;
  text-transform: none;
  line-height: 1;

  /* Better Font Rendering =========== */
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

.icon-clock:before {
  content: '\e900';
}

.icon-clear:before {
  content: '\e901';
}
</style>
