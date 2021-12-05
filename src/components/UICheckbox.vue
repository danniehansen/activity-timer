<template>
  <UIFormElement>
    <div class="checkbox">
      <input type="checkbox" v-model="modelValue" :id="id" @input="onChange" />
      <label :for="id">{{ label }}</label>
    </div>
  </UIFormElement>
</template>

<script setup lang="ts">
import { defineProps, getCurrentInstance } from 'vue';
import UIFormElement from './UIFormElement.vue';

const props = defineProps({
  modelValue: {
    type: Boolean,
    required: true
  },
  id: {
    type: String,
    required: true
  },
  label: {
    type: String,
    required: true
  }
});

const instance = getCurrentInstance();

const onChange = (e: Event) => {
  if (e.target instanceof HTMLInputElement) {
    instance?.emit('update:modelValue', e.target.checked);
  }
};
</script>

<style lang="scss" scoped>
.checkbox {
  padding: 0 0 0 22px;
  position: relative;

  input {
    position: absolute;
    left: 0;
    top: 2px;
    margin: 0;
    box-shadow: inset 0 0 0 2px #dfe1e6 !important;

    &:checked {
      box-shadow: inset 0 0 0 2px #172b4d !important;
    }
  }
}
</style>