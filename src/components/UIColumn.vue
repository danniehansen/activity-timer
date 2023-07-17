<template>
  <div class="column" :style="style">
    <slot></slot>
  </div>
</template>

<script setup lang="ts">
import { computed, CSSProperties, PropType } from 'vue';

type AlignItems = 'left' | 'center' | 'right';

const props = defineProps({
  alignItems: {
    type: String as PropType<AlignItems>,
    required: false,
    default: undefined
  }
});

const style = computed<CSSProperties>(() => {
  const styleDefinition: CSSProperties = {};

  if (props.alignItems) {
    switch (props.alignItems) {
      case 'left':
        styleDefinition['justify-content'] = 'flex-start';
        break;

      case 'center':
        styleDefinition['justify-content'] = 'middle';
        break;

      case 'right':
        styleDefinition['justify-content'] = 'flex-end';
        break;
    }
  }

  return styleDefinition;
});
</script>

<style lang="scss" scoped>
.column {
  display: flex;
  width: 100%;
  flex-shrink: 1;
}
</style>
