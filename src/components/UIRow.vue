<template>
  <div class="row">
    <slot></slot>
  </div>
</template>

<style lang="scss" scoped>
.row {
  display: flex;
  flex-flow: row nowrap;
  justify-content: space-between;
}
</style>
