// Migra al modelo acordado:
// 1. Puebla `ageGroupsSnapshot` en los eventos que tengan ministerio/check-ins y no lo tengan.
// 2. Normaliza los check-ins: usa `ageGroupIndex` contra el snapshot del evento
//    (los campos edadGroupName/MinAge/MaxAge del check-in se conservan como denormalización).
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
const events = db.collection('events')
const checkins = db.collection('eventcheckins')
const ministries = db.collection('ministries')

// 1. Poblar ageGroupsSnapshot en eventos sin snapshot
const evs = await events.find({}).toArray()
let snapshotUpdated = 0
for (const ev of evs) {
  if (ev.ageGroupsSnapshot?.length) continue
  // Fuente 1: ministerio del evento
  let groups = null
  if (ev.ministry) {
    const m = await ministries.findOne({ _id: ev.ministry })
    if (m?.ageGroups?.length) groups = m.ageGroups
  }
  // Fuente 2: check-ins con snapshot propio (nombre/rango) de ese evento
  if (!groups) {
    const ci = await checkins.findOne({ event: ev._id, ageGroupName: { $exists: true, $ne: null } })
    if (ci?.ageGroupName && ci.ageGroupName !== 'Sin grupo') {
      groups = [{
        name: ci.ageGroupName,
        minAge: ci.ageGroupMinAge ?? null,
        maxAge: ci.ageGroupMaxAge ?? null,
      }]
    }
  }
  if (groups) {
    await events.updateOne({ _id: ev._id }, { $set: { ageGroupsSnapshot: groups } })
    snapshotUpdated++
  }
}
console.log(`Eventos con snapshot poblado: ${snapshotUpdated}`)

// 2. Normalizar check-ins: fijar ageGroupIndex según el snapshot del evento
const allCheckins = await checkins.find({}).toArray()
let fixed = 0
for (const ci of allCheckins) {
  const ev = await events.findOne({ _id: ci.event })
  const snap = ev?.ageGroupsSnapshot
  if (!snap?.length) continue
  if (ci.ageGroupIndex !== undefined && ci.ageGroupIndex >= 0 && snap[ci.ageGroupIndex]) {
    continue // ya indexado correctamente
  }
  // Recalcular índice por nombre o por edad/rango
  let idx = -1
  if (ci.ageGroupName) {
    idx = snap.findIndex((g) => g.name === ci.ageGroupName)
  }
  if (idx === -1 && ci.ageGroupMinAge !== null && ci.ageGroupMaxAge !== null) {
    idx = snap.findIndex((g) => g.minAge === ci.ageGroupMinAge && g.maxAge === ci.ageGroupMaxAge)
  }
  if (idx !== -1) {
    await checkins.updateOne({ _id: ci._id }, { $set: { ageGroupIndex: idx } })
    fixed++
  }
}
console.log(`Check-ins indexados contra snapshot: ${fixed}`)

await mongoose.disconnect()
console.log('Fin.')