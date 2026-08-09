<script setup lang="ts">
const { openCreate } = usePersonUI()
const { can, PERMISSIONS } = usePermissions()
</script>
<template>
  <v-btn
    v-if="can(PERMISSIONS.PERSONS_CREATE)"
    color="primary"
    prepend-icon="mdi-account-plus"
    @click="openCreate"
  >
    Nueva persona
  </v-btn>
</template>