<script setup lang="ts">
definePageMeta({
  middleware: 'auth',
})// Hoja de Vida

const route = useRoute()
const personId = route.params.id as string

const { can, PERMISSIONS } = usePermissions()

const person = ref<Record<string, any> | null>(null)
const loading = ref(true)
const error = ref('')

// Vista de hoja de vida: 'cards' | 'tree'
const viewMode = ref<'cards' | 'tree'>('cards')

// Diálogo agregar relación
const relationDialog = ref(false)
const relationForm = ref<Record<string, any>>({
  relatedPersonId: '',
  relationshipType: 'hijo',
})
const persons = ref<Record<string, any>[]>([])

const fetchPerson = async () => {
  loading.value = true
  try {
    const url: string = `/api/persons/${personId}`
    person.value = await $fetch(url) as any
  } catch (e: any) {
    error.value = e?.data?.statusMessage || 'Error al cargar la persona'
  } finally {
    loading.value = false
  }
}

const fetchPersons = async () => {
  try {
    const url: string = `/api/persons?limit=100`
    const data = await $fetch(url) as any
    persons.value = data?.items ?? []
  } catch (e: any) {
    console.error('Error fetching persons:', e)
  }
}

onMounted(async () => {
  await fetchPerson()
  await fetchPersons()
})

const remove = async () => {
  if (!confirm(`¿Eliminar a ${person.value?.name}? Esta acción es permanente.`)) return
  try {
    const url: string = `/api/persons/${personId}`
    await $fetch(url, { method: 'DELETE' })
    navigateTo('/persons')
  } catch (e: any) {
    console.error('Error deleting person:', e)
  }
}

// ==== Relaciones ====

// Unifica outbound + inbound en una lista con la persona "otra" y el tipo desde la perspectiva del visitado
const allRelations = computed(() => {
  const rels = person.value?.relationships
  if (!rels) return []

  const outbound = (rels.outbound ?? []).map((r: any) => ({
    relationshipId: r.id,
    personId: r.relatedPersonId,
    personName: r.relatedPersonName,
    personPhone: r.relatedPersonPhone,
    personBirthDate: r.relatedPersonBirthDate,
    relationshipType: r.relationshipType,
    perspective: r.perspective,
  }))

  const inbound = (rels.inbound ?? []).map((r: any) => ({
    relationshipId: r.id,
    personId: r.personId,
    personName: r.personName,
    personPhone: r.personPhone,
    personBirthDate: r.personBirthDate,
    relationshipType: r.relationshipType,
    perspective: r.perspective,
  }))

  return [...outbound, ...inbound]
})

// Agrupa por tipo de relación para la vista de tarjetas
const groupedRelations = computed(() => {
  const groups: Record<string, any[]> = {}
  for (const rel of allRelations.value) {
    const key = rel.relationshipType
    if (!groups[key]) groups[key] = []
    groups[key].push(rel)
  }
  return groups
})

const relationshipLabel = (type: string) => {
  const map: Record<string, string> = {
    padre: 'Padres', madre: 'Madres', hijo: 'Hijos', hija: 'Hijas',
    hermano: 'Hermanos', hermana: 'Hermanas', tio: 'Tíos', tia: 'Tías',
    sobrino: 'Sobrinos', sobrina: 'Sobrinas', abuelo: 'Abuelos', abuela: 'Abuelas',
    nieto: 'Nietos', nieta: 'Nietas', primo: 'Primos', prima: 'Primas',
    cuñado: 'Cuñados', cuñada: 'Cuñadas', suegro: 'Suegros', suegra: 'Suegras',
    yerno: 'Yernos', nuera: 'Nueras', otro: 'Otros familiares',
  }
  return map[type] ?? type
}

const openAddRelation = () => {
  relationForm.value = { relatedPersonId: '', relationshipType: 'hijo' }
  relationDialog.value = true
}

const addRelation = async () => {
  try {
    const url: string = `/api/persons/${personId}/relationships`
    await $fetch(url, { method: 'POST', body: relationForm.value })
    relationDialog.value = false
    await fetchPerson()
  } catch (e: any) {
    alert(e?.data?.statusMessage || 'Error al agregar la relación')
  }
}

const removeRelation = async (rel: any) => {
  if (!confirm(`¿Eliminar esta relación con ${rel.personName}?`)) return
  try {
    const url: string = `/api/relationships/${rel.relationshipId}`
    await $fetch(url, { method: 'DELETE' })
    await fetchPerson()
  } catch (e: any) {
    alert(e?.data?.statusMessage || 'Error al eliminar la relación')
  }
}

