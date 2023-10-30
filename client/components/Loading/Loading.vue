<script setup lang="ts">
const { text } = defineProps<{
  text: string;
}>();
</script>

<template>
  <div class="container">
    <h1 v-if="text !== undefined">{{ text }}</h1>
  </div>
</template>

<style scoped>
.container {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  padding-bottom: 500px;
  box-sizing: border-box;
  padding-bottom: 20%;
}
</style>