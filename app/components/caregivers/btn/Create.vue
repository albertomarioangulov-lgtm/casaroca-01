<script setup lang="ts">
const { can, PERMISSIONS } = usePermissions()
const { openCreate } = useCaregiverUI()
</script>

<template>
  <v-btn
    v-if="can(PERMISSIONS.CAREGIVERS_CREATE)"
    color="primary"
    prepend-icon="mdi-plus"
    @click="openCreate"
  >
    Registrar acudiente
  </v-btn>
</template>