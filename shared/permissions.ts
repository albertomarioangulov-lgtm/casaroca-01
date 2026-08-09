// ============================================================
// Definiciones de Permisos y Roles
// ============================================================

/**
 * Lista de todos los permisos disponibles en el sistema.
 * Formato: `recurso:accion`
 */
export const PERMISSIONS = {
  USERS_READ: 'users:read',
  USERS_CREATE: 'users:create',
  USERS_UPDATE: 'users:update',
  USERS_DELETE: 'users:delete',
  CHILDREN_READ: 'children:read',
  CHILDREN_CREATE: 'children:create',
  CHILDREN_UPDATE: 'children:update',
  CHILDREN_DELETE: 'children:delete',
  CAREGIVERS_READ: 'caregivers:read',
  CAREGIVERS_CREATE: 'caregivers:create',
  CAREGIVERS_UPDATE: 'caregivers:update',
  CAREGIVERS_DELETE: 'caregivers:delete',
  EVENTS_READ: 'events:read',
  EVENTS_CREATE: 'events:create',
  EVENTS_UPDATE: 'events:update',
  EVENTS_DELETE: 'events:delete',
  CHECKINS_READ: 'checkins:read',
  CHECKINS_CREATE: 'checkins:create',
  CHECKINS_UPDATE: 'checkins:update',
  CHECKINS_DELETE: 'checkins:delete',
  // Personas
  PERSONS_READ: 'persons:read',
  PERSONS_CREATE: 'persons:create',
  PERSONS_UPDATE: 'persons:update',
  PERSONS_DELETE: 'persons:delete',
  // Familias
  FAMILIES_READ: 'families:read',
  FAMILIES_CREATE: 'families:create',
  FAMILIES_UPDATE: 'families:update',
  FAMILIES_DELETE: 'families:delete',
  // Matrimonios
  MARRIAGES_READ: 'marriages:read',
  MARRIAGES_CREATE: 'marriages:create',
  MARRIAGES_UPDATE: 'marriages:update',
  MARRIAGES_DELETE: 'marriages:delete',
  // Ministerios
  MINISTRIES_READ: 'ministries:read',
  MINISTRIES_CREATE: 'ministries:create',
  MINISTRIES_UPDATE: 'ministries:update',
  MINISTRIES_DELETE: 'ministries:delete',
  // Membresías a ministerios
  MEMBERSHIPS_READ: 'memberships:read',
  MEMBERSHIPS_CREATE: 'memberships:create',
  MEMBERSHIPS_UPDATE: 'memberships:update',
  MEMBERSHIPS_DELETE: 'memberships:delete',
  // Funciones de ministerio
  MINISTRY_ROLES_READ: 'ministry-roles:read',
  MINISTRY_ROLES_CREATE: 'ministry-roles:create',
  MINISTRY_ROLES_UPDATE: 'ministry-roles:update',
  MINISTRY_ROLES_DELETE: 'ministry-roles:delete',
  // Invitaciones
  INVITATIONS_READ: 'invitations:read',
  INVITATIONS_CREATE: 'invitations:create',
  INVITATIONS_UPDATE: 'invitations:update',
  INVITATIONS_DELETE: 'invitations:delete',
  // Asignaciones de eventos
  ASSIGNMENTS_READ: 'assignments:read',
  ASSIGNMENTS_CREATE: 'assignments:create',
  ASSIGNMENTS_UPDATE: 'assignments:update',
  ASSIGNMENTS_DELETE: 'assignments:delete',
  // Pre-inscripciones a eventos
  ENROLLMENTS_READ: 'enrollments:read',
  ENROLLMENTS_CREATE: 'enrollments:create',
  ENROLLMENTS_UPDATE: 'enrollments:update',
  ENROLLMENTS_DELETE: 'enrollments:delete',
  // Cursos de discipulado
  COURSES_READ: 'courses:read',
  COURSES_CREATE: 'courses:create',
  COURSES_UPDATE: 'courses:update',
  COURSES_DELETE: 'courses:delete',
  // Solicitudes de inscripción a cursos
  COURSE_ENROLLMENTS_READ: 'course-enrollments:read',
  COURSE_ENROLLMENTS_CREATE: 'course-enrollments:create',
  COURSE_ENROLLMENTS_UPDATE: 'course-enrollments:update',
  COURSE_ENROLLMENTS_DELETE: 'course-enrollments:delete',
  // Asistencia a cursos
  COURSE_ATTENDANCE_READ: 'course-attendance:read',
  COURSE_ATTENDANCE_CREATE: 'course-attendance:create',
  COURSE_ATTENDANCE_UPDATE: 'course-attendance:update',
  COURSE_ATTENDANCE_DELETE: 'course-attendance:delete',
  // Relaciones familiares
  RELATIONSHIPS_READ: 'relationships:read',
  RELATIONSHIPS_CREATE: 'relationships:create',
  RELATIONSHIPS_UPDATE: 'relationships:update',
  RELATIONSHIPS_DELETE: 'relationships:delete',
  // Tarjetas de Conexión (Bienvenida)
  WELCOME_CARDS_READ: 'welcome-cards:read',
  WELCOME_CARDS_CREATE: 'welcome-cards:create',
  WELCOME_CARDS_UPDATE: 'welcome-cards:update',
  WELCOME_CARDS_DELETE: 'welcome-cards:delete',
} as const

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS]

/**
 * Definición de roles del sistema,
 * cada uno con su lista de permisos asignados.
 */
export type RoleDefinition = {
  label: string
  description: string
  permissions: Permission[]
}

export const ROLE_DEFINITIONS: Record<string, RoleDefinition> = {
  admin: {
    label: 'Administrador',
    description: 'Acceso total a todas las funcionalidades del sistema',
    permissions: Object.values(PERMISSIONS),
  },
  editor: {
    label: 'Editor',
    description: 'Puede ver y editar personas, familias, ministerios, eventos, cursos e invitaciones, pero no eliminar',
    permissions: [
      PERMISSIONS.USERS_READ,
      PERMISSIONS.USERS_CREATE,
      PERMISSIONS.USERS_UPDATE,
      // Legacy (durante migración)
      PERMISSIONS.CHILDREN_READ,
      PERMISSIONS.CHILDREN_CREATE,
      PERMISSIONS.CHILDREN_UPDATE,
      PERMISSIONS.CAREGIVERS_READ,
      PERMISSIONS.CAREGIVERS_CREATE,
      PERMISSIONS.CAREGIVERS_UPDATE,
      PERMISSIONS.EVENTS_READ,
      PERMISSIONS.EVENTS_CREATE,
      PERMISSIONS.EVENTS_UPDATE,
      PERMISSIONS.CHECKINS_READ,
      PERMISSIONS.CHECKINS_CREATE,
      PERMISSIONS.CHECKINS_UPDATE,
      // Personas
      PERMISSIONS.PERSONS_READ,
      PERMISSIONS.PERSONS_CREATE,
      PERMISSIONS.PERSONS_UPDATE,
      // Familias
      PERMISSIONS.FAMILIES_READ,
      PERMISSIONS.FAMILIES_CREATE,
      PERMISSIONS.FAMILIES_UPDATE,
      // Matrimonios
      PERMISSIONS.MARRIAGES_READ,
      PERMISSIONS.MARRIAGES_CREATE,
      PERMISSIONS.MARRIAGES_UPDATE,
      // Ministerios
      PERMISSIONS.MINISTRIES_READ,
      PERMISSIONS.MINISTRIES_CREATE,
      PERMISSIONS.MINISTRIES_UPDATE,
      // Membresías
      PERMISSIONS.MEMBERSHIPS_READ,
      PERMISSIONS.MEMBERSHIPS_CREATE,
      PERMISSIONS.MEMBERSHIPS_UPDATE,
      // Funciones de ministerio
      PERMISSIONS.MINISTRY_ROLES_READ,
      PERMISSIONS.MINISTRY_ROLES_CREATE,
      PERMISSIONS.MINISTRY_ROLES_UPDATE,
      // Invitaciones
      PERMISSIONS.INVITATIONS_READ,
      PERMISSIONS.INVITATIONS_CREATE,
      PERMISSIONS.INVITATIONS_UPDATE,
      // Asignaciones
      PERMISSIONS.ASSIGNMENTS_READ,
      PERMISSIONS.ASSIGNMENTS_CREATE,
      PERMISSIONS.ASSIGNMENTS_UPDATE,
      // Pre-inscripciones
      PERMISSIONS.ENROLLMENTS_READ,
      PERMISSIONS.ENROLLMENTS_CREATE,
      PERMISSIONS.ENROLLMENTS_UPDATE,
      // Cursos
      PERMISSIONS.COURSES_READ,
      PERMISSIONS.COURSES_CREATE,
      PERMISSIONS.COURSES_UPDATE,
      // Solicitudes de curso
      PERMISSIONS.COURSE_ENROLLMENTS_READ,
      PERMISSIONS.COURSE_ENROLLMENTS_CREATE,
      PERMISSIONS.COURSE_ENROLLMENTS_UPDATE,
      // Asistencia a cursos
      PERMISSIONS.COURSE_ATTENDANCE_READ,
      PERMISSIONS.COURSE_ATTENDANCE_CREATE,
      PERMISSIONS.COURSE_ATTENDANCE_UPDATE,
      // Relaciones familiares
      PERMISSIONS.RELATIONSHIPS_READ,
      PERMISSIONS.RELATIONSHIPS_CREATE,
      PERMISSIONS.RELATIONSHIPS_UPDATE,
      PERMISSIONS.RELATIONSHIPS_DELETE,
      // Tarjetas de Conexión
      PERMISSIONS.WELCOME_CARDS_READ,
      PERMISSIONS.WELCOME_CARDS_CREATE,
      PERMISSIONS.WELCOME_CARDS_UPDATE,
    ],
  },
  viewer: {
    label: 'Visor',
    description: 'Solo puede ver información, sin modificar nada',
    permissions: [
      PERMISSIONS.USERS_READ,
      // Legacy (durante migración)
      PERMISSIONS.CHILDREN_READ,
      PERMISSIONS.CAREGIVERS_READ,
      PERMISSIONS.PERSONS_READ,
      PERMISSIONS.FAMILIES_READ,
      PERMISSIONS.MARRIAGES_READ,
      PERMISSIONS.MINISTRIES_READ,
      PERMISSIONS.MEMBERSHIPS_READ,
      PERMISSIONS.MINISTRY_ROLES_READ,
      PERMISSIONS.INVITATIONS_READ,
      PERMISSIONS.ASSIGNMENTS_READ,
      PERMISSIONS.ENROLLMENTS_READ,
      PERMISSIONS.EVENTS_READ,
      PERMISSIONS.CHECKINS_READ,
      PERMISSIONS.COURSES_READ,
      PERMISSIONS.COURSE_ENROLLMENTS_READ,
      PERMISSIONS.COURSE_ATTENDANCE_READ,
      PERMISSIONS.RELATIONSHIPS_READ,
      // Tarjetas de Conexión
      PERMISSIONS.WELCOME_CARDS_READ,
    ],
  },
  member: {
    label: 'Miembro',
    description: 'Acceso a su portal personal: perfil, invitaciones, historial, cursos y pre-inscripción de familia',
    permissions: [],
  },
}

/**
 * Obtiene todos los permisos asociados a un conjunto de roles.
 */
export function getPermissionsForRoles(roles: string[]): Permission[] {
  const permissions = new Set<Permission>()

  for (const role of roles) {
    const definition = ROLE_DEFINITIONS[role]
    if (definition) {
      for (const perm of definition.permissions) {
        permissions.add(perm)
      }
    }
  }

  return Array.from(permissions)
}

/**
 * Verifica si un conjunto de roles tiene un permiso específico.
 */
export function hasPermission(roles: string[], permission: Permission): boolean {
  const perms = getPermissionsForRoles(roles)
  return perms.includes(permission)
}

/**
 * Lista de roles disponibles (las claves del objeto ROLE_DEFINITIONS).
 */
export const AVAILABLE_ROLES = Object.keys(ROLE_DEFINITIONS)

/**
 * Roles que tienen visibilidad de valores monetarios (precios, totales).
 * Los roles no incluidos aquí NO verán precios en la UI.
 */
export const MONETARY_VISIBILITY_ROLES = ['admin', 'editor']