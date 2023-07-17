<template>
  <UIFormElement>
    <label>{{ label }}</label>

    <input v-model="fieldValue" type="date" @input="onChange" />
  </UIFormElement>
</template>

<script lang="ts">
import { defineComponent, watch, ref } from 'vue';
import UIFormElement from './UIFormElement.vue';

export default defineComponent({
  components: { UIFormElement },
  props: {
    modelValue: {
      type: String,
      required: true
    },
    label: {
      type: String,
      required: true
    }
  },
  emits: ['update:modelValue'],
  setup(props, context) {
    const fieldValue = ref(props.modelValue);

    watch(props, () => {
      fieldValue.value = props.modelValue;
    });

    const onChange = (e: Event) => {
      if (e.target instanceof HTMLInputElement) {
        context.emit('update:modelValue', e.target.value);
      }
    };

    return { onChange, fieldValue };
  }
});
</script>

<style lang="scss" scoped>
input {
  width: 100%;
}
</style>
