// ============================================================
// Utilidades de Permisos (Server-side)
// ============================================================
import { hasPermission, type Permission } from '~~/shared/permissions'
import type { H3Event } from 'h3'

/**
 * Obtiene los roles del usuario desde la sesión actual.
 */
async function getUserRoles(event: H3Event): Promise<string[]> {
  const session = await getUserSession(event)
  return session.user?.roles ?? []
}

/**
 * Verifica si el usuario autenticado tiene un permiso específico.
 * Lanza error 403 si no tiene el permiso.
 */
export async function requirePermission(event: H3Event, permission: Permission): Promise<void> {
  const roles = await getUserRoles(event)
  
  if (!hasPermission(roles, permission)) {
    throw createError({
      statusCode: 403,
      statusMessage: `No tienes permiso para realizar esta acción. Permiso requerido: ${permission}`,
    })
  }
}

/**
 * Verifica si el usuario autenticado tiene un permiso específico.
 * Retorna `true` o `false` sin lanzar error.
 */
export async function checkPermission(event: H3Event, permission: Permission): Promise<boolean> {
  const roles = await getUserRoles(event)
  return hasPermission(roles, permission)
}

/**
 * Middleware helper: protege un endpoint requiriendo un permiso.
 * Uso: `defineEventHandler(requirePermissionMiddleware(PERMISSIONS.USERS_READ))`
 */
export function requirePermissionMiddleware(permission: Permission) {
  return async (event: H3Event) => {
    await requirePermission(event, permission)
  }
}