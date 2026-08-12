<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { useDisplay } from 'vuetify'

const props = defineProps<{
  eventId: string
  isKidsEvent?: boolean
  requireWristband?: boolean
  ministryName?: string
}>()

const { mobile } = useDisplay()

const emit = defineEmits<{
  (e: 'saved'): void
}>()

const { createCheckIn, error } = useCheckIns()

const isOpen = ref(false)
const submitting = ref(false)
const submitError = ref('')

// ¿Flujo de niños (RocaKids) o eventos principales? Por defecto kids (comportamiento actual).
const kidsMode = computed(() => props.isKidsEvent !== false)

// ========================================================================
// MODO RocaKids (niños) — comportamiento actual intacto
// ========================================================================

// ===== Persona que trae (adulto) =====
const personSearch = ref('')
const personResults = ref<Array<Record<string, any>>>([])
const searching = ref(false)
const selectedPerson = ref<Record<string, any> | null>(null)

// Si no se encontró, se crea una persona nueva
const newPerson = reactive({
  name: '',
  phone: '',
})
const showNewPerson = ref(false)

// ===== Niños relacionados de la persona seleccionada =====
interface KidSuggestion {
  id: string
  name: string
  birthDate?: string | null
  age?: number | null
  relationship?: string
}

interface ChildEntry {
  key: string
  personId?: string
  name: string
  birthDate?: string
  relationship: string
  wristbandNumber: string
}

const relatedKids = ref<KidSuggestion[]>([])
const selectedChildren = ref<ChildEntry[]>([])

// Búsqueda global de niño (fallback si no hay relacionados)
const childSearch = ref('')
const childSearchResults = ref<Array<Record<string, any>>>([])
const searchingChildren = ref(false)
const showAddChild = ref(false)

// ===== Autorizados a recoger =====
const pickupSearch = ref('')
const pickupResults = ref<Array<Record<string, any>>>([])
const searchingPickups = ref(false)
const selectedPickups = ref<Record<string, any>[]>([])
const familyCircle = ref<Array<Record<string, any>>>([])
const loadingFamilyCircle = ref(false)
const autoPickup = ref<Record<string, any> | null>(null)

// ========================================================================
// MODO EVENTO PRINCIPAL (adultos) — personas que asisten directamente
// ========================================================================

interface PeopleEntry {
  key: string
  personId?: string
  name: string
  phone?: string
  wristbandNumber: string
  isPrimary: boolean
  relationship?: string
}

const people = ref<PeopleEntry[]>([])
const suggestions = ref<Array<Record<string, any>>>([])
const loadingSuggestions = ref(false)
const suggestionSearch = ref('')
const suggestionResults = ref<Array<Record<string, any>>>([])
const searchingSuggestions = ref(false)
const addingManual = ref(false)
const manualName = ref('')
const manualPhone = ref('')

// ¿Ministerio de casados/matrimonios? (solo sugiere cónyuge)
const isMarriageMinistry = computed(() => {
  const name = (props.ministryName || '').toLowerCase()
  return /casad|matrimonio|pareja|hogar/i.test(name)
})

let searchTimeout: ReturnType<typeof setTimeout> | null = null
let childSearchTimeout: ReturnType<typeof setTimeout> | null = null
let pickupSearchTimeout: ReturnType<typeof setTimeout> | null = null
let suggestionSearchTimeout: ReturnType<typeof setTimeout> | null = null

const open = () => {
  isOpen.value = true
  reset()
}

const close = () => {
  isOpen.value = false
}

const reset = () => {
  // Modo kids
  personSearch.value = ''
  personResults.value = []
  selectedPerson.value = null
  newPerson.name = ''
  newPerson.phone = ''
  showNewPerson.value = false
  relatedKids.value = []
  selectedChildren.value = []
  childSearch.value = ''
  childSearchResults.value = []
  showAddChild.value = false
  pickupSearch.value = ''
  pickupResults.value = []
  selectedPickups.value = []
  familyCircle.value = []
  autoPickup.value = null

  // Modo general
  people.value = []
  suggestions.value = []
  loadingSuggestions.value = false
  suggestionSearch.value = ''
  suggestionResults.value = []
  searchingSuggestions.value = false
  addingManual.value = false
  manualName.value = ''
  manualPhone.value = ''

  submitError.value = ''
}

