// Elimina el indice huerfano eventId_1_childId_1 de eventcheckins
// y verifica que exista el indice correcto { event: 1, person: 1 }
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
const col = db.collection('eventcheckins')

const indexes = await col.indexes()
console.log('Indices actuales de eventcheckins:')
for (const idx of indexes) {
  console.log(' -', idx.name, JSON.stringify(idx.key), idx.unique ? '(UNIQUE)' : '')
}

// 1. Eliminar el indice huerfano si existe
const orphan = indexes.find((i) => i.name === 'eventId_1_childId_1')
if (orphan) {
  await col.dropIndex('eventId_1_childId_1')
  console.log('\nEliminado indice huerfano: eventId_1_childId_1')
} else {
  console.log('\nNo se encontro el indice huerfano eventId_1_childId_1')
}

// 2. Crear el indice correcto del modelo actual (event + person) si no existe
const correct = indexes.find((i) => i.unique && i.key && i.key.event === 1 && i.key.person === 1)
if (correct) {
  console.log('El indice correcto { event: 1, person: 1 } ya existe')
} else {
  await col.createIndex(
    { event: 1, person: 1 },
    {
      unique: true,
      partialFilterExpression: {
        event: { $type: 'objectId' },
        person: { $type: 'objectId' },
      },
    }
  )
  console.log('Creado indice correcto { event: 1, person: 1 } (unicos, parcial)')
}

// 3. Verificar resultado final
const finalIndexes = await col.indexes()
console.log('\nIndices finales:')
for (const idx of finalIndexes) {
  console.log(' -', idx.name, JSON.stringify(idx.key), idx.unique ? '(UNIQUE)' : '')
}

await mongoose.disconnect()
console.log('Fin.')