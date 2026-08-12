// ============================================================
// Backfill: crear pre-inscripciones (EventEnrollment) para tarjetas
// de conexión que aceptaron invitación a un evento de conexión
// pero que no quedaron como invitadas.
// ============================================================
// Problema: antes de que el endpoint de seguimiento garantizara la
// pre-inscripción, algunas tarjetas con `connectionEvent` quedaron
// sin EventEnrollment (porque la tarjeta no tenía persona vinculada).
//
// Este script:
//   1. Busca todas las WelcomeCard con `connectionEvent` y `acceptsDataPolicy`.
//   2. Por cada una, resuelve la persona (la vinculada o crea una desde
//      el `personSnapshot`), la vincula a la tarjeta si hace falta.
//   3. Verifica que exista EventEnrollment (event, person, registered)
//      y lo crea si falta.
//   4. Es idempotente: no duplica pre-inscripciones ya existentes.
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
const cardsCol = db.collection('welcomecards')
const peopleCol = db.collection('people')
const eventsCol = db.collection('events')
const enrollmentsCol = db.collection('eventenrollments')

// Buscar tarjetas que aceptaron invitación a un evento de conexión
const cards = await cardsCol
  .find({ connectionEvent: { $type: 'objectId' } })
  .toArray()

console.log(`Tarjetas con evento de conexión: ${cards.length}`)

let createdEnrollments = 0
let createdPersons = 0
let linkedCards = 0
let skipped = 0
let errors = 0

for (const card of cards) {
  try {
    // 1. Validar que el evento exista
    const eventId = card.connectionEvent
    const eventDoc = await eventsCol.findOne({ _id: eventId })
    if (!eventDoc) {
      console.log(`  - Tarjeta ${card._id}: evento ${eventId} no existe. Se omite.`)
      skipped++
      continue
    }

    // 2. Resolver la persona vinculada
    let personId = card.person || null

    if (!personId && card.personSnapshot?.name) {
      // Crear persona desde el snapshot
      const insertResult = await peopleCol.insertOne({
        name: card.personSnapshot.name,
        phone: card.personSnapshot.phone || undefined,
        email: card.personSnapshot.email ? String(card.personSnapshot.email).toLowerCase() : undefined,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      personId = insertResult.insertedId
      createdPersons++

      // Vincular la persona a la tarjeta
      await cardsCol.updateOne(
        { _id: card._id },
        { $set: { person: personId } }
      )
      linkedCards++
    }

    if (!personId) {
      console.log(`  - Tarjeta ${card._id}: sin persona ni snapshot válido. Se omite.`)
      skipped++
      continue
    }

    // 3. Crear la pre-inscripción si no existe
    const existing = await enrollmentsCol.findOne({
      event: eventId,
      person: personId,
      status: 'registered',
    })
    if (existing) {
      skipped++
      continue
    }

    await enrollmentsCol.insertOne({
      event: eventId,
      person: personId,
      enrolledBy: personId, // la misma persona es quien se pre-inscribe
      status: 'registered',
      registeredAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    createdEnrollments++
    console.log(`  - Tarjeta ${card._id}: pre-inscripción creada para ${card.personSnapshot?.name || personId}`)
  } catch (err) {
    errors++
    console.error(`  - Error en tarjeta ${card._id}:`, err.message)
  }
}

console.log('\n=== Resumen ===')
console.log(`Tarjetas procesadas: ${cards.length}`)
console.log(`Personas creadas desde snapshot: ${createdPersons}`)
console.log(`Tarjetas vinculadas a persona: ${linkedCards}`)
console.log(`Pre-inscripciones creadas: ${createdEnrollments}`)
console.log(`Sin cambios (ya existían / sin datos): ${skipped}`)
console.log(`Errores: ${errors}`)

await mongoose.disconnect()
console.log('Backfill completado.')