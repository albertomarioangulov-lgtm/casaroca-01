// ============================================================
// Migración: fechas de calendario guardadas a medianoche UTC → mediodía UTC
// ============================================================
// Corrige el desfase de 1 día por zona horaria en registros existentes.
// Antes: new Date("1982-07-08") → 1982-07-08T00:00:00.000Z → en Colombia (UTC-5)
//        se mostraba como 7 de julio.
// Después: 1982-07-08T12:00:00.000Z → se muestra siempre como 8 de julio.
//
// Regla: para cada campo de fecha de calendario, si su hora UTC NO es 12:00,
// se reconstruye como mediodía UTC del mismo día calendario (según UTC).
// Es idempotente: los valores que ya estén a mediodía no se tocan.
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

// Convierte un Date a mediodía UTC del mismo día calendario UTC.
const toNoonUTC = (d) => {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 12, 0, 0, 0))
}

// Campos de fecha de calendario por colección (todos son date-only, sin hora real).
const COLLECTIONS = [
  { name: 'people', fields: ['birthDate', 'membershipDate', 'baptismDate'] },
  { name: 'children', fields: ['birthDate'] },
  { name: 'events', fields: ['date'] },
  { name: 'marriages', fields: ['marriageDate'] },
  { name: 'courses', fields: ['startDate', 'endDate'] },
  { name: 'coursesessions', fields: ['date'] },
  { name: 'welcomecards', fields: ['registrationDate'] },
]

let totalUpdated = 0

for (const { name, fields } of COLLECTIONS) {
  const col = db.collection(name)
  const count = await col.countDocuments()
  let updated = 0
  const cursor = col.find({})

  while (await cursor.hasNext()) {
    const doc = await cursor.next()
    const set = {}
    for (const f of fields) {
      const v = doc[f]
      const d = v instanceof Date ? v : v && typeof v === 'object' && typeof v.getTime === 'function' ? new Date(v) : null
      if (!d || isNaN(d.getTime())) continue
      if (d.getUTCHours() === 12) continue // ya está en mediodía UTC (correcto)
      set[f] = toNoonUTC(d)
    }
    if (Object.keys(set).length) {
      await col.updateOne({ _id: doc._id }, { $set: set })
      updated++
    }
  }

  totalUpdated += updated
  console.log(`${name}: ${updated}/${count} documentos actualizados`)
}

await mongoose.disconnect()
console.log(`\nMigración completada. Total de documentos actualizados: ${totalUpdated}`)