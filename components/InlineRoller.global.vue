<template>
  <span
    class="cursor-pointer font-bold text-blood hover:text-black"
    @click="useDiceRoller(signature)"
  >
    <slot />
  </span>
</template>

<script lang="ts" setup>
const props = defineProps({
  signature: { type: String, default: '' },
});
</script>
