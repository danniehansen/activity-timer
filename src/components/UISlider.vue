<template>
  <UIFormElement>
    <label>{{ label }}</label>

    <UIRow>
      <input v-model="fieldValue" type="range" :min="min" :max="max" @change="onChange" />
      <input v-model="fieldValue" type="number" @input="onChange" />
    </UIRow>
  </UIFormElement>
</template>

<script lang="ts">
import UIRow from '../components/UIRow.vue';
import { defineComponent, ref, watch } from 'vue';
import UIFormElement from './UIFormElement.vue';

export default defineComponent({
  components: { UIFormElement, UIRow },
  props: {
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
  },
  setup (props, context) {
    const fieldValue = ref(props.modelValue);

    watch(props, () => {
      fieldValue.value = props.modelValue;
    });

    const onChange = (e: Event) => {
      if (e.target instanceof HTMLInputElement) {
        context.emit('update:modelValue', Number(e.target.value));
      }
    };

    return { onChange, fieldValue };
  }
});
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