<template>
  <div class="info-display" :class="{ 'info-display--has-icon': icon }">
    <UIIcon v-if="icon" :icon="icon" />
    <slot></slot>
  </div>
</template>

<script lang="ts">
import { PropType, defineComponent } from 'vue';
import { Icon } from '../UIIcon/Types';
import UIIcon from '../UIIcon/UIIcon.vue';

export default defineComponent({
  name: 'UIInfo',
  components: { UIIcon },
  props: {
    icon: {
      type: String as PropType<Icon>,
      required: false,
      default: undefined
    }
  }
});
</script>

<style lang="scss" scoped>
.info-display {
  border-radius: 3px;
  box-sizing: border-box;
  display: inline-block;
  font-size: 14px;
  font-weight: 400;
  line-height: 32px;
  margin: 8px 4px 0 0;
  text-align: center;
  appearance: none;
  background-color: rgba(9, 30, 66, 0.04);
  box-shadow: none;
  border: none;
  position: relative;
  padding: 0 12px;

  html[data-color-mode='dark'] & {
    background-color: rgba(9, 30, 66, 0.25);
  }

  .icon {
    padding-right: 10px;
    font-size: 15px;
    position: relative;
    top: -2px;
    vertical-align: middle;
  }
}
</style>
