<script setup lang="ts">
defineProps<{
  child: Record<string, any>
}>()
const { openEdit } = useChildUI()
const { can, PERMISSIONS } = usePermissions()
</script>
<template>
  <v-btn
    v-if="can(PERMISSIONS.CHILDREN_UPDATE)"
    size="small"
    variant="text"
    color="blue"
    icon="mdi-pencil"
    @click="openEdit(child)"
  />
</template>