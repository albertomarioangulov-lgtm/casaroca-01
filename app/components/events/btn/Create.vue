<script setup lang="ts">
const { can, PERMISSIONS } = usePermissions()
const { openCreate } = useEventUI()
</script>

<template>
  <v-btn
    v-if="can(PERMISSIONS.EVENTS_CREATE)"
    color="primary"
    prepend-icon="mdi-plus"
    @click="openCreate"
  >
    Crear evento
  </v-btn>
</template>