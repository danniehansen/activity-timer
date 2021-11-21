<template>
  <UIRow>
    <UIColumn>
      <UIButton>Start timer</UIButton>
      <UIInfo icon="clock">1h 55m</UIInfo>
    </UIColumn>

    <UIColumn align-items="right">
      <UIInfo>Estimate: 3h</UIInfo>
    </UIColumn>
  </UIRow>
</template>

<script setup lang="ts">
import UIInfo from '../../components/UIInfo/UIInfo.vue';
import UIRow from '../../components/UIRow.vue';
import UIButton from '../../components/UIButton.vue';
import UIColumn from '../../components/UIColumn.vue';
</script>
