<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps({
  modelValue: {
    type: Boolean,
    required: true,
  },
})
const emit = defineEmits<{ (e: 'update:modelValue', value: boolean): void }>()

const drawer = computed({
  get: () => props.modelValue,
  set: (value: boolean) => emit('update:modelValue', value),
})

const { can, PERMISSIONS, hasRole } = usePermissions()

const navItems = computed(() => [
  { title: 'Inicio', icon: 'mdi-home-outline', to: '/' },
  {
    title: 'Gestión',
    icon: 'mdi-folder-outline',
    children: [
      ...(can(PERMISSIONS.PERSONS_READ)
        ? [{ title: 'Personas', icon: 'mdi-account-group-outline', to: '/persons' }]
        : []),
      ...(can(PERMISSIONS.WELCOME_CARDS_READ)
        ? [{ title: 'Bienvenida', icon: 'mdi-hand-heart-outline', to: '/welcome' }]
        : []),
      ...(can(PERMISSIONS.MINISTRIES_READ)
        ? [{ title: 'Ministerios', icon: 'mdi-church-outline', to: '/ministries' }]
        : []),
      ...(can(PERMISSIONS.INVITATIONS_READ)
        ? [{ title: 'Invitaciones', icon: 'mdi-email-open-outline', to: '/invitations' }]
        : []),
      ...(can(PERMISSIONS.FAMILIES_READ)
        ? [{ title: 'Familias', icon: 'mdi-home-group-outline', to: '/families' }]
        : []),
      ...(can(PERMISSIONS.MARRIAGES_READ)
        ? [{ title: 'Matrimonios', icon: 'mdi-human-male-female', to: '/marriages' }]
        : []),
      ...(can(PERMISSIONS.EVENTS_READ)
        ? [{ title: 'Eventos', icon: 'mdi-calendar-star-outline', to: '/events' }]
        : []),
      ...(can(PERMISSIONS.COURSES_READ)
        ? [{ title: 'Cursos de Discipulado', icon: 'mdi-school-outline', to: '/courses' }]
        : []),
      ...(can(PERMISSIONS.USERS_READ)
        ? [{ title: 'Usuarios', icon: 'mdi-account-multiple-outline', to: '/users' }]
        : []),
    ],
  },
  ...(hasRole('member')
    ? [{ title: 'Mi Portal', icon: 'mdi-account-circle-outline', to: '/me' }]
    : []),
  { title: 'Perfil', icon: 'mdi-account-circle-outline', to: '/profile' },
  { title: 'Ajustes', icon: 'mdi-cog-outline', to: '/settings' },
])
</script>

<template>
  <v-navigation-drawer v-model="drawer" app width="260" class="bg-surface">
    <v-list nav>
      <v-list-item density="compact">
        <v-list-item-title class="text-h6">SISTEMA IGLESIA</v-list-item-title>
      </v-list-item>

      <v-divider class="my-2" />

      <template v-for="item in navItems" :key="item.title">
        <!-- Items sin submenú -->
        <v-list-item
          v-if="!item.children"
          :to="item.to"
          clickable
          rounded="lg"
          variant="text"
          density="compact"
          color="primary"
        >
          <template #prepend>
            <v-icon>{{ item.icon }}</v-icon>
          </template>
          <v-list-item-title>{{ item.title }}</v-list-item-title>
        </v-list-item>

        <!-- Items con submenú -->
        <v-list-group v-else :value="item.title">
          <template #activator="{ props: groupProps }">
            <v-list-item
              v-bind="groupProps"
              rounded="lg"
              variant="text"
              density="compact"
              color="primary"
            >
              <template #prepend>
                <v-icon>{{ item.icon }}</v-icon>
              </template>
              <v-list-item-title>{{ item.title }}</v-list-item-title>
            </v-list-item>
          </template>

          <!-- Subitems -->
          <v-list-item
            v-for="child in item.children"
            :key="child.title"
            :to="child.to"
            clickable
            rounded="lg"
            variant="text"
            density="compact"
            color="primary"
            class="pl-8"
          >
            <template #prepend>
              <v-icon>{{ child.icon }}</v-icon>
            </template>
            <v-list-item-title class="text-caption">{{ child.title }}</v-list-item-title>
          </v-list-item>
        </v-list-group>
      </template>
    </v-list>
  </v-navigation-drawer>
</template>