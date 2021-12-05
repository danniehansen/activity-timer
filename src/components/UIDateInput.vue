<template>
  <UIFormElement>
    <label>{{ label }}</label>

    <input v-model="modelValue" type="date"  @input="onChange" />
  </UIFormElement>
</template>

<script setup lang="ts">
import { defineProps, PropType, getCurrentInstance } from 'vue';
import UIFormElement from './UIFormElement.vue';

const props = defineProps({
  modelValue: {
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
    instance?.emit('update:modelValue', e.target.value);
  }
};
</script>

<style lang="scss" scoped>
input {
  width: 100%;
}
</style>