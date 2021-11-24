<template>
  <label>{{ label }}</label>

  <UIRow>
    <input v-model="modelValue" type="range" :min="min" :max="max" @change="onChange" />
    <input v-model="modelValue" type="number"  @input="onChange" />
  </UIRow>
</template>

<script setup lang="ts">
import UIRow from '../components/UIRow.vue';
import { defineProps, getCurrentInstance } from 'vue';

const props = defineProps({
  modelValue: {
    type: Number,
    required: true
  },
  label: {
    type: String,
    required: true
  },
  min: {
    type: Number,
    required: true
  },
  max: {
    type: Number,
    required: true
  }
});

const instance = getCurrentInstance();

const onChange = (e: Event) => {
  if (e.target instanceof HTMLInputElement) {
    instance?.emit('update:modelValue', Number(e.target.value));
  }
};
</script>

<style lang="scss" scoped>
input[type="number"] {
  width: 60px;
}

input[type="range"] {
  padding: 2px 0;
  line-height: 16px;
  height: 16px;
  width: 100%;
  margin-right: 10px;
  margin-top: 10px;
  margin-bottom: 0;

  &::-webkit-slider-thumb {
    width: 10px;
    height: 10px;
    padding: 0;
    background-color: #172B4D;
    appearance: none;
    border-radius: 50%;
  }
}
</style>