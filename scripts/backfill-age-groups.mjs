// Congela el salón/rango de edad en los check-ins existentes que no tienen snapshot.
// Usa los rangos actuales del ministerio del evento para asignar el salón según la edad del niño.
import mongoose from 'mongoose'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const envPath = path.join(rootDir, '.env')
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf-8').split('\n')) {
    const m = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/)
    if (m) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '')
  }
}

const { MONGODB_URI, MONGODB_NAME } = process.env
if (!MONGODB_URI || !MONGODB_NAME) {
  console.error('Faltan MONGODB_URI / MONGODB_NAME en .env')
  process.exit(1)
}

await mongoose.connect(`${MONGODB_URI}/${MONGODB_NAME}?retryWrites=true&w=majority`, { serverSelectionTimeoutMS: 15000 })
console.log('Conectado a', MONGODB_NAME)

const db = mongoose.connection.db
const checkins = db.collection('eventcheckins')
const events = db.collection('events')
const ministries = db.collection('ministries')
const people = db.collection('people')

function calcAge(birthDate) {
  if (!birthDate) return null
  const today = new Date()
  const bd = new Date(birthDate)
  let age = today.getFullYear() - bd.getFullYear()
  const m = today.getMonth() - bd.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < bd.getDate())) age--
  return age
}

// Cargar todos los check-ins sin snapshot
const pending = await checkins.find({ ageGroupName: { $exists: false } }).toArray()
console.log(`Check-ins sin snapshot: ${pending.length}`)

let updated = 0
let skipped = 0

for (const ci of pending) {
  // Evento y su ministerio
  const ev = await events.findOne({ _id: ci.event })
  if (!ev || !ev.ministry) {
    skipped++
    continue
  }
  const ministry = await ministries.findOne({ _id: ev.ministry })
  const ageGroups = ministry?.ageGroups ?? []
  if (!ageGroups.length) {
    skipped++
    continue
  }

  // Persona (niño) y su edad
  const person = await people.findOne({ _id: ci.person })
  const age = person?.birthDate ? calcAge(person.birthDate) : null

  let ageGroupName = 'Sin grupo'
  let ageGroupIndex = -1
  let ageGroupMinAge = null
  let ageGroupMaxAge = null
  if (age !== null) {
    const idx = ageGroups.findIndex((g) => age >= (g.minAge ?? 0) && age <= (g.maxAge ?? 999))
    if (idx !== -1) {
      ageGroupName = ageGroups[idx].name || 'Grupo'
      ageGroupIndex = idx
      ageGroupMinAge = ageGroups[idx].minAge ?? null
      ageGroupMaxAge = ageGroups[idx].maxAge ?? null
    }
  }

  await checkins.updateOne({ _id: ci._id }, {
    $set: {
      ageGroupName,
      ageGroupIndex,
      ageGroupMinAge,
      ageGroupMaxAge,
    },
  })
  updated++
}

console.log(`Actualizados: ${updated}, omitidos: ${skipped}`)
await mongoose.disconnect()
console.log('Fin.')