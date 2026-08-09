<script setup lang="ts">
definePageMeta({
  middleware: 'auth',
})

const { can, PERMISSIONS } = usePermissions()

const items = ref<Record<string, any>[]>([])
const loading = ref(false)
const days = ref(90) // días hacia atrás para considerar "nuevo miembro"

const fetchItems = async () => {
  loading.value = true
  try {
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - days.value)
    const data = await $fetch('/api/persons', {
      query: { limit: 100 },
    }) as any
    // Filtrar en cliente por membershipDate reciente
    items.value = (data?.items ?? []).filter((p: Record<string, any>) => {
      if (!p.membershipDate) return false
      return new Date(p.membershipDate) >= cutoff
    })
  } catch (e: any) {
    console.error('Error fetching new members:', e)
  } finally {
    loading.value = false
  }
}

onMounted(fetchItems)

watch(days, fetchItems)

const formatDate = (date: string) => {
  if (!date) return '—'
  return new Date(date).toLocaleDateString()
}
</script>

<template>
  <div>
    <v-row class="mb-4">
      <v-col cols="12" class="d-flex align-center justify-space-between">
        <div>
          <h2 class="text-h5">Nuevos Miembros</h2>
          <p class="text-body-2 text-medium-emphasis">Personas que se unieron recientemente a la iglesia</p>
        </div>
        <div class="d-flex align-center">
          <v-text-field
            v-model.number="days"
            label="Días"
            type="number"
            density="compact"
            suffix="días atrás"
            class="mr-2"
            style="max-width: 180px"
          />
          <v-btn variant="text" @click="navigateTo('/persons')">Ver todos</v-btn>
        </div>
      </v-col>
    </v-row>

    <v-card>
      <v-data-table
        :headers="[
          { title: 'Nombre', key: 'name' },
          { title: 'Edad', key: 'age' },
          { title: 'Teléfono', key: 'phone' },
          { title: 'Email', key: 'email' },
          { title: 'Ingreso (membresía)', key: 'membershipDate' },
          { title: 'Bautismo', key: 'baptismDate' },
        ]"
        :items="items"
        :loading="loading"
      >
        <template #[`item.age`]="{ item }">
          <span v-if="item.age !== null">{{ item.age }} años</span>
          <span v-else>—</span>
        </template>
        <template #[`item.membershipDate`]="{ item }">
          {{ formatDate(item.membershipDate) }}
        </template>
        <template #[`item.baptismDate`]="{ item }">
          {{ formatDate(item.baptismDate) }}
        </template>
      </v-data-table>
    </v-card>
  </div>
</template>