const formatDate = (date: string) => {
  if (!date) return '—'
  return new Date(date).toLocaleDateString()
}

// ==== Familia (Hogar) ====

// Roles de familia estandarizados para los selectores
const familyRoleOptions = [
  { title: 'Padre', value: 'padre' },
  { title: 'Madre', value: 'madre' },
  { title: 'Hijo', value: 'hijo' },
  { title: 'Hija', value: 'hija' },
  { title: 'Hermano', value: 'hermano' },
  { title: 'Hermana', value: 'hermana' },
  { title: 'Abuelo', value: 'abuelo' },
  { title: 'Abuela', value: 'abuela' },
  { title: 'Tío', value: 'tio' },
  { title: 'Tía', value: 'tia' },
  { title: 'Sobrino', value: 'sobrino' },
  { title: 'Sobrina', value: 'sobrina' },
  { title: 'Nieto', value: 'nieto' },
  { title: 'Nieta', value: 'nieta' },
  { title: 'Primo', value: 'primo' },
  { title: 'Prima', value: 'prima' },
  { title: 'Cuñado', value: 'cuñado' },
  { title: 'Cuñada', value: 'cuñada' },
  { title: 'Yerno', value: 'yerno' },
  { title: 'Nuera', value: 'nuera' },
  { title: 'Miembro del hogar', value: 'miembro' },
  { title: 'Otro', value: 'otro' },
]

const familyDialog = ref(false)
const familyMode = ref<'create' | 'add-member' | 'add-spouse'>('create')
const familyForm = ref<Record<string, any>>({
  name: '',
  roleInFamily: '',
  // Cónyuge (al crear familia o agregar cónyuge)
  spousePersonId: '',
  spouseName: '',
  spouseRole: '',
  createMarriage: true,
  // Miembros adicionales
  memberPersonId: '',
  memberName: '',
  memberRole: '',
})
const familyId = ref<string | null>(null)

const familiaresOptions = ref<Record<string, any>[]>([])

// Sugiere el rol del cónyuge según el rol de la persona visitada
const suggestSpouseRole = () => {
  const myRole = familyForm.value.roleInFamily
  if (myRole === 'padre') return 'madre'
  if (myRole === 'madre') return 'padre'
  if (myRole === 'esposo') return 'esposa'
  if (myRole === 'esposa') return 'esposo'
  return ''
}

// Cuando no hay familia: preparar diálogo de creación (incluye cónyuge)
const openCreateFamily = () => {
  familyMode.value = 'create'
  familyForm.value = {
    name: '',
    roleInFamily: '',
    spousePersonId: '',
    spouseName: '',
    spouseRole: '',
    createMarriage: true,
    memberPersonId: '',
    memberName: '',
    memberRole: '',
  }
  familyDialog.value = true
}

// Cuando ya hay familia: preparar diálogo de agregar miembro
const openAddFamilyMember = (f: Record<string, any>) => {
  familyMode.value = 'add-member'
  familyId.value = f.id
  familyForm.value = {
    name: '',
    roleInFamily: '',
    spousePersonId: '',
    spouseName: '',
    spouseRole: '',
    createMarriage: true,
    memberPersonId: '',
    memberName: '',
    memberRole: '',
  }
  familyDialog.value = true
}

// Cuando hay familia sin cónyuge: preparar diálogo de agregar cónyuge
const openAddSpouse = (f: Record<string, any>) => {
  familyMode.value = 'add-spouse'
  familyId.value = f.id
  familyForm.value = {
    name: '',
    roleInFamily: '',
    spousePersonId: '',
    spouseName: '',
    spouseRole: '',
    createMarriage: true,
    memberPersonId: '',
    memberName: '',
    memberRole: '',
  }
  familyDialog.value = true
}

// Crea el matrimonio entre dos personas si no existe uno activo
const ensureMarriage = async (spouse1Id: string, spouse2Id: string) => {
  try {
    const url: string = '/api/marriages'
    await $fetch(url, {
      method: 'POST',
      body: { spouse1Id, spouse2Id },
    })
  } catch (e: any) {
    // Si ya existe matrimonio activo, no es error fatal
    console.warn('Matrimonio no creado:', e?.data?.statusMessage)
  }
}

