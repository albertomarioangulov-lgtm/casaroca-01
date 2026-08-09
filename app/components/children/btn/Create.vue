<script setup lang="ts">
const { can, PERMISSIONS } = usePermissions()
const { openCreate } = useChildUI()
</script>

<template>
  <v-btn
    v-if="can(PERMISSIONS.CHILDREN_CREATE)"
    color="primary"
    prepend-icon="mdi-plus"
    @click="openCreate"
  >
    Registrar niño
  </v-btn>
</template>