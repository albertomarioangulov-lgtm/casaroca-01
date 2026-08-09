<script setup lang="ts">
import { useThemeToggle } from '~/composables/useTheme'

const emit = defineEmits<{ (e: 'logout'): void }>()

const { user } = useAuthentication()

const menuItems = [
  { title: 'Perfil', icon: 'mdi-account-circle-outline', to: '/profile' },
  { title: 'Ajustes', icon: 'mdi-cog-outline', to: '/settings' },
]

const { themes, currentThemeId, setTheme } = useThemeToggle()
const themesOpen = ref(false)

const displayName = computed(() => user.value?.name || user.value?.email || 'Usuario')
</script>

<template>
  <v-menu placement="bottom-end" offset-y>
    <template #activator="{ props: activatorProps }">
      <v-btn v-bind="activatorProps" variant="text" class="px-2">
        <v-icon class="mr-1">mdi-account-circle</v-icon>
        <span class="text-none text-body-2">{{ displayName }}</span>
      </v-btn>
    </template>

    <v-list>
      <v-list-item density="compact" class="text-caption text-medium-emphasis" disabled>
        <v-list-item-title class="font-weight-medium">{{ displayName }}</v-list-item-title>
        <template v-if="user?.email" #subtitle>
          {{ user.email }}
        </template>
      </v-list-item>

      <v-divider />
      <v-list-item
        clickable
        density="compact"
        @click.stop="themesOpen = !themesOpen"
      >
        <template #prepend>
          <v-icon size="small">mdi-palette</v-icon>
        </template>
        <v-list-item-title>Temas</v-list-item-title>
        <template #append>
          <v-icon size="small">
            {{ themesOpen ? 'mdi-chevron-up' : 'mdi-chevron-down' }}
          </v-icon>
        </template>
      </v-list-item>

      <template v-if="themesOpen">
        <v-list-item
          v-for="theme in themes"
          :key="theme.id"
          :active="theme.id === currentThemeId"
          :color="theme.id === currentThemeId ? 'primary' : undefined"
          clickable
          density="compact"
          class="ml-4"
          @click.stop="setTheme(theme.id)"
        >
          <template #prepend>
            <v-icon size="small">{{ theme.icon }}</v-icon>
          </template>
          <v-list-item-title>{{ theme.label }}</v-list-item-title>
          <template #append>
            <v-icon
              v-if="theme.id === currentThemeId"
              size="x-small"
              color="primary"
            >
              mdi-check
            </v-icon>
          </template>
        </v-list-item>
      </template>

      <v-divider />

      <v-list-item
        v-for="item in menuItems"
        :key="item.title"
        :to="item.to"
        clickable
        density="compact"
      >
        <template #prepend>
          <v-icon size="small">{{ item.icon }}</v-icon>
        </template>
        <v-list-item-title>{{ item.title }}</v-list-item-title>
      </v-list-item>

      <v-divider />

      <v-list-item clickable density="compact" @click="$emit('logout')">
        <template #prepend>
          <v-icon size="small">mdi-logout</v-icon>
        </template>
        <v-list-item-title>Cerrar sesión</v-list-item-title>
      </v-list-item>
    </v-list>
  </v-menu>
</template>
