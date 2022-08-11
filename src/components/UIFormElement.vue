<template>
  <div class="form-element">
    <slot></slot>
  </div>
</template>

<style lang="scss">
.form-element {
  margin-top: 10px;

  &:first-child {
    margin-top: 0;
  }

  label {
    user-select: none;
    cursor: pointer;
  }
}
</style>
