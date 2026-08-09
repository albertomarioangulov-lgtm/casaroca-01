<script setup lang="ts">
const props = defineProps<{
  event: Record<string, any>
}>()
const { openEdit } = useEventUI()
const { can, PERMISSIONS } = usePermissions()
</script>
<template>
  <v-btn
    v-if="can(PERMISSIONS.EVENTS_UPDATE)"
    size="small"
    variant="text"
    color="blue"
    icon="mdi-pencil"
    @click="openEdit(event)"
  />
</template>