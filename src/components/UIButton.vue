<template>
  <button :class="{ 'mod-primary': !props.danger, 'mod-danger': props.danger }">
    <slot></slot>
  </button>
</template>

<script setup lang="ts">
const props = defineProps({
  danger: Boolean
});
</script>
