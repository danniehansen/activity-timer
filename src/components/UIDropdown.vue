<template>
  <UIFormElement>
    <label @click="showOptions = !showOptions;">{{ label }}</label>

    <div class="dropdown" :class="{ 'dropdown--active': showOptions }">
      <div class="dropdown__selected" @click.stop="showOptions = !showOptions;" :title="selected">
        {{ selected || placeholder }}
        <div class="dropdown__selected-clear" @click.stop="clear()" v-if="hasValue">
          <UIIcon icon="clear" />
        </div>
      </div>

      <div class="dropdown__options" v-if="showOptions">
        <div
          class="dropdown__option"
          v-for="option in options"
          :key="option.value"
          :class="{ 'dropdown__option--selected': value.includes(option.value) }"
          @click="toggleOption(option)"
        >
          {{ option.text }}
        </div>
      </div>
    </div>
  </UIFormElement>
</template>

<script setup lang="ts">
import { computed, defineProps, getCurrentInstance, onBeforeUnmount, PropType, ref } from 'vue';
import UIIcon from './UIIcon/UIIcon.vue';
import UIFormElement from './UIFormElement.vue';

export interface Option {
  value: string;
  text: string;
}

const props = defineProps({
  modelValue: {
    value: [String, Array as PropType<string[]>],
    required: true
  },
  label: {
    type: String,
    required: true
  },
  options: {
    type: Array as PropType<Option[]>
  },
  multiple: {
    type: Boolean,
    default: false
  },
  placeholder: {
    type: String,
    required: false
  }
});

const showOptions = ref(false);

const selected = computed(() => {
  if (Array.isArray(props.modelValue)) {
    return props.modelValue.map((optionValue) => {
      return props.options?.find((opt) => opt.value === optionValue)?.text ?? '';
    }).join(', ');
  } else if (props.modelValue) {
    return props.options?.find((opt) => opt.value === props.modelValue)?.text ?? '';
  }

  return '';
});

const value = computed(() => {
  if (Array.isArray(props.modelValue)) {
    return props.modelValue;
  }

  return (props.modelValue ? [props.modelValue] : []);
});

const hasValue = computed(() => {
  return (Array.isArray(props.modelValue) ? props.modelValue.length > 0 : !!props.modelValue);
});

const instance = getCurrentInstance();

const toggleOption = (option: Option) => {
  if (props.multiple) {
    const newValue = Array.from(Array.isArray(props.modelValue) ? props.modelValue : []);

    if (newValue.includes(option.value)) {
      newValue.splice(newValue.indexOf(option.value), 1);
    } else {
      newValue.push(option.value);
    }

    instance?.emit('update:modelValue', newValue);
  } else {
    showOptions.value = false;
    instance?.emit('update:modelValue', option.value);
  }
};

const clear = () => {
  showOptions.value = false;
  instance?.emit('update:modelValue', (props.multiple ? [] : ''));
};

const clickAwayDetection = (e: MouseEvent) => {
  if (showOptions.value && !(e.target instanceof HTMLDivElement && e.target.classList.contains('dropdown__option'))) {
    showOptions.value = false;
  }
};

window.addEventListener('click', clickAwayDetection);

onBeforeUnmount(() => {
  window.removeEventListener('click', clickAwayDetection);
});
</script>

<style lang="scss" scoped>
.dropdown {
  position: relative;
  width: 100%;
  max-width: 250px;

  &__selected {
    display: block;
    width: 100%;
    height: 38px;
    line-height: 38px;
    padding: 0 30px 0 14px;
    border: 1px solid #96c8da;
    border-radius: 4px;
    cursor: pointer;
    position: relative;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    color: #5E6C84;

    &:hover {
      background-color: #96c8da;
      color: #fff;
    }

    .dropdown--active & {
      border-bottom-left-radius: 0;
      border-bottom-right-radius: 0;
    }

    &-clear {
      position: absolute;
      right: 0;
      top: 0;
      bottom: 0;
      width: 30px;
      cursor: pointer;
      text-align: center;
    }
  }

  &__options {
    position: absolute;
    left: 0;
    top: 100%;
    width: 100%;
    border: 1px solid #96c8da;
    border-top: none;
    border-bottom-left-radius: 4px;
    border-bottom-right-radius: 4px;
    z-index: 10;
    background-color: #fff;
  }

  &__option {
    padding: 5px 14px;
    line-height: 24px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    cursor: pointer;
    color: #5E6C84;

    &:hover {
      background-color: #96c8da;
      color: #fff;
    }

    &--selected {
      background-color: #38a4cb;
      color: #fff;
    }
  }
}
</style>