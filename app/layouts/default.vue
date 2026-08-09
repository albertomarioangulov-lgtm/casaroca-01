<script setup lang="ts">

const { logout } = useAuthentication()
const drawer = ref(true)

const handleLogout = async () => {
  await logout()
}
</script>

<template>
  <v-app>
    <LayoutAppBar v-model:drawer="drawer" @logout="handleLogout" />
    <LayoutNavDrawer v-model="drawer" />

    <v-main>
      <v-container fluid class="ma-0">
      <!-- <v-container> -->
        <slot />
      </v-container>
    </v-main>
  </v-app>
</template>