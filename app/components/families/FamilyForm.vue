<script setup lang="ts">
import { computed, ref } from 'vue'
import { formatDateInput } from '~/utils/dates'

const emit = defineEmits<{
  (e: 'saved'): void
}>()

const isOpen = ref(false)
const submitting = ref(false)
const submitError = ref('')

interface CaregiverEntry {
  key: string
  caregiverId?: string
  name: string
  phone: string
}

interface ChildEntry {
  key: string
  childId?: string
  name: string
  birthDate?: string
}

interface RelationEntry {
  caregiverKey: string
  childKey: string
  relationship: string
}

const caregivers = ref<CaregiverEntry[]>([])
const children = ref<ChildEntry[]>([])
const relations = ref<RelationEntry[]>([])

const relationshipOptions = [
  'Padre', 'Madre', 'Tío', 'Tía', 'Abuelo', 'Abuela',
  'Hermano', 'Hermana', 'Primo', 'Prima', 'Tutor', 'Otro',
]

const open = () => {
  reset()
  isOpen.value = true
}

const close = () => {
  isOpen.value = false
}

const reset = () => {
  caregivers.value = []
  children.value = []
  relations.value = []
  submitError.value = ''
  // Comenzar con una fila vacía de cada uno
  addCaregiver()
  addChild()
}

// ===== Acudientes =====
const addCaregiver = () => {
  caregivers.value.push({
    key: `cg-${Date.now()}-${caregivers.value.length}`,
    name: '',
    phone: '',
  })
}

const removeCaregiver = (key: string) => {
  caregivers.value = caregivers.value.filter((c) => c.key !== key)
  relations.value = relations.value.filter((r) => r.caregiverKey !== key)
}

// ===== Niños =====
const addChild = () => {
  children.value.push({
    key: `ch-${Date.now()}-${children.value.length}`,
    name: '',
  })
}

const removeChild = (key: string) => {
  children.value = children.value.filter((c) => c.key !== key)
  relations.value = relations.value.filter((r) => r.childKey !== key)
}

// ===== Relaciones =====
const isRelationChecked = (caregiverKey: string, childKey: string): boolean => {
  return relations.value.some(
    (r) => r.caregiverKey === caregiverKey && r.childKey === childKey
  )
}

const getRelation = (caregiverKey: string, childKey: string): string => {
  const found = relations.value.find(
    (r) => r.caregiverKey === caregiverKey && r.childKey === childKey
  )
  return found?.relationship ?? ''
}

const toggleRelation = (caregiverKey: string, childKey: string, checked: boolean) => {
  if (checked) {
    if (!isRelationChecked(caregiverKey, childKey)) {
      relations.value.push({ caregiverKey, childKey, relationship: '' })
    }
  } else {
    relations.value = relations.value.filter(
      (r) => !(r.caregiverKey === caregiverKey && r.childKey === childKey)
    )
  }
}

const setRelation = (caregiverKey: string, childKey: string, relationship: string) => {
  const found = relations.value.find(
    (r) => r.caregiverKey === caregiverKey && r.childKey === childKey
  )
  if (found) {
    found.relationship = relationship
  }
}

// ===== Validación =====
const canSubmit = computed(() => {
  const validCaregivers = caregivers.value.some((c) => c.name.trim())
  const validChildren = children.value.some((c) => c.name.trim())
  const validRelations = relations.value.some(
    (r) => r.relationship.trim()
  )
  return validCaregivers && validChildren && validRelations && !submitting.value
})

// ===== Envío =====
const submit = async () => {
  submitError.value = ''

  // Filtrar solo entradas con nombre
  const caregiverInputs = caregivers.value
    .filter((c) => c.name.trim())
    .map((c, idx) => ({
      caregiverId: c.caregiverId || undefined,
      name: c.caregiverId ? undefined : c.name.trim(),
      phone: c.caregiverId ? undefined : (c.phone.trim() || undefined),
      _key: c.key,
      _idx: idx,
    }))

  const childInputs = children.value
    .filter((c) => c.name.trim())
    .map((c, idx) => ({
      childId: c.childId || undefined,
      name: c.childId ? undefined : c.name.trim(),
      birthDate: c.childId ? undefined : (formatDateInput(c.birthDate) || undefined),
      _key: c.key,
      _idx: idx,
    }))

  // Construir mapa de claves temporales -> identificadores de entrada
  const caregiverKeyMap = new Map<string, string>()
  caregiverInputs.forEach((cg) => {
    caregiverKeyMap.set(cg._key, cg.caregiverId || `__new_${cg._idx + 1}`)
  })

  const childKeyMap = new Map<string, string>()
  childInputs.forEach((ch) => {
    childKeyMap.set(ch._key, ch.childId || `__new_${ch._idx + 1}`)
  })

  // Construir relaciones
  const relationInputs = relations.value
    .filter((r) => r.relationship.trim())
    .map((r) => {
      const caregiverId = caregiverKeyMap.get(r.caregiverKey)
      const childId = childKeyMap.get(r.childKey)
      return {
        caregiverId: caregiverId || '',
        childId: childId || '',
        relationship: r.relationship.trim(),
      }
    })
    .filter((r) => r.caregiverId && r.childId)

  if (!relationInputs.length) {
    submitError.value = 'Debe definir al menos una relación'
    return
  }

  submitting.value = true
  try {
    await $fetch('/api/families', {
      method: 'POST',
      body: {
        caregivers: caregiverInputs.map(({ _key, _idx, ...rest }) => rest),
        children: childInputs.map(({ _key, _idx, ...rest }) => rest),
        relations: relationInputs,
      },
    })
    close()
    emit('saved')
  } catch (err: any) {
    submitError.value = err?.data?.statusMessage || err?.message || 'Error al registrar la familia'
  } finally {
    submitting.value = false
  }
}