const formatDate = (date?: string | null) => {
  if (!date) return ''
  const d = new Date(date)
  if (isNaN(d.getTime())) return ''
  return d.toLocaleDateString()
}

// ========================================================================
// Búsqueda de la persona (adulto) — modo kids
// ========================================================================
watch(personSearch, (val) => {
  if (searchTimeout) clearTimeout(searchTimeout)
  if (!val || val.length < 2) {
    personResults.value = []
    return
  }
  searchTimeout = setTimeout(async () => {
    searching.value = true
    try {
      const result = await $fetch('/api/persons', {
        params: { search: val, limit: 8, 'related-kids': 1, eventId: props.eventId },
      }) as any
      personResults.value = result.items || []
    } catch {
      personResults.value = []
    } finally {
      searching.value = false
    }
  }, 400)
})

const selectPerson = (person: Record<string, any>) => {
  selectedPerson.value = person
  showNewPerson.value = false
  // Niños relacionados de la persona
  relatedKids.value = (person.relatedKids || []).map((k: Record<string, any>) => ({
    id: k.id,
    name: k.name,
    birthDate: k.birthDate,
    age: k.age ?? null,
    relationship: k.relationship || '',
  }))
  // No preseleccionar: el recepcionista marca cuáles va a registrar
  selectedChildren.value = []

  // La persona que entrega queda como autorizado predeterminado
  autoPickup.value = { id: person.id, name: person.name, phone: person.phone || '' }
  selectedPickups.value = autoPickup.value ? [autoPickup.value] : []

  // Cargar círculo familiar para sugerencias rápidas
  loadFamilyCircle(person.id)
}

const loadFamilyCircle = async (personId: string) => {
  loadingFamilyCircle.value = true
  familyCircle.value = []
  try {
    const result = await $fetch(`/api/persons/${personId}/family-circle`) as any
    // Excluir a la persona que entrega (ya está como autorizado)
    familyCircle.value = (result?.items || []).filter(
      (p: Record<string, any>) => p.id !== personId
    )
  } catch {
    familyCircle.value = []
  } finally {
    loadingFamilyCircle.value = false
  }
}

const createNewPersonMode = () => {
  selectedPerson.value = null
  showNewPerson.value = true
  personSearch.value = ''
  personResults.value = []
  relatedKids.value = []
  selectedChildren.value = []
  familyCircle.value = []
  autoPickup.value = null
  selectedPickups.value = []
}

// ===== Marcar un niño relacionado para registrarlo =====
const toggleKid = (kid: KidSuggestion) => {
  const existing = selectedChildren.value.find((c) => c.personId === kid.id)
  if (existing) {
    selectedChildren.value = selectedChildren.value.filter((c) => c.personId !== kid.id)
  } else {
    selectedChildren.value.push({
      key: `kid-${kid.id}`,
      personId: kid.id,
      name: kid.name,
      birthDate: kid.birthDate || undefined,
      relationship: kid.relationship || '',
      wristbandNumber: '',
    })
  }
}

const isKidSelected = (kidId: string) =>
  selectedChildren.value.some((c) => c.personId === kidId)

// ===== Agregar niño desde búsqueda global (fallback) =====
const addNewChildEntry = () => {
  selectedChildren.value.push({
    key: `new-${Date.now()}`,
    name: '',
    relationship: '',
    wristbandNumber: '',
  })
}

const addChildFromSearch = (child: Record<string, any>) => {
  if (selectedChildren.value.some((c) => c.personId === child.id)) return
  selectedChildren.value.push({
    key: `search-${child.id}`,
    personId: child.id,
    name: child.name,
    birthDate: child.birthDate || undefined,
    relationship: '',
    wristbandNumber: '',
  })
  childSearch.value = ''
  childSearchResults.value = []
  showAddChild.value = false
}

const removeChildEntry = (key: string) => {
  selectedChildren.value = selectedChildren.value.filter((c) => c.key !== key)
}

watch(childSearch, (val) => {
  if (childSearchTimeout) clearTimeout(childSearchTimeout)
  if (!val || val.length < 2) {
    childSearchResults.value = []
    return
  }
  childSearchTimeout = setTimeout(async () => {
    searchingChildren.value = true
    try {
      const result = await $fetch('/api/persons', {
        params: { search: val, limit: 8 },
      }) as any
      childSearchResults.value = result.items || []
    } catch {
      childSearchResults.value = []
    } finally {
      searchingChildren.value = false
    }
  }, 400)
})

