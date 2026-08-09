<script setup lang="ts">
const { openCreate } = useUserUI()
const { can, PERMISSIONS } = usePermissions()
</script>
<template>
  <v-btn
    v-if="can(PERMISSIONS.USERS_CREATE)"
    color="primary"
    @click="openCreate"
  >
    Nuevo usuario
  </v-btn>
</template>
