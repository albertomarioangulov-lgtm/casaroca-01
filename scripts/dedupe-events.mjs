// Limpieza de eventos satelite duplicados antes de crear indice unico
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

const groups = await events.aggregate([
  { $match: { parentEvent: { $exists: true, $ne: null }, ministry: { $exists: true, $ne: null } } },
  { $group: { _id: { parentEvent: '$parentEvent', ministry: '$ministry' }, ids: { $push: '$_id' }, count: { $sum: 1 } } },
  { $match: { count: { $gt: 1 } } },
]).toArray()

if (groups.length === 0) {
  console.log('No hay duplicados. Se crea indice unico.')
} else {
  console.log(`Se encontraron ${groups.length} grupo(s) duplicados`)
}

let totalDeleted = 0

for (const group of groups) {
  const ids = group.ids.map(String)
  const parentLabel = String(group._id.parentEvent)
  const ministryLabel = String(group._id.ministry)

  const counts = {}
  for (const id of ids) {
    counts[id] = await db.collection('eventcheckins').countDocuments({ event: new mongoose.Types.ObjectId(id) })
  }

  ids.sort((a, b) => (counts[b] ?? 0) - (counts[a] ?? 0) || b.localeCompare(a))
  const keepId = ids[0]
  const toDelete = ids.slice(1)

  for (const id of toDelete) {
    const oid = new mongoose.Types.ObjectId(id)
    const delCheckIns = await db.collection('eventcheckins').deleteMany({ event: oid })
    await db.collection('eventenrollments').deleteMany({ event: oid })
    await db.collection('eventassignments').deleteMany({ event: oid })
    await db.collection('events').deleteOne({ _id: oid })
    totalDeleted++
    console.log(`Eliminado ${id} (padre=${parentLabel}, ministry=${ministryLabel}), checkins borrados=${delCheckIns.deletedCount}`)
  }
  console.log(`Conservado ${keepId} con ${counts[keepId] ?? 0} check-ins`)
}

console.log(`Total eliminados: ${totalDeleted}`)

await events.createIndex(
  { parentEvent: 1, ministry: 1 },
  {
    unique: true,
    partialFilterExpression: {
      parentEvent: { $type: 'objectId' },
      ministry: { $type: 'objectId' },
    },
  }
)
console.log('Indice unico (parentEvent, ministry) creado')

await mongoose.disconnect()
console.log('Fin.')