// ===== Búsqueda de autorizados a recoger (Personas) =====
watch(pickupSearch, (val) => {
  if (pickupSearchTimeout) clearTimeout(pickupSearchTimeout)
  if (!val || val.length < 2) {
    pickupResults.value = []
    return
  }
  pickupSearchTimeout = setTimeout(async () => {
    searchingPickups.value = true
    try {
      const result = await $fetch('/api/persons', {
        params: { search: val, limit: 8 },
      }) as any
      pickupResults.value = (result.items || []).filter(
        (p: Record<string, any>) => p.id !== selectedPerson.value?.id
      )
    } catch {
      pickupResults.value = []
    } finally {
      searchingPickups.value = false
    }
  }, 400)
})

const addPickup = (person: Record<string, any>) => {
  if (selectedPickups.value.some((p) => p.id === person.id)) return
  selectedPickups.value.push(person)
  pickupSearch.value = ''
  pickupResults.value = []
}

const removePickup = (id: string) => {
  selectedPickups.value = selectedPickups.value.filter((p) => p.id !== id)
}

const removeAutoPickup = () => {
  if (autoPickup.value) {
    removePickup(autoPickup.value.id)
    autoPickup.value = null
  }
}

// ¿Es un adulto? (para filtrar el círculo familiar en autorizados a recoger)
const isAdult = (person: Record<string, any>) => {
  if (person.age === null || person.age === undefined) return true
  return person.age >= 18
}

const isPickupSelected = (id: string) =>
  selectedPickups.value.some((p) => p.id === id)

const toggleFamilyPickup = (person: Record<string, any>) => {
  if (isPickupSelected(person.id)) {
    removePickup(person.id)
  } else {
    addPickup(person)
  }
}

const otherPickups = computed(() => {
  const autoId = autoPickup.value?.id
  return selectedPickups.value.filter((p) => p.id !== autoId)
})

const adultFamilyCircle = computed(() =>
  familyCircle.value.filter(isAdult)
)

// ========================================================================
// MODO GENERAL (no-kids) — lógica de personas que ingresan
// ========================================================================

const generalPersonSearch = ref('')
const generalPersonResults = ref<Array<Record<string, any>>>([])
const generalSearching = ref(false)
let generalSearchTimeout: ReturnType<typeof setTimeout> | null = null

// Búsqueda de la persona principal / acompañantes
watch(generalPersonSearch, (val) => {
  if (generalSearchTimeout) clearTimeout(generalSearchTimeout)
  if (!val || val.length < 2) {
    generalPersonResults.value = []
    return
  }
  generalSearchTimeout = setTimeout(async () => {
    generalSearching.value = true
    try {
      const result = await $fetch('/api/persons', {
        params: { search: val, limit: 8 },
      }) as any
      generalPersonResults.value = (result.items || []).filter(
        (p: Record<string, any>) => !people.value.some((pe) => pe.personId === p.id)
      )
    } catch {
      generalPersonResults.value = []
    } finally {
      generalSearching.value = false
    }
  }, 400)
})

const selectGeneralPerson = (person: Record<string, any>) => {
  people.value.push({
    key: `person-${person.id}`,
    personId: person.id,
    name: person.name,
    phone: person.phone || '',
    wristbandNumber: '',
    isPrimary: people.value.length === 0,
  })
  generalPersonSearch.value = ''
  generalPersonResults.value = []

  // Si es la primera persona (principal), cargar sugerencias (cónyuge/familia)
  if (people.value.length === 1) {
    loadSuggestions(person.id)
  }
}

const loadSuggestions = async (personId: string) => {
  loadingSuggestions.value = true
  suggestions.value = []
  try {
    const seen = new Set<string>()

    // 1) Cónyuge desde matrimonios activos
    const detail = await $fetch(`/api/persons/${personId}`) as any
    for (const m of (detail?.marriages || [])) {
      if (!m?.spouseId || seen.has(m.spouseId)) continue
      seen.add(m.spouseId)
      suggestions.value.push({
        id: m.spouseId,
        name: m.spouseName || '',
        phone: m.phone || '',
        relationship: 'cónyuge',
        source: 'spouse',
      })
    }

    // 2) En eventos generales (no de casados), también sugerir familiares adultos
    if (!isMarriageMinistry.value) {
      const circle = await $fetch(`/api/persons/${personId}/family-circle`) as any
      for (const fam of (circle?.items || [])) {
        if (seen.has(fam.id)) continue
        if (fam.age !== null && fam.age !== undefined && fam.age < 18) continue
        seen.add(fam.id)
        suggestions.value.push({
          id: fam.id,
          name: fam.name || '',
          phone: fam.phone || '',
          relationship: fam.relationship || '',
          source: 'family',
        })
      }
    }
  } catch {
    suggestions.value = []
  } finally {
    loadingSuggestions.value = false
  }
}

