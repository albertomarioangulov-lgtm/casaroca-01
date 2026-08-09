<script setup lang="ts">
definePageMeta({
  middleware: 'auth',
})

const { can, PERMISSIONS } = usePermissions()
</script>

<template>
  <v-container>
    <h2 class="text-h6 font-weight-bold mb-4 mt-0">
      Ajustes
    </h2>

    <v-card variant="outlined" class="mb-4">
      <v-card-text>
        <p class="text-body-2 text-grey mb-0">
          Configuración de la aplicación próximamente.
        </p>
      </v-card-text>
    </v-card>
  </v-container>
</template>