const saveFamily = async () => {
  try {
    if (familyMode.value === 'create') {
      // 1. Resolver o crear el cónyuge si se indica
      let spouseId: string | null = null
      if (familyForm.value.spousePersonId) {
        spouseId = familyForm.value.spousePersonId
      } else if (familyForm.value.spouseName) {
        const personsUrl: string = '/api/persons'
        const newSpouse = await $fetch(personsUrl, {
          method: 'POST',
          body: { name: familyForm.value.spouseName },
        }) as any
        spouseId = newSpouse.id ?? newSpouse._id
      }

      // 2. Construir miembros (persona visitada + cónyuge + adicionales)
      const members = [
        { personId, roleInFamily: familyForm.value.roleInFamily || 'miembro' },
      ]
      if (spouseId) {
        members.push({ personId: spouseId, roleInFamily: familyForm.value.spouseRole || 'madre' })
      }
      if (familyForm.value.memberPersonId) {
        members.push({ personId: familyForm.value.memberPersonId, roleInFamily: familyForm.value.memberRole || 'hijo' })
      } else if (familyForm.value.memberName) {
        const personsUrl2: string = '/api/persons'
        const newMember = await $fetch(personsUrl2, {
          method: 'POST',
          body: { name: familyForm.value.memberName },
        }) as any
        members.push({ personId: newMember.id ?? newMember._id, roleInFamily: familyForm.value.memberRole || 'hijo' })
      }

      // 3. Crear la familia
      const url: string = '/api/families'
      await $fetch(url, {
        method: 'POST',
        body: { name: familyForm.value.name || `Familia de ${person.value?.name}`, members },
      })

      // 4. Crear el matrimonio si se marcó
      if (spouseId && familyForm.value.createMarriage) {
        await ensureMarriage(personId, spouseId)
      }
    } else if (familyMode.value === 'add-member') {
      // Agregar miembro a familia existente
      const url: string = `/api/families/${familyId.value}/members`
      await $fetch(url, {
        method: 'POST',
        body: {
          personId: familyForm.value.memberPersonId || undefined,
          name: familyForm.value.memberName || undefined,
          roleInFamily: familyForm.value.memberRole || 'miembro',
        },
      })
      // Si el rol es padre/madre y se marcó crear matrimonio, intentar vincular con la persona visitada
      if (familyForm.value.createMarriage && ['padre', 'madre', 'esposo', 'esposa'].includes(familyForm.value.memberRole)) {
        const mid = familyForm.value.memberPersonId
        if (mid) {
          await ensureMarriage(personId, mid)
        } else {
          // Se creó persona nueva por nombre — buscar su id desde el endpoint (lo devuelve members)
          // Para simplificar, se omite el matrimonio automático en este sub-caso de persona nueva
          console.warn('Matrimonio automático omitido: persona nueva recién creada, vincular manualmente')
        }
      }
    } else if (familyMode.value === 'add-spouse') {
      // Agregar cónyuge a familia existente
      let spouseId: string | null = null
      if (familyForm.value.spousePersonId) {
        spouseId = familyForm.value.spousePersonId
      } else if (familyForm.value.spouseName) {
        const personsUrl: string = '/api/persons'
        const newSpouse = await $fetch(personsUrl, {
          method: 'POST',
          body: { name: familyForm.value.spouseName },
        }) as any
        spouseId = newSpouse.id ?? newSpouse._id
      }
      if (!spouseId) {
        throw new Error('Debe seleccionar o crear el cónyuge')
      }
      // Agregar al hogar
      const url: string = `/api/families/${familyId.value}/members`
      await $fetch(url, {
        method: 'POST',
        body: { personId: spouseId, roleInFamily: familyForm.value.spouseRole || 'madre' },
      })
      // Crear matrimonio si se marcó
      if (familyForm.value.createMarriage) {
        await ensureMarriage(personId, spouseId)
      }
    }
    familyDialog.value = false
    await fetchPerson()
  } catch (e: any) {
    alert(e?.data?.statusMessage || 'Error al guardar la familia')
  }
}

const removeFamilyMember = async (family: Record<string, any>, memberPersonId: string, memberName: string) => {
  if (!confirm(`¿Quitar a ${memberName} de la familia ${family.name}?`)) return
  try {
    const url: string = `/api/families/${family.id}/members/${memberPersonId}`
    await $fetch(url, { method: 'DELETE' })
    await fetchPerson()
  } catch (e: any) {
    alert(e?.data?.statusMessage || 'Error al quitar el miembro')
  }
}
</script>