defineExpose({ open })
</script>

<template>
  <v-dialog :model-value="isOpen" max-width="900" @update:model-value="close">
    <v-card>
      <v-progress-linear :indeterminate="submitting" :model-value="submitting ? undefined : 100" />
      <v-card-title>Registrar familia</v-card-title>
      <v-card-text>
        <v-alert v-if="submitError" type="error" class="mb-4">
          {{ submitError }}
        </v-alert>

        <!-- ===== 1. Acudientes ===== -->
        <h3 class="text-subtitle-1 font-weight-bold mb-2">1. Acudientes</h3>
        <div
          v-for="(cg, idx) in caregivers"
          :key="cg.key"
          class="mb-2"
        >
          <v-row dense align="center">
            <v-col cols="1" class="text-caption text-medium-emphasis">{{ idx + 1 }}</v-col>
            <v-col cols="5">
              <v-text-field v-model="cg.name" label="Nombre *" density="compact" />
            </v-col>
            <v-col cols="4">
              <v-text-field v-model="cg.phone" label="Teléfono" density="compact" />
            </v-col>
            <v-col cols="2">
              <v-btn
                size="small"
                variant="text"
                icon="mdi-delete"
                color="red"
                @click="removeCaregiver(cg.key)"
              />
            </v-col>
          </v-row>
        </div>
        <v-btn
          variant="text"
          color="primary"
          size="small"
          prepend-icon="mdi-plus"
          @click="addCaregiver"
        >
          Agregar acudiente
        </v-btn>

        <!-- ===== 2. Niños ===== -->
        <h3 class="text-subtitle-1 font-weight-bold mb-2 mt-4">2. Niños</h3>
        <div
          v-for="(child, idx) in children"
          :key="child.key"
          class="mb-2"
        >
          <v-row dense align="center">
            <v-col cols="1" class="text-caption text-medium-emphasis">{{ idx + 1 }}</v-col>
            <v-col cols="5">
              <v-text-field v-model="child.name" label="Nombre *" density="compact" />
            </v-col>
            <v-col cols="4">
              <v-date-input v-model="child.birthDate" label="Fecha nacimiento" density="compact" />
            </v-col>
            <v-col cols="2">
              <v-btn
                size="small"
                variant="text"
                icon="mdi-delete"
                color="red"
                @click="removeChild(child.key)"
              />
            </v-col>
          </v-row>
        </div>
        <v-btn
          variant="text"
          color="primary"
          size="small"
          prepend-icon="mdi-plus"
          @click="addChild"
        >
          Agregar niño
        </v-btn>

        <!-- ===== 3. Matriz de relaciones ===== -->
        <h3 class="text-subtitle-1 font-weight-bold mb-2 mt-4">3. Relaciones</h3>
        <p class="text-caption text-medium-emphasis mb-2">
          Marca qué acudiente se relaciona con cada niño y define la relación.
        </p>

        <v-table density="compact">
          <thead>
            <tr>
              <th class="text-caption">Acudiente</th>
              <th
                v-for="child in children"
                :key="child.key"
                class="text-caption text-center"
              >
                {{ child.name || `Niño ${children.indexOf(child) + 1}` }}
              </th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="cg in caregivers" :key="cg.key">
              <td class="text-caption">
                {{ cg.name || 'Acudiente' }}
              </td>
              <td
                v-for="child in children"
                :key="child.key"
                class="text-center"
              >
                <v-checkbox
                  :model-value="isRelationChecked(cg.key, child.key)"
                  density="compact"
                  hide-details
                  @update:model-value="toggleRelation(cg.key, child.key, !!$event)"
                />
                <v-select
                  v-if="isRelationChecked(cg.key, child.key)"
                  :model-value="getRelation(cg.key, child.key)"
                  :items="relationshipOptions"
                  density="compact"
                  variant="outlined"
                  hide-details
                  class="mt-1"
                  @update:model-value="setRelation(cg.key, child.key, $event)"
                />
              </td>
            </tr>
          </tbody>
        </v-table>

        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="close">Cancelar</v-btn>
          <v-btn
            color="primary"
            :disabled="!canSubmit"
            :loading="submitting"
            @click="submit"
          >
            Registrar familia
          </v-btn>
        </v-card-actions>
      </v-card-text>
    </v-card>
  </v-dialog>
</template>