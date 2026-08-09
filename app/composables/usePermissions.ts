// ============================================================
// Composable de Permisos (Client-side)
// ============================================================
import {
  hasPermission as sharedHasPermission,
  getPermissionsForRoles,
  PERMISSIONS,
  ROLE_DEFINITIONS,
  AVAILABLE_ROLES,
  type Permission,
} from '~~/shared/permissions'

export const usePermissions = () => {
  const { user } = useUserSession()

  const roles = computed(() => user.value?.roles ?? [])

  /**
   * Verifica si el usuario tiene un permiso específico.
   */
  const can = (permission: Permission): boolean => {
    return sharedHasPermission(roles.value, permission)
  }

  /**
   * Verifica si el usuario tiene TODOS los permisos especificados.
   */
  const canAll = (...permissions: Permission[]): boolean => {
    return permissions.every((p) => can(p))
  }

  /**
   * Verifica si el usuario tiene AL MENOS UNO de los permisos especificados.
   */
  const canAny = (...permissions: Permission[]): boolean => {
    return permissions.some((p) => can(p))
  }

  /**
   * Lista completa de permisos del usuario (derivados de sus roles).
   */
  const userPermissions = computed<Permission[]>(() => {
    return getPermissionsForRoles(roles.value)
  })

  /**
   * Verifica si el usuario tiene un rol específico.
   */
  const hasRole = (role: string): boolean => {
    return roles.value.includes(role)
  }

  return {
    /** Roles del usuario */
    roles,
    /** Verifica un permiso específico */
    can,
    /** Verifica que tenga TODOS los permisos */
    canAll,
    /** Verifica que tenga AL MENOS UNO de los permisos */
    canAny,
    /** Lista completa de permisos derivados */
    userPermissions,
    /** Verifica si tiene un rol */
    hasRole,
    /** Es admin? (conveniencia) */
    isAdmin: computed(() => hasRole('admin')),
    /** Referencias a los permisos disponibles */
    PERMISSIONS,
    /** Definiciones de roles */
    ROLE_DEFINITIONS,
    /** Lista de roles disponibles */
    AVAILABLE_ROLES,
  }
}