<template>
  <UIFormElement>
    <div class="checkbox">
      <input type="checkbox" v-model="fieldValue" :id="id" @input="onChange" />
      <label :for="id">{{ label }}</label>
    </div>
  </UIFormElement>
</template>

<script lang="ts">
import { ref, defineComponent, watch } from 'vue';
import UIFormElement from './UIFormElement.vue';

export default defineComponent({
  components: { UIFormElement },
  props: {
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
  },
  setup(props, context) {
    const fieldValue = ref(props.modelValue);

    watch(props, () => {
      fieldValue.value = props.modelValue;
    });

    const onChange = (e: Event) => {
      if (e.target instanceof HTMLInputElement) {
        context.emit('update:modelValue', e.target.checked);
      }
    };

    return { onChange, fieldValue };
  }
});
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