const isSuggestionSelected = (id: string) =>
  people.value.some((p) => p.personId === id)

const toggleSuggestion = (sugg: Record<string, any>) => {
  if (isSuggestionSelected(sugg.id)) {
    people.value = people.value.filter((p) => p.personId !== sugg.id)
  } else {
    people.value.push({
      key: `sugg-${sugg.id}`,
      personId: sugg.id,
      name: sugg.name,
      phone: sugg.phone || '',
      wristbandNumber: '',
      isPrimary: false,
      relationship: sugg.relationship || '',
    })
  }
}

// Búsqueda manual de acompañantes adicionales
watch(suggestionSearch, (val) => {
  if (suggestionSearchTimeout) clearTimeout(suggestionSearchTimeout)
  if (!val || val.length < 2) {
    suggestionResults.value = []
    return
  }
  suggestionSearchTimeout = setTimeout(async () => {
    searchingSuggestions.value = true
    try {
      const result = await $fetch('/api/persons', {
        params: { search: val, limit: 8 },
      }) as any
      suggestionResults.value = (result.items || []).filter(
        (p: Record<string, any>) => !people.value.some((pe) => pe.personId === p.id)
      )
    } catch {
      suggestionResults.value = []
    } finally {
      searchingSuggestions.value = false
    }
  }, 400)
})

const addSuggestionResult = (person: Record<string, any>) => {
  people.value.push({
    key: `sugg-search-${person.id}`,
    personId: person.id,
    name: person.name,
    phone: person.phone || '',
    wristbandNumber: '',
    isPrimary: false,
  })
  suggestionSearch.value = ''
  suggestionResults.value = []
}

const removePerson = (key: string) => {
  people.value = people.value.filter((p) => p.key !== key)
}

const toggleAddManual = () => {
  addingManual.value = !addingManual.value
  manualName.value = ''
  manualPhone.value = ''
}

const addManualPerson = () => {
  if (!manualName.value.trim()) return
  people.value.push({
    key: `manual-${Date.now()}`,
    name: manualName.value.trim(),
    phone: manualPhone.value.trim(),
    wristbandNumber: '',
    isPrimary: people.value.length === 0,
  })
  manualName.value = ''
  manualPhone.value = ''
  addingManual.value = false
}

// ========================================================================
// Validación y envío
// ========================================================================

// Validación modo kids
const hasSelectedPerson = computed(
  () => !!selectedPerson.value || (showNewPerson.value && newPerson.name.trim())
)

const canSubmitKids = computed(() => {
  const hasChildren = selectedChildren.value.length > 0 &&
    selectedChildren.value.every((c) => c.name.trim() && c.wristbandNumber.trim())
  return hasSelectedPerson.value && hasChildren && !submitting.value
})

// Validación modo general
const canSubmitGeneral = computed(() => {
  if (!people.value.length || submitting.value) return false
  const requireWb = !!props.requireWristband
  for (const p of people.value) {
    if (!p.name.trim()) return false
    if (requireWb && !p.wristbandNumber.trim()) return false
  }
  return true
})

const canSubmit = computed(() => (kidsMode.value ? canSubmitKids.value : canSubmitGeneral.value))

const submitKids = async () => {
  // Validar que las manillas no se repitan
  const wristbands = selectedChildren.value.map((c) => c.wristbandNumber.trim())
  const uniqueWristbands = new Set(wristbands)
  if (uniqueWristbands.size !== wristbands.length) {
    submitError.value = 'Los números de manilla no pueden repetirse'
    return false
  }

  const payload = {
    eventId: props.eventId,
    caregiver: selectedPerson.value
      ? { personId: selectedPerson.value.id }
      : { name: newPerson.name.trim(), phone: newPerson.phone.trim() },
    children: selectedChildren.value.map((c) => ({
      personId: c.personId || undefined,
      name: c.personId ? undefined : c.name.trim(),
      birthDate: c.personId ? undefined : (c.birthDate || undefined),
      wristbandNumber: c.wristbandNumber.trim(),
    })),
    allowedPickups: selectedPickups.value.map((p) => p.id),
  }

  submitting.value = true
  const success = await createCheckIn(payload)
  submitting.value = false
  return success
}

