<script setup lang="ts">
const props = defineProps<{
  user: Record<string, any>
}>()
const { openEdit } = useUserUI()
const { can, PERMISSIONS } = usePermissions()
</script>
<template>
  <v-btn
    v-if="can(PERMISSIONS.USERS_UPDATE)"
    size="small"
    variant="text"
    color="blue"
    icon="mdi-pencil"
    @click="openEdit(user)"
  />
</template>
