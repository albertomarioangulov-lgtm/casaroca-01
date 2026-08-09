<script setup lang="ts">
definePageMeta({
  middleware: 'auth',
})

const data = ref<Record<string, any> | null>(null)
const loading = ref(true)

const fetchMe = async () => {
  loading.value = true
  try {
    data.value = await $fetch('/api/me')
  } catch (e: any) {
    console.error('Error fetching me:', e)
  } finally {
    loading.value = false
  }
}

onMounted(fetchMe)

const respondInvitation = async (inv: Record<string, any>, status: string) => {
  try {
    await $fetch(`/api/invitations/${inv.id}`, { method: 'PUT', body: { status } })
    await fetchMe()
  } catch (e: any) {
    alert(e?.data?.statusMessage || 'Error al responder la invitación')
  }
}

const channelLabel = (channel: string) => {
  const map: Record<string, string> = {
    in_person: 'Presencial',
    whatsapp: 'WhatsApp',
    phone: 'Teléfono',
    email: 'Email',
    portal: 'Portal',
  }
  return map[channel] ?? channel
}
</script>

<template>
  <div v-if="loading" class="text-center py-8">
    <v-progress-circular indeterminate color="primary" />
  </div>

  <div v-else-if="data">
    <!-- Perfil del miembro -->
    <v-card class="mb-4">
      <v-card-text class="d-flex align-center">
        <v-avatar color="primary" size="56" class="mr-4">
          <span class="text-h6">{{ data.person?.name?.charAt(0) || data.user?.name?.charAt(0) || 'M' }}</span>
        </v-avatar>
        <div>
          <h2 class="text-h5">{{ data.person?.name || data.user?.name || 'Miembro' }}</h2>
          <p class="text-body-2 text-medium-emphasis">
            {{ data.person?.email || data.user?.email }}
            <template v-if="data.person?.membershipDate">
              · Miembro desde {{ new Date(data.person.membershipDate).toLocaleDateString() }}
            </template>
          </p>
        </div>
      </v-card-text>
    </v-card>

    <!-- Invitaciones pendientes -->
    <v-card v-if="data.pendingInvitations?.length" class="mb-4">
      <v-card-title class="text-h6">Invitaciones pendientes</v-card-title>
      <v-card-text>
        <v-list>
          <v-list-item
            v-for="inv in data.pendingInvitations"
            :key="inv.id"
          >
            <template #prepend>
              <v-avatar :color="inv.ministryColor || 'primary'" variant="tonal">
                <v-icon>{{ inv.ministryIcon || 'mdi-church-outline' }}</v-icon>
              </v-avatar>
            </template>
            <v-list-item-title>
              Te invitan al ministerio de <strong>{{ inv.ministryName }}</strong>
            </v-list-item-title>
            <v-list-item-subtitle>
              <template v-if="inv.eventName">
                Evento: {{ inv.eventName }}
                <span v-if="inv.eventDate"> · {{ new Date(inv.eventDate).toLocaleDateString() }}</span>
                <br>
              </template>
              Por {{ inv.invitedByName }} ({{ channelLabel(inv.channel) }})
              <template v-if="inv.message"> · {{ inv.message }}</template>
            </v-list-item-subtitle>
            <template #append>
              <v-btn size="small" color="success" variant="tonal" class="mr-1" @click="respondInvitation(inv, 'accepted')">
                Aceptar
              </v-btn>
              <v-btn size="small" color="error" variant="tonal" @click="respondInvitation(inv, 'declined')">
                Rechazar
              </v-btn>
            </template>
          </v-list-item>
        </v-list>
      </v-card-text>
    </v-card>

    <!-- Mis ministerios -->
    <v-card v-if="data.memberships?.length" class="mb-4">
      <v-card-title class="text-h6">Mis ministerios</v-card-title>
      <v-card-text>
        <v-chip
          v-for="m in data.memberships"
          :key="m.id"
          :color="m.ministryColor || 'primary'"
          variant="tonal"
          class="mr-2 mb-2"
        >
          <v-icon start>{{ m.ministryIcon || 'mdi-church-outline' }}</v-icon>
          {{ m.ministryName }}
          <span v-if="m.roleInMinistry !== 'member'">
            ({{ m.roleInMinistry === 'director' ? 'Director' : 'Líder' }})
          </span>
        </v-chip>
      </v-card-text>
    </v-card>

    <v-row>
      <!-- Historial de asistencia a eventos -->
      <v-col cols="12" md="6">
        <v-card class="h-100 mb-4">
          <v-card-title class="text-h6">Mi historial de eventos</v-card-title>
          <v-card-text>
            <template v-if="data.eventHistory?.length">
              <v-list density="compact">
                <v-list-item v-for="e in data.eventHistory" :key="e.id">
                  <template #prepend><v-icon>mdi-calendar-check</v-icon></template>
                  <v-list-item-title>{{ e.eventName }}</v-list-item-title>
                  <v-list-item-subtitle>
                    {{ e.eventDate ? new Date(e.eventDate).toLocaleDateString() : '' }}
                    <span v-if="e.checkOutTime"> · Asistió</span>
                  </v-list-item-subtitle>
                </v-list-item>
              </v-list>
            </template>
            <span v-else class="text-medium-emphasis">Sin asistencia registrada</span>
          </v-card-text>
        </v-card>
      </v-col>

      <!-- Pre-inscripciones -->
      <v-col cols="12" md="6">
        <v-card class="h-100 mb-4">
          <v-card-title class="text-h6">Mis pre-inscripciones</v-card-title>
          <v-card-text>
            <template v-if="data.eventEnrollments?.length">
              <v-list density="compact">
                <v-list-item v-for="e in data.eventEnrollments" :key="e.id">
                  <template #prepend><v-icon>mdi-ticket-confirmation</v-icon></template>
                  <v-list-item-title>{{ e.eventName }}</v-list-item-title>
                  <v-list-item-subtitle>
                    {{ e.eventDate ? new Date(e.eventDate).toLocaleDateString() : '' }}
                  </v-list-item-subtitle>
                </v-list-item>
              </v-list>
            </template>
            <span v-else class="text-medium-emphasis">Sin pre-inscripciones</span>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- Solicitudes de cursos -->
    <v-card v-if="data.courseEnrollments?.length" class="mb-4">
      <v-card-title class="text-h6">Mis solicitudes de cursos</v-card-title>
      <v-card-text>
        <v-list density="compact">
          <v-list-item v-for="c in data.courseEnrollments" :key="c.id">
            <template #prepend><v-icon>mdi-school</v-icon></template>
            <v-list-item-title>{{ c.courseName }}</v-list-item-title>
            <v-list-item-subtitle>
              Estado:
              <v-chip
                :color="c.status === 'approved' ? 'success' : c.status === 'pending' ? 'warning' : c.status === 'rejected' ? 'error' : 'default'"
                size="x-small"
                variant="tonal"
              >
                {{ c.status === 'approved' ? 'Aprobada' : c.status === 'pending' ? 'Pendiente' : c.status === 'rejected' ? 'Rechazada' : 'Cancelada' }}
              </v-chip>
            </v-list-item-subtitle>
          </v-list-item>
        </v-list>
      </v-card-text>
    </v-card>

    <!-- Familia -->
    <v-card v-if="data.family?.length">
      <v-card-title class="text-h6">Mi familia</v-card-title>
      <v-card-text>
        <v-list density="compact">
          <v-list-item v-for="f in data.family" :key="f.personId">
            <template #prepend><v-icon>mdi-account</v-icon></template>
            <v-list-item-title>{{ f.name }}</v-list-item-title>
            <v-list-item-subtitle>{{ f.roleInFamily }}</v-list-item-subtitle>
          </v-list-item>
        </v-list>
      </v-card-text>
    </v-card>
  </div>
</template>