<template>
  <div v-if="loading" class="text-center py-8">
    <v-progress-circular indeterminate color="primary" />
  </div>

  <div v-else-if="error">
    <v-alert type="error" :text="error" />
  </div>

  <div v-else-if="person">
    <!-- Header: Perfil + acciones -->
    <v-card class="mb-4">
      <v-card-text>
        <v-row align="center">
          <v-col cols="auto">
            <v-avatar color="primary" size="64">
              <span class="text-h5">{{ person.name?.charAt(0) || '?' }}</span>
            </v-avatar>
          </v-col>
          <v-col>
            <h2 class="text-h5">{{ person.name }}</h2>
            <p class="text-body-2 text-medium-emphasis">
              {{ person.age !== null ? `${person.age} años` : 'Edad no registrada' }}
              · {{ person.gender === 'male' ? 'Hombre' : person.gender === 'female' ? 'Mujer' : 'Género no definido' }}
              <template v-if="person.maritalStatus"> · {{ person.maritalStatus }}</template>
            </p>
            <div class="d-flex flex-wrap mt-1">
              <v-chip v-if="person.phone" size="small" variant="tonal" class="mr-1">
                <v-icon start size="small">mdi-phone</v-icon>{{ person.phone }}
              </v-chip>
              <v-chip v-if="person.email" size="small" variant="tonal" class="mr-1">
                <v-icon start size="small">mdi-email</v-icon>{{ person.email }}
              </v-chip>
              <v-chip v-if="person.address" size="small" variant="tonal">
                <v-icon start size="small">mdi-map-marker</v-icon>{{ person.address }}
              </v-chip>
            </div>
          </v-col>
          <v-col cols="auto">
            <PersonsBtnEdit :person="person" />
            <v-btn
              v-if="can(PERMISSIONS.PERSONS_DELETE)"
              color="error"
              variant="text"
              @click="remove"
            >
              Eliminar
            </v-btn>
          </v-col>
        </v-row>
      </v-card-text>
    </v-card>

    <!-- Sección Familia (Hogar) -->
    <v-card class="mb-4">
      <v-card-title class="d-flex align-center justify-space-between">
        <span>Familia (Hogar)</span>
        <div>
          <v-btn
            v-if="!person.families?.length && can(PERMISSIONS.FAMILIES_CREATE)"
            color="primary"
            size="small"
            prepend-icon="mdi-home-plus"
            @click="openCreateFamily"
          >
            Crear familia
          </v-btn>
          <v-btn
            v-for="f in person.families"
            v-else-if="!person.marriages?.length && can(PERMISSIONS.FAMILIES_UPDATE)"
            :key="`btn-${f.id}`"
            color="secondary"
            size="small"
            variant="tonal"
            prepend-icon="mdi-ring"
            class="ml-1"
            @click="openAddSpouse(f)"
          >
            Agregar cónyuge
          </v-btn>
          <v-btn
            v-for="f in person.families"
            :key="`btn-member-${f.id}`"
            v-else-if="can(PERMISSIONS.FAMILIES_UPDATE)"
            color="secondary"
            size="small"
            variant="tonal"
            prepend-icon="mdi-account-plus"
            class="ml-1"
            @click="openAddFamilyMember(f)"
          >
            Agregar miembro
          </v-btn>
        </div>
      </v-card-title>
      <v-card-text>
        <template v-if="person.families?.length">
          <template v-for="f in person.families" :key="f.id">
            <div class="d-flex align-center mb-1">
              <strong class="text-subtitle-2">
                <v-icon start size="small">mdi-home-group</v-icon>
                {{ f.name }}
              </strong>
              <v-chip size="x-small" variant="tonal" class="ml-2">
                tu rol: {{ f.roleInFamily || '—' }}
              </v-chip>
            </div>
            <v-row>
              <v-col
                v-for="m in f.members"
                :key="m.personId"
                cols="12"
                sm="6"
                md="4"
              >
                <v-card
                  variant="tonal"
                  :class="m.personId === personId ? 'border-primary' : ''"
                >
                  <v-card-text class="d-flex align-center pa-2">
                    <v-avatar
                      :color="m.personId === personId ? 'primary' : 'secondary'"
                      variant="tonal"
                      size="40"
                      class="mr-2"
                    >
                      <span class="text-subtitle-1">{{ m.name?.charAt(0) || '?' }}</span>
                    </v-avatar>
                    <div class="flex-grow-1">
                      <a
                        class="text-body-2 font-weight-medium cursor-pointer"
                        @click="navigateTo(`/persons/${m.personId}`)"
                      >
                        {{ m.name }}
                      </a>
                      <div class="text-caption text-medium-emphasis">
                        {{ m.roleInFamily || 'miembro' }}
                        <v-chip v-if="m.personId === personId" size="x-small" color="primary" variant="flat" class="ml-1">
                          ERES TÚ
                        </v-chip>
                      </div>
                    </div>
                    <v-btn
                      v-if="m.personId !== personId && can(PERMISSIONS.FAMILIES_UPDATE)"
                      size="x-small"
                      variant="text"
                      icon="mdi-close"
                      @click="removeFamilyMember(f, m.personId, m.name)"
                    />
                  </v-card-text>
                </v-card>
              </v-col>
            </v-row>
          </template>
        </template>
        <span v-else class="text-medium-emphasis">
          Sin familia de hogar registrada. Crea una para agrupar a la familia que vive en el mismo hogar.
        </span>
      </v-card-text>
    </v-card>

    <!-- Cónyuge -->
    <v-card v-if="person.marriages?.length" class="mb-4">
      <v-card-title class="text-h6">Cónyuge</v-card-title>
      <v-card-text>
        <v-list density="compact">
          <v-list-item v-for="m in person.marriages" :key="m.id">
            <template #prepend><v-icon>mdi-ring</v-icon></template>
            <v-list-item-title>{{ m.spouseName }}</v-list-item-title>
            <v-list-item-subtitle>{{ m.marriageDate ? formatDate(m.marriageDate) : '' }}</v-list-item-subtitle>
          </v-list-item>
        </v-list>
      </v-card-text>
    </v-card>

    <!-- Relaciones Familiares -->
    <v-card class="mb-4">
      <v-card-title class="d-flex align-center justify-space-between">
        <span>Relaciones Familiares</span>
        <div>
          <v-btn-toggle v-model="viewMode" density="compact" variant="outlined" class="mr-2">
            <v-btn value="cards" prepend-icon="mdi-view-grid">
              Tarjetas
            </v-btn>
            <v-btn value="tree" prepend-icon="mdi-sitemap">
              Árbol
            </v-btn>
          </v-btn-toggle>
          <v-btn
            v-if="can(PERMISSIONS.RELATIONSHIPS_CREATE)"
            color="primary"
            size="small"
            prepend-icon="mdi-account-plus"
            @click="openAddRelation"
          >
            Agregar relación
          </v-btn>
        </div>
      </v-card-title>
      <v-card-text>
        <template v-if="allRelations.length === 0">
          <span class="text-medium-emphasis">Sin relaciones familiares registradas</span>
        </template>

        <!-- ====== VISTA TARJETAS ====== -->
        <template v-else-if="viewMode === 'cards'">
          <v-row v-for="(rels, type) in groupedRelations" :key="type" class="mb-2">
            <v-col cols="12">
              <strong>{{ relationshipLabel(String(type)) }}</strong>
              <div class="d-flex flex-wrap mt-1">
                <v-chip
                  v-for="r in rels"
                  :key="r.relationshipId"
                  closable
                  :close-icon="can(PERMISSIONS.RELATIONSHIPS_DELETE) ? 'mdi-close' : ''"
                  @click:close="removeRelation(r)"
                  class="mr-2 mb-2"
                >
                  <span class="cursor-pointer" @click="navigateTo(`/persons/${r.personId}`)">
                    {{ r.personName }}
                  </span>
                </v-chip>
              </div>
            </v-col>
          </v-row>
        </template>

        <!-- ====== VISTA ÁRBOL ====== -->
        <template v-else>
          <!-- Padres -->
          <div v-for="r in groupedRelations['padre'] || []" :key="r.relationshipId" class="relation-node">
            <v-icon>mdi-account-arrow-up</v-icon>
            <span class="relation-role">Padre</span>
            <a class="relation-name" @click="navigateTo(`/persons/${r.personId}`)">{{ r.personName }}</a>
            <v-btn v-if="can(PERMISSIONS.RELATIONSHIPS_DELETE)" size="x-small" variant="text" icon="mdi-close" @click="removeRelation(r)" />
          </div>

          <!-- Cónyuge -->
          <div v-if="person.marriages?.length" class="relation-node">
            <v-icon>mdi-ring</v-icon>
            <span class="relation-role">Cónyuge</span>
            <a class="relation-name" @click="navigateTo(`/persons/${person.marriages[0].spouseId}`)">{{ person.marriages[0].spouseName }}</a>
          </div>

          <!-- Persona central -->
          <div class="relation-node relation-center">
            <v-icon>mdi-account</v-icon>
            <strong class="relation-name">{{ person.name }}</strong>
          </div>

          <!-- Hijos -->
          <div v-for="r in [...(groupedRelations['hijo'] || []), ...(groupedRelations['hija'] || [])]" :key="r.relationshipId" class="relation-node relation-child">
            <v-icon>mdi-account-arrow-down</v-icon>
            <span class="relation-role">{{ r.relationshipType === 'hijo' ? 'Hijo' : 'Hija' }}</span>
            <a class="relation-name" @click="navigateTo(`/persons/${r.personId}`)">{{ r.personName }}</a>
            <v-btn v-if="can(PERMISSIONS.RELATIONSHIPS_DELETE)" size="x-small" variant="text" icon="mdi-close" @click="removeRelation(r)" />
          </div>

          <!-- Sobrinos -->
          <div v-for="r in [...(groupedRelations['sobrino'] || []), ...(groupedRelations['sobrina'] || [])]" :key="r.relationshipId" class="relation-node relation-child">
            <v-icon>mdi-account-arrow-down</v-icon>
            <span class="relation-role">{{ r.relationshipType === 'sobrino' ? 'Sobrino' : 'Sobrina' }}</span>
            <a class="relation-name" @click="navigateTo(`/persons/${r.personId}`)">{{ r.personName }}</a>
            <v-btn v-if="can(PERMISSIONS.RELATIONSHIPS_DELETE)" size="x-small" variant="text" icon="mdi-close" @click="removeRelation(r)" />
          </div>

          <!-- Otros -->
          <div v-for="(group, type) in groupedRelations" :key="String(type)">
            <div v-if="!['padre', 'hijo', 'hija', 'sobrino', 'sobrina'].includes(String(type))">
              <div v-for="r in group" :key="r.relationshipId" class="relation-node">
                <v-icon>mdi-account-heart</v-icon>
                <span class="relation-role">{{ relationshipLabel(String(type)) }}</span>
                <a class="relation-name" @click="navigateTo(`/persons/${r.personId}`)">{{ r.personName }}</a>
                <v-btn v-if="can(PERMISSIONS.RELATIONSHIPS_DELETE)" size="x-small" variant="text" icon="mdi-close" @click="removeRelation(r)" />
              </div>
            </div>
          </div>
        </template>
      </v-card-text>
    </v-card>

    <!-- Ministerios -->
    <v-card class="mb-4">
      <v-card-title class="text-h6">Ministerios</v-card-title>
      <v-card-text>
        <template v-if="person.ministries?.length">
          <v-chip
            v-for="m in person.ministries"
            :key="m.id"
            :color="m.color || 'primary'"
            variant="tonal"
            class="mr-2 mb-2"
          >
            {{ m.name }}
            <span v-if="m.roleInMinistry !== 'member'">
              ({{ m.roleInMinistry === 'director' ? 'Director' : 'Líder' }})
            </span>
          </v-chip>
        </template>
        <span v-else class="text-medium-emphasis">No está vinculado a ningún ministerio</span>
      </v-card-text>
    </v-card>

    <!-- Información extra: membresía y bautismo -->
    <v-card class="mb-4">
      <v-card-title class="text-h6">Información de la iglesia</v-card-title>
      <v-card-text>
        <v-list density="compact">
          <v-list-item>
            <template #prepend><v-icon>mdi-calendar-check</v-icon></template>
            <v-list-item-title>Membresía: {{ person.membershipDate ? formatDate(person.membershipDate) : '—' }}</v-list-item-title>
          </v-list-item>
          <v-list-item>
            <template #prepend><v-icon>mdi-water</v-icon></template>
            <v-list-item-title>Bautismo: {{ person.baptismDate ? formatDate(person.baptismDate) : '—' }}</v-list-item-title>
          </v-list-item>
        </v-list>
      </v-card-text>
    </v-card>

    <!-- Tarjetas de Conexión vinculadas -->
    <v-card v-if="can(PERMISSIONS.WELCOME_CARDS_READ)">
      <v-card-title class="text-h6">
        Tarjetas de Conexión
        <v-chip v-if="person.welcomeCards?.length" size="small" color="primary" variant="tonal" class="ml-2">
          {{ person.welcomeCards.length }}
        </v-chip>
      </v-card-title>
      <v-card-text>
        <template v-if="person.welcomeCards?.length">
          <v-list density="compact">
            <v-list-item
              v-for="wc in person.welcomeCards"
              :key="wc.id"
              :title="wc.name"
              :subtitle="formatDate(wc.registrationDate)"
            >
              <template #prepend>
                <v-icon>mdi-card-account-details-outline</v-icon>
              </template>
              <template #append>
                <v-chip
                  size="small"
                  :color="wc.visitorType === 'first_time' ? 'blue' : 'orange'"
                  variant="tonal"
                  class="mr-2"
                >
                  {{ wc.visitorType === 'first_time' ? 'Primera vez' : 'Actualiza info' }}
                </v-chip>
                <v-chip v-if="wc.eventName" size="small" variant="tonal" class="mr-2">
                  {{ wc.eventName }}
                </v-chip>
                <v-btn
                  size="small"
                  variant="text"
                  color="primary"
                  icon="mdi-eye-outline"
                  title="Ver tarjeta"
                  @click="navigateTo(`/welcome/${wc.id}`)"
                />
              </template>
            </v-list-item>
          </v-list>
        </template>
        <span v-else class="text-medium-emphasis">Sin tarjetas de conexión registradas.</span>
      </v-card-text>
    </v-card>

    <!-- Diálogo Familia (Crear / Agregar miembro) -->
    <v-dialog v-model="familyDialog" max-width="500">
      <v-card>
        <v-card-title>
          {{ familyMode === 'create' ? 'Crear familia de hogar (con cónyuge)' : familyMode === 'add-spouse' ? 'Agregar cónyuge a la familia' : 'Agregar miembro a la familia' }}
        </v-card-title>
        <v-card-text>
          <v-form @submit.prevent="saveFamily">
            <template v-if="familyMode === 'create'">
              <v-text-field
                v-model="familyForm.name"
                label="Nombre de la familia"
                placeholder="Ej: Familia Pérez"
              />
              <v-select
                v-model="familyForm.roleInFamily"
                label="Rol de esta persona"
                :items="familyRoleOptions"
                item-title="title"
                item-value="value"
                clearable
                @update:model-value="familyForm.spouseRole = suggestSpouseRole()"
              />

              <v-divider class="my-3" />

              <!-- Sección Cónyuge -->
              <p class="text-subtitle-2 text-medium-emphasis mb-2">
                <v-icon size="small">mdi-ring</v-icon>
                Cónyuge (esposo/esposa)
              </p>
              <v-autocomplete
                v-model="familyForm.spousePersonId"
                label="Seleccionar cónyuge existente"
                :items="persons.filter((p) => p.id !== personId)"
                item-title="name"
                item-value="id"
                clearable
              />
              <v-text-field
                v-if="!familyForm.spousePersonId"
                v-model="familyForm.spouseName"
                label="O crear nuevo cónyuge (nombre)"
              />
              <v-select
                v-model="familyForm.spouseRole"
                label="Rol del cónyuge"
                :items="familyRoleOptions"
                item-title="title"
                item-value="value"
                clearable
              />
              <v-checkbox
                v-model="familyForm.createMarriage"
                label="Crear también el matrimonio (esposo/esposa)"
                hide-details
              />

              <v-divider class="my-3" />

              <p class="text-caption text-medium-emphasis mb-2">Miembros adicionales (hijos, opcional)</p>
              <v-autocomplete
                v-model="familyForm.memberPersonId"
                label="Persona existente"
                :items="persons.filter((p) => p.id !== personId)"
                item-title="name"
                item-value="id"
                clearable
              />
              <v-text-field
                v-if="!familyForm.memberPersonId"
                v-model="familyForm.memberName"
                label="O crear nueva persona (nombre)"
              />
              <v-select
                v-model="familyForm.memberRole"
                label="Rol del otro miembro"
                :items="familyRoleOptions"
                item-title="title"
                item-value="value"
                clearable
              />
            </template>

            <template v-else-if="familyMode === 'add-spouse'">
              <v-autocomplete
                v-model="familyForm.spousePersonId"
                label="Seleccionar cónyuge existente"
                :items="persons.filter((p) => p.id !== personId)"
                item-title="name"
                item-value="id"
                clearable
              />
              <v-text-field
                v-if="!familyForm.spousePersonId"
                v-model="familyForm.spouseName"
                label="O crear nuevo cónyuge (nombre)"
              />
              <v-select
                v-model="familyForm.spouseRole"
                label="Rol del cónyuge"
                :items="familyRoleOptions"
                item-title="title"
                item-value="value"
                clearable
              />
              <v-checkbox
                v-model="familyForm.createMarriage"
                label="Crear también el matrimonio (esposo/esposa)"
                hide-details
              />
            </template>

            <template v-else>
              <v-autocomplete
                v-model="familyForm.memberPersonId"
                label="Persona existente"
                :items="persons.filter((p) => p.id !== personId)"
                item-title="name"
                item-value="id"
                clearable
              />
              <v-text-field
                v-if="!familyForm.memberPersonId"
                v-model="familyForm.memberName"
                label="O crear nueva persona (nombre)"
              />
              <v-select
                v-model="familyForm.memberRole"
                label="Rol del miembro"
                :items="familyRoleOptions"
                item-title="title"
                item-value="value"
                clearable
              />
              <v-checkbox
                v-if="!person.marriages?.length && ['padre', 'madre', 'esposo', 'esposa'].includes(familyForm.memberRole)"
                v-model="familyForm.createMarriage"
                label="Vincular también como cónyuge (matrimonio)"
                hide-details
              />
            </template>
          </v-form>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="familyDialog = false">Cancelar</v-btn>
          <v-btn color="primary" @click="saveFamily">Guardar</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Diálogo Agregar relación -->
    <v-dialog v-model="relationDialog" max-width="500">
      <v-card>
        <v-card-title>Agregar relación familiar</v-card-title>
        <v-card-text>
          <v-form @submit.prevent="addRelation">
            <v-autocomplete
              v-model="relationForm.relatedPersonId"
              label="Persona relacionada"
              :items="persons.filter((p) => p.id !== personId)"
              item-title="name"
              item-value="id"
              required
            />
            <v-select
              v-model="relationForm.relationshipType"
              label="Tipo de relación (esta persona es...)"
              :items="[
                { title: 'Padre', value: 'padre' },
                { title: 'Madre', value: 'madre' },
                { title: 'Hijo', value: 'hijo' },
                { title: 'Hija', value: 'hija' },
                { title: 'Hermano', value: 'hermano' },
                { title: 'Hermana', value: 'hermana' },
                { title: 'Tío', value: 'tio' },
                { title: 'Tía', value: 'tia' },
                { title: 'Sobrino', value: 'sobrino' },
                { title: 'Sobrina', value: 'sobrina' },
                { title: 'Abuelo', value: 'abuelo' },
                { title: 'Abuela', value: 'abuela' },
                { title: 'Nieto', value: 'nieto' },
                { title: 'Nieta', value: 'nieta' },
                { title: 'Primo', value: 'primo' },
                { title: 'Prima', value: 'prima' },
                { title: 'Cuñado', value: 'cuñado' },
                { title: 'Cuñada', value: 'cuñada' },
                { title: 'Suegro', value: 'suegro' },
                { title: 'Suegra', value: 'suegra' },
                { title: 'Yerno', value: 'yerno' },
                { title: 'Nuera', value: 'nuera' },
                { title: 'Otro', value: 'otro' },
              ]"
              item-title="title"
              item-value="value"
            />
          </v-form>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="relationDialog = false">Cancelar</v-btn>
          <v-btn color="primary" @click="addRelation">Guardar</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Modal de persona (editar) -->
    <PersonsForm @saved="fetchPerson" />
  </div>
</template>

<style scoped>
.relation-node {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 0;
}
.relation-node.relation-center {
  margin: 8px 0 8px 24px;
  font-size: 1.05em;
}
.relation-node.relation-child {
  margin-left: 48px;
}
.relation-role {
  color: #666;
  font-size: 0.85em;
  font-weight: 500;
  min-width: 80px;
}
.relation-name {
  color: var(--v-theme-primary);
  cursor: pointer;
  text-decoration: none;
}
.relation-name:hover {
  text-decoration: underline;
}
</style>