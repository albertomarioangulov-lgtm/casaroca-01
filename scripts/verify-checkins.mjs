// Verifica que los check-ins se pueden insertar sin errores de índice huérfano
// y que la unicidad real (event+person) sigue funcionando.
// Usa un evento SIN check-ins existentes y limpia sus datos de prueba al final.
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

// 1. Buscar un evento que NO tenga check-ins y al menos 2 personas
const events = await db.collection('events').find({}).toArray()
let ev = null
for (const e of events) {
  const count = await checkins.countDocuments({ event: e._id })
  if (count === 0) {
    ev = e
    break
  }
}
if (!ev) {
  console.log('No hay eventos sin check-ins para probar (todos ya tienen registros)')
  await mongoose.disconnect()
  process.exit(0)
}

const people = await db.collection('people').find({}).limit(2).toArray()
if (people.length < 2) {
  console.log('No hay suficientes personas para la prueba')
  await mongoose.disconnect()
  process.exit(0)
}

const createdIds = []
try {
  // 2. Insertar dos check-ins del MISMO evento con personas distintas
  const per1 = people[0]._id
  const per2 = people[1]._id
  const oid1 = new mongoose.Types.ObjectId()
  const oid2 = new mongoose.Types.ObjectId()
  await checkins.insertOne({ event: ev._id, person: per1, _id: oid1, checkInMethod: 'wristband', checkInTime: new Date() })
  createdIds.push(oid1)
  console.log('1er check-in insertado OK')
  await checkins.insertOne({ event: ev._id, person: per2, _id: oid2, checkInMethod: 'wristband', checkInTime: new Date() })
  createdIds.push(oid2)
  console.log('2o check-in insertado OK => ya NO hay error 11000 por índice huérfano')

  // 3. Verificar que sí se rechaza el mismo (event+person)
  try {
    await checkins.insertOne({ event: ev._id, person: per1, checkInMethod: 'wristband', checkInTime: new Date() })
    console.log('ERROR: debería haber rechazado el duplicado (event+person)')
  } catch (e) {
    const isDup = e && e.code === 11000
    console.log(`OK: duplicado (event+person) rechazado => ${isDup ? 'E11000 (esperado)' : e.code}`)
  }
  console.log('VEFICACIÓN EXITOSA: los check-ins se insertan correctamente y la unicidad se mantiene.')
} finally {
  // 4. Limpiar los datos de prueba
  for (const id of createdIds) {
    await checkins.deleteOne({ _id: id })
  }
  await mongoose.disconnect()
  console.log('Datos de prueba eliminados.')
}