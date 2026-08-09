<script setup lang="ts">
import AccountMenu from '~/components/layout/AccountMenu.vue'

const props = defineProps<{ drawer: boolean }>()
const emit = defineEmits<{
  (e: 'update:drawer', value: boolean): void
  (e: 'logout'): void
}>()

const toggleDrawer = () => emit('update:drawer', !props.drawer)
</script>

<template>
  <v-app-bar app color="orange-lighten-3" elevated density="comfortable">
    <v-app-bar-nav-icon @click="toggleDrawer" />
    <v-toolbar-title>MNT-PRO</v-toolbar-title>
    <v-spacer />

    <AccountMenu @logout="$emit('logout')" />
  </v-app-bar>
</template>