const submitGeneral = async () => {
  // Validar manillas duplicadas si el evento las requiere
  if (props.requireWristband) {
    const wristbands = people.value.map((p) => p.wristbandNumber.trim())
    const uniqueWristbands = new Set(wristbands)
    if (uniqueWristbands.size !== wristbands.length) {
      submitError.value = 'Los números de manilla no pueden repetirse'
      return false
    }
  }

  const payload = {
    eventId: props.eventId,
    people: people.value.map((p) => ({
      personId: p.personId || undefined,
      name: p.personId ? undefined : p.name.trim(),
      phone: p.personId ? undefined : (p.phone?.trim() || undefined),
      wristbandNumber: props.requireWristband ? p.wristbandNumber.trim() : undefined,
    })),
  }

  submitting.value = true
  const success = await createCheckIn(payload)
  submitting.value = false
  return success
}

const submit = async () => {
  submitError.value = ''
  const success = kidsMode.value ? await submitKids() : await submitGeneral()

  if (success) {
    close()
    emit('saved')
  } else {
    submitError.value = error.value
  }
}

defineExpose({ open })
</script>

<template>
  <v-dialog
    :model-value="isOpen"
    :fullscreen="mobile"
    :max-width="mobile ? undefined : (kidsMode ? 800 : 700)"
    @update:model-value="close"
  >
    <v-card>
      <v-progress-linear :indeterminate="submitting" :model-value="submitting ? undefined : 100" />
      <v-card-title>{{ kidsMode ? 'Registrar entrada al evento' : 'Registrar asistencia al evento' }}</v-card-title>
      <v-card-text>
        <v-alert v-if="submitError" type="error" class="mb-4">
          {{ submitError }}
        </v-alert>

        <!-- ==============================================================
             FLUJO RocaKids (niños)
        ============================================================== -->
        <template v-if="kidsMode">
          <!-- ===== Paso 1: Buscar la persona que trae (adulto) ===== -->
          <h3 class="text-subtitle-1 font-weight-bold mb-2">1. Persona que trae al niño</h3>

          <template v-if="!selectedPerson && !showNewPerson">
            <v-text-field
              v-model="personSearch"
              label="Buscar persona por nombre o teléfono"
              prepend-inner-icon="mdi-magnify"
              density="comfortable"
              :loading="searching"
              hint="Escribe al menos 2 caracteres"
            />
            <div v-if="personResults.length" class="mb-2">
              <v-list density="compact" class="border rounded">
                <v-list-item
                  v-for="p in personResults"
                  :key="p.id"
                  :title="p.name"
                  :subtitle="p.phone || ''"
                  @click="selectPerson(p)"
                >
                  <template #append>
                    <v-chip size="x-small" color="primary" variant="tonal">
                      {{ p.relatedKids?.length || 0 }} niño(s) relac.
                    </v-chip>
                  </template>
                </v-list-item>
              </v-list>
            </div>
            <v-btn
              variant="text"
              color="primary"
              prepend-icon="mdi-account-plus"
              @click="createNewPersonMode"
            >
              La persona no está registrada — crearla
            </v-btn>
          </template>

          <!-- Persona seleccionada -->
          <div v-else-if="selectedPerson" class="d-flex align-center mb-2">
            <v-chip color="primary" variant="tonal" class="mr-2">
              {{ selectedPerson.name }}
              <template v-if="selectedPerson.phone"> · {{ selectedPerson.phone }}</template>
            </v-chip>
            <v-btn size="x-small" variant="text" icon="mdi-close" @click="selectedPerson = null; reset()" />
          </div>

          <!-- Nueva persona -->
          <v-row v-else-if="showNewPerson" dense>
            <v-col cols="12" sm="7">
              <v-text-field
                v-model="newPerson.name"
                label="Nombre de la persona *"
                density="comfortable"
              />
            </v-col>
            <v-col cols="12" sm="5">
              <v-text-field
                v-model="newPerson.phone"
                label="Teléfono"
                density="comfortable"
                type="tel"
              />
            </v-col>
          </v-row>

          <!-- ===== Paso 2: Niños relacionados ===== -->
          <div v-if="selectedPerson || showNewPerson">
            <h3 class="text-subtitle-1 font-weight-bold mb-2 mt-4">2. Niños</h3>

            <!-- Niños relacionados de la persona seleccionada -->
            <template v-if="selectedPerson">
              <p class="text-caption text-medium-emphasis mb-2">
                Niños relacionados con {{ selectedPerson.name }}:
              </p>
              <div v-if="relatedKids.length">
                <v-list density="compact" class="border rounded mb-3">
                  <v-list-item
                    v-for="kid in relatedKids"
                    :key="kid.id"
                    @click="toggleKid(kid)"
                  >
                    <template #prepend>
                      <v-checkbox
                        :model-value="isKidSelected(kid.id)"
                        hide-details
                        density="compact"
                      />
                    </template>
                    <v-list-item-title>{{ kid.name }}</v-list-item-title>
                    <v-list-item-subtitle>
                      {{ kid.age !== null ? `${kid.age} años` : '' }}
                      <template v-if="kid.age !== null"> · </template>
                      {{ formatDate(kid.birthDate) }}
                      <span v-if="kid.relationship"> · {{ kid.relationship }}</span>
                    </v-list-item-subtitle>
                  </v-list-item>
                </v-list>
              </div>
              <p v-else class="text-caption text-medium-emphasis">
                Esta persona no tiene niños en edad de RocaKids. Puedes agregar uno abajo.
              </p>
            </template>

            <!-- Entradas seleccionadas con manilla -->
            <div
              v-for="(child, index) in selectedChildren"
              :key="child.key"
              class="mb-2 pa-2 border rounded"
            >
              <v-row dense align="center">
                <v-col cols="12" sm="5">
                  <v-text-field
                    v-model="child.name"
                    label="Nombre del niño *"
                    density="compact"
                    :readonly="!!child.personId"
                  />
                </v-col>
                <v-col cols="12" sm="3">
                  <v-text-field
                    v-model="child.relationship"
                    label="Relación"
                    density="compact"
                    placeholder="padre, madre, tío..."
                  />
                </v-col>
                <v-col cols="12" sm="3">
                  <v-text-field
                    v-model="child.wristbandNumber"
                    label="N° manilla *"
                    density="compact"
                    required
                  />
                </v-col>
                <v-col cols="1">
                  <v-btn
                    size="x-small"
                    variant="text"
                    icon="mdi-close"
                    color="red"
                    @click="removeChildEntry(child.key)"
                  />
                </v-col>
              </v-row>
            </div>

            <v-btn
              variant="text"
              color="primary"
              size="small"
              prepend-icon="mdi-plus"
              class="mb-2"
              @click="addNewChildEntry"
            >
              Agregar otro niño (sin relacionar)
            </v-btn>

            <div>
              <v-btn
                variant="text"
                color="green"
                size="small"
                prepend-icon="mdi-account-search"
                @click="showAddChild = !showAddChild"
              >
                Buscar niño registrado en Personas
              </v-btn>
            </div>

            <div v-if="showAddChild" class="mt-2">
              <v-text-field
                v-model="childSearch"
                label="Buscar niño por nombre"
                prepend-inner-icon="mdi-magnify"
                density="compact"
                :loading="searchingChildren"
              />
              <v-list v-if="childSearchResults.length" density="compact" class="border rounded">
                <v-list-item
                  v-for="child in childSearchResults"
                  :key="child.id"
                  :title="child.name"
                  :subtitle="child.birthDate ? new Date(child.birthDate).toLocaleDateString() : ''"
                  @click="addChildFromSearch(child)"
                >
                  <template #append>
                    <v-btn size="x-small" variant="text" icon="mdi-plus" color="primary" />
                  </template>
                </v-list-item>
              </v-list>
            </div>
          </div>

          <!-- ===== Paso 3: Autorizados a recoger ===== -->
          <div v-if="hasSelectedPerson">
            <h3 class="text-subtitle-1 font-weight-bold mb-2 mt-4">
              3. Autorizados a recoger (opcional)
            </h3>
            <p class="text-caption text-medium-emphasis mb-2">
              La persona que entrega queda autorizada automáticamente. Puedes añadir más.
            </p>

            <!-- Persona que entrega (predeterminada) -->
            <div v-if="autoPickup" class="mb-2">
              <v-chip
                color="green"
                variant="tonal"
                class="mr-1 mb-1"
                closable
                @click:close="removeAutoPickup"
              >
                <v-icon start icon="mdi-check" size="small" />
                {{ autoPickup.name }}
                <template v-if="autoPickup.phone"> · {{ autoPickup.phone }}</template>
              </v-chip>
              <span class="text-caption text-medium-emphasis ml-1">Quien entrega</span>
            </div>

            <!-- Otros autorizados seleccionados -->
            <div v-if="otherPickups.length" class="mb-2">
              <v-chip
                v-for="p in otherPickups"
                :key="p.id"
                class="mr-1 mb-1"
                closable
                @click:close="removePickup(p.id)"
              >
                {{ p.name }}
              </v-chip>
            </div>

            <!-- Círculo familiar: sugerencias rápidas -->
            <template v-if="selectedPerson">
              <p class="text-caption font-weight-medium mb-1 mt-2">
                Círculo familiar de {{ selectedPerson.name }} — toca para autorizar:
              </p>
              <div
                v-if="loadingFamilyCircle"
                class="text-caption text-medium-emphasis mb-2"
              >
                Cargando círculo familiar...
              </div>
              <div
                v-else-if="adultFamilyCircle.length"
                class="mb-2"
              >
                <v-chip
                  v-for="fam in adultFamilyCircle"
                  :key="fam.id"
                  class="mr-1 mb-1"
                  :color="isPickupSelected(fam.id) ? 'primary' : undefined"
                  :variant="isPickupSelected(fam.id) ? 'tonal' : 'outlined'"
                  :prepend-icon="isPickupSelected(fam.id) ? 'mdi-check' : 'mdi-plus'"
                  @click="toggleFamilyPickup(fam)"
                >
                  {{ fam.name }}
                  <template v-if="fam.relationship"> · {{ fam.relationship }}</template>
                </v-chip>
              </div>
              <p v-else-if="!loadingFamilyCircle" class="text-caption text-medium-emphasis mb-2">
                No se encontró círculo familiar registrado.
              </p>
            </template>

            <v-text-field
              v-model="pickupSearch"
              label="Buscar persona autorizada por nombre"
              prepend-inner-icon="mdi-magnify"
              density="compact"
              :loading="searchingPickups"
            />
            <v-list v-if="pickupResults.length" density="compact" class="border rounded">
              <v-list-item
                v-for="p in pickupResults"
                :key="p.id"
                :title="p.name"
                :subtitle="p.phone || ''"
                @click="addPickup(p)"
              >
                <template #append>
                  <v-btn size="x-small" variant="text" icon="mdi-plus" color="primary" />
                </template>
              </v-list-item>
            </v-list>
          </div>
        </template>

        <!-- ==============================================================
             FLUJO EVENTO PRINCIPAL (adultos)
        ============================================================== -->
        <template v-else>
          <!-- ===== Paso 1: Buscar la(s) persona(s) que ingresa(n) ===== -->
          <h3 class="text-subtitle-1 font-weight-bold mb-2">1. Persona(s) que asisten</h3>
          <p class="text-caption text-medium-emphasis mb-2">
            Busca a la persona que ingresa. Se sugiere el cónyuge para agilizar el ingreso conjunto, pero pueden ingresar por separado.
          </p>

          <v-text-field
            v-model="generalPersonSearch"
            label="Buscar persona por nombre o teléfono"
            prepend-inner-icon="mdi-magnify"
            density="comfortable"
            :loading="generalSearching"
            hint="Escribe al menos 2 caracteres"
          />
          <v-list v-if="generalPersonResults.length" density="compact" class="border rounded mb-3">
            <v-list-item
              v-for="p in generalPersonResults"
              :key="p.id"
              :title="p.name"
              :subtitle="p.phone || ''"
              @click="selectGeneralPerson(p)"
            >
              <template #append>
                <v-btn size="x-small" variant="text" icon="mdi-plus" color="primary" />
              </template>
            </v-list-item>
          </v-list>

          <v-btn
            variant="text"
            color="primary"
            size="small"
            prepend-icon="mdi-account-plus"
            class="mb-2"
            @click="toggleAddManual"
          >
            {{ addingManual ? 'Cancelar' : 'Persona no registrada — crearla' }}
          </v-btn>

          <!-- Nueva persona manual -->
          <v-row v-if="addingManual" dense class="mb-3">
            <v-col cols="12" sm="7">
              <v-text-field
                v-model="manualName"
                label="Nombre *"
                density="compact"
              />
            </v-col>
            <v-col cols="12" sm="4">
              <v-text-field
                v-model="manualPhone"
                label="Teléfono"
                density="compact"
                type="tel"
              />
            </v-col>
            <v-col cols="12" sm="1" class="d-flex align-center">
              <v-btn
                size="small"
                color="primary"
                variant="tonal"
                icon="mdi-plus"
                :disabled="!manualName.trim()"
                @click="addManualPerson"
              />
            </v-col>
          </v-row>

          <!-- ===== Personas seleccionadas ===== -->
          <div v-if="people.length" class="mb-3">
            <h3 class="text-subtitle-1 font-weight-bold mb-2 mt-3">2. Personas que ingresan</h3>
            <div
              v-for="(p, index) in people"
              :key="p.key"
              class="mb-2 pa-2 border rounded"
            >
              <v-row dense align="center">
                <v-col :cols="props.requireWristband ? 12 : 11" sm="7">
                  <v-text-field
                    v-model="p.name"
                    label="Nombre *"
                    density="compact"
                    :readonly="!!p.personId"
                  />
                  <div v-if="p.relationship" class="text-caption text-medium-emphasis">
                    {{ p.relationship }}
                  </div>
                </v-col>
                <v-col v-if="props.requireWristband" :cols="12" sm="4">
                  <v-text-field
                    v-model="p.wristbandNumber"
                    label="N° manilla *"
                    density="compact"
                    required
                  />
                </v-col>
                <v-col cols="1">
                  <v-btn
                    v-if="!p.isPrimary || index > 0"
                    size="x-small"
                    variant="text"
                    icon="mdi-close"
                    color="red"
                    @click="removePerson(p.key)"
                  />
                </v-col>
              </v-row>
            </div>
          </div>

          <!-- ===== Sugerencias: cónyuge / familiares ===== -->
          <template v-if="people.length">
            <template v-if="people[0]?.personId">
              <div class="mb-3">
                <p v-if="loadingSuggestions" class="text-caption text-medium-emphasis mb-1">
                  Cargando sugerencias...
                </p>
                <template v-else-if="suggestions.length">
                  <p class="text-caption font-weight-medium mb-1">
                    Toca para agregar al ingreso:
                  </p>
                  <div>
                    <v-chip
                      v-for="sugg in suggestions"
                      :key="sugg.id"
                      class="mr-1 mb-1"
                      :color="isSuggestionSelected(sugg.id) ? 'primary' : undefined"
                      :variant="isSuggestionSelected(sugg.id) ? 'tonal' : 'outlined'"
                      :prepend-icon="isSuggestionSelected(sugg.id) ? 'mdi-check' : 'mdi-plus'"
                      @click="toggleSuggestion(sugg)"
                    >
                      {{ sugg.name }}
                      <template v-if="sugg.relationship"> · {{ sugg.relationship }}</template>
                    </v-chip>
                  </div>
                </template>
              </div>
            </template>

            <v-text-field
              v-model="suggestionSearch"
              label="Buscar acompañante por nombre"
              prepend-inner-icon="mdi-magnify"
              density="compact"
              :loading="searchingSuggestions"
              class="mb-1"
            />
            <v-list v-if="suggestionResults.length" density="compact" class="border rounded mb-3">
              <v-list-item
                v-for="p in suggestionResults"
                :key="p.id"
                :title="p.name"
                :subtitle="p.phone || ''"
                @click="addSuggestionResult(p)"
              >
                <template #append>
                  <v-btn size="x-small" variant="text" icon="mdi-plus" color="primary" />
                </template>
              </v-list-item>
            </v-list>
          </template>
        </template>

        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="close">Cancelar</v-btn>
          <v-btn
            color="primary"
            :disabled="!canSubmit"
            :loading="submitting"
            @click="submit"
          >
            {{ kidsMode ? 'Registrar entrada' : 'Registrar asistencia' }}
          </v-btn>
        </v-card-actions>
      </v-card-text>
    </v-card>
  </v-dialog>
</template>