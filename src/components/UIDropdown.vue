<template>
  <label :for="id">{{ label }}</label>
  <select :id="id" v-model="modelValue" @change="onChange">
    <option v-for="option in options" :key="option.value" :value="option.value">{{ option.text }}</option>
  </select>
</template>

<script setup lang="ts">
import { defineProps, getCurrentInstance, PropType } from 'vue';

export interface Option {
  value: string;
  text: string;
}

const props = defineProps({
  modelValue: {
    type: String,
    required: true
  },
  id: {
    type: String,
    required: true
  },
  label: {
    type: String,
    required: true
  },
  options: {
    type: Array as PropType<Option[]>
  }
});

const instance = getCurrentInstance();

const onChange = (e: Event) => {
  if (e.target instanceof HTMLSelectElement) {
    instance?.emit('update:modelValue', e.target.value);
  }
};
</script>