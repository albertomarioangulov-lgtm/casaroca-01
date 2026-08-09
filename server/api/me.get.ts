import { User } from '~~/server/models/User'
import { Person } from '~~/server/models/Person'
import { Family } from '~~/server/models/Family'
import { MinistryMembership } from '~~/server/models/MinistryMembership'
import { Invitation } from '~~/server/models/Invitation'
import { EventCheckIn } from '~~/server/models/EventCheckIn'
import { EventEnrollment } from '~~/server/models/EventEnrollment'
import { CourseEnrollment } from '~~/server/models/CourseEnrollment'
import { CourseAttendance } from '~~/server/models/CourseAttendance'

export default defineEventHandler(async (event) => {
  const session = await getUserSession(event)
  const userId = session.user?.id || session.user?.email
  if (!userId) {
    throw createError({ statusCode: 401, statusMessage: 'No autenticado' })
  }

  // Cargar el usuario desde la BD para obtener personId
  const user = await User.findById(userId).lean()
  if (!user) {
    throw createError({ statusCode: 404, statusMessage: 'Usuario no encontrado' })
  }

  const personId = user.personId?.toString?.()
  const person = personId ? await Person.findById(personId).lean() : null

  // Familia compartida
  let familyMembers: Array<{ personId: string; name: string; roleInFamily: string }> = []
  if (personId) {
    const families = await Family.find({ 'members.person': personId }).lean()
    const familyIds = families.map((f) => f._id)
    const allFamilies = await Family.find({ _id: { $in: familyIds } })
      .populate('members.person', 'name')
      .lean()
    const seen = new Set<string>()
    for (const f of allFamilies) {
      for (const m of (f as any).members ?? []) {
        const pid = m.person?._id?.toString?.() ?? m.person?.toString?.() ?? ''
        if (pid && !seen.has(pid)) {
          seen.add(pid)
          familyMembers.push({
            personId: pid,
            name: m.person?.name ?? '',
            roleInFamily: m.roleInFamily ?? '',
          })
        }
      }
    }
  }

  // Invitaciones pendientes del miembro
  const pendingInvitations = personId
    ? await Invitation.find({ person: personId, status: 'pending' })
        .populate('ministry', 'name code color icon')
        .populate('event', 'name date')
        .populate('invitedBy', 'name email')
        .sort({ invitedAt: -1 })
        .lean()
    : []

  // Membresías de ministerios (para saber si es director/líder)
  const memberships = personId
    ? await MinistryMembership.find({ person: personId, status: 'active' })
        .populate('ministry', 'name code color icon')
        .lean()
    : []

  // Historial de asistencia a eventos (check-ins)
  const eventHistory = personId
    ? await EventCheckIn.find({ person: personId })
        .populate('event', 'name date type status')
        .populate('caregiver', 'name')
        .sort({ checkInTime: -1 })
        .limit(50)
        .lean()
    : []

  // Pre-inscripciones a eventos
  const eventEnrollments = personId
    ? await EventEnrollment.find({ person: personId, status: 'registered' })
        .populate('event', 'name date status')
        .sort({ registeredAt: -1 })
        .limit(20)
        .lean()
    : []

  // Solicitudes a cursos
  const courseEnrollments = personId
    ? await CourseEnrollment.find({ person: personId })
        .populate('course', 'name status')
        .sort({ requestDate: -1 })
        .limit(20)
        .lean()
    : []

  // Asistencia a cursos
  const courseAttendance = personId
    ? await CourseAttendance.find({ person: personId })
        .populate('session', 'date topic')
        .sort({ createdAt: -1 })
        .limit(20)
        .lean()
    : []

  return {
    user: {
      id: user._id.toString(),
      email: user.email,
      name: user.name,
      roles: user.roles ?? [],
      personId: personId ?? null,
    },
    person: person
      ? {
          id: person._id.toString(),
          name: person.name,
          birthDate: person.birthDate,
          phone: person.phone,
          email: person.email,
          gender: person.gender,
          maritalStatus: person.maritalStatus,
          membershipDate: person.membershipDate,
          baptismDate: person.baptismDate,
        }
      : null,
    family: familyMembers,
    pendingInvitations: pendingInvitations.map((inv: any) => ({
      id: inv._id.toString(),
      ministryId: inv.ministry?._id?.toString?.() ?? inv.ministry?.toString?.() ?? '',
      ministryName: inv.ministry?.name ?? '',
      ministryColor: inv.ministry?.color ?? '',
      ministryIcon: inv.ministry?.icon ?? '',
      eventId: inv.event?._id?.toString?.() ?? inv.event?.toString?.() ?? '',
      eventName: inv.event?.name ?? '',
      eventDate: inv.event?.date ?? null,
      invitedByName: inv.invitedBy?.name ?? '',
      channel: inv.channel,
      message: inv.message,
      invitedAt: inv.invitedAt,
    })),
    memberships: memberships.map((m: any) => ({
      id: m._id.toString(),
      ministryId: m.ministry?._id?.toString?.() ?? m.ministry?.toString?.() ?? '',
      ministryName: m.ministry?.name ?? '',
      ministryCode: m.ministry?.code ?? '',
      ministryColor: m.ministry?.color ?? '',
      ministryIcon: m.ministry?.icon ?? '',
      roleInMinistry: m.roleInMinistry,
      source: m.source,
      joinedAt: m.joinedAt,
    })),
    eventHistory: eventHistory.map((c: any) => ({
      id: c._id.toString(),
      eventId: c.event?._id?.toString?.() ?? c.event?.toString?.() ?? '',
      eventName: c.event?.name ?? '',
      eventDate: c.event?.date ?? null,
      eventStatus: c.event?.status ?? '',
      checkInMethod: c.checkInMethod,
      checkInTime: c.checkInTime,
      checkOutTime: c.checkOutTime,
      wristbandNumber: c.wristbandNumber ?? null,
      caregiverName: c.caregiver?.name ?? null,
    })),
    eventEnrollments: eventEnrollments.map((e: any) => ({
      id: e._id.toString(),
      eventId: e.event?._id?.toString?.() ?? e.event?.toString?.() ?? '',
      eventName: e.event?.name ?? '',
      eventDate: e.event?.date ?? null,
      eventStatus: e.event?.status ?? '',
      registeredAt: e.registeredAt,
    })),
    courseEnrollments: courseEnrollments.map((e: any) => ({
      id: e._id.toString(),
      courseId: e.course?._id?.toString?.() ?? e.course?.toString?.() ?? '',
      courseName: e.course?.name ?? '',
      courseStatus: e.course?.status ?? '',
      status: e.status,
      requestDate: e.requestDate,
    })),
    courseAttendance: courseAttendance.map((a: any) => ({
      id: a._id.toString(),
      sessionId: a.session?._id?.toString?.() ?? a.session?.toString?.() ?? '',
      sessionDate: a.session?.date ?? null,
      sessionTopic: a.session?.topic ?? '',
      present: a.present,
    })),
  }
})