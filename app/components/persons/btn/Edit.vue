<script setup lang="ts">
const props = defineProps<{
  person: Record<string, any>
}>()

const { openEdit } = usePersonUI()
const { can, PERMISSIONS } = usePermissions()
</script>
<template>
  <v-btn
    v-if="can(PERMISSIONS.PERSONS_UPDATE)"
    size="small"
    variant="text"
    icon="mdi-pencil"
    :title="`Editar ${props.person.name || ''}`"
    @click="openEdit(props.person)"
  />
</template>