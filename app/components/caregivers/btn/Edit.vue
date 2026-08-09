<script setup lang="ts">
defineProps<{
  caregiver: Record<string, any>
}>()
const { openEdit } = useCaregiverUI()
const { can, PERMISSIONS } = usePermissions()
</script>
<template>
  <v-btn
    v-if="can(PERMISSIONS.CAREGIVERS_UPDATE)"
    size="small"
    variant="text"
    color="blue"
    icon="mdi-pencil"
    @click="openEdit(caregiver)"
  />
</template>