<script setup lang="ts">
definePageMeta({
  middleware: 'auth',
})

const { user } = useUserSession()
</script>

<template>
  <v-container>
    <h2 class="text-h6 font-weight-bold mb-4 mt-0">
      Perfil
    </h2>

    <v-card variant="outlined">
      <v-card-text>
        <div class="d-flex align-center mb-4">
          <v-avatar color="primary" variant="tonal" size="64" class="mr-4">
            <v-icon size="32" color="primary">mdi-account</v-icon>
          </v-avatar>
          <div>
            <div class="text-h6">{{ user?.name || 'Sin nombre' }}</div>
            <div class="text-body-2 text-grey">{{ user?.email }}</div>
          </div>
        </div>

        <v-divider class="mb-4" />

        <v-row>
          <v-col cols="12" md="6">
            <v-text-field
              :model-value="user?.name || ''"
              label="Nombre"
              prepend-inner-icon="mdi-account"
              readonly
              variant="plain"
            />
          </v-col>
          <v-col cols="12" md="6">
            <v-text-field
              :model-value="user?.email || ''"
              label="Correo electrónico"
              prepend-inner-icon="mdi-email"
              readonly
              variant="plain"
            />
          </v-col>
          <v-col cols="12" md="6">
            <v-text-field
              :model-value="(user as any)?.roles?.join(', ') || 'Sin roles'"
              label="Roles"
              prepend-inner-icon="mdi-shield-account"
              readonly
              variant="plain"
            />
          </v-col>
        </v-row>
      </v-card-text>
    </v-card>
  </v-container>
</template>