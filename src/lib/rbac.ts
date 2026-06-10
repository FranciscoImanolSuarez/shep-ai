import type { Role } from '@/core/domain/entities/workspace'

const ROLE_RANK: Record<Role, number> = {
  owner: 4,
  admin: 3,
  member: 2,
  viewer: 1,
}

/** True when `role` has at least the level of `minimum`. */
export function roleAtLeast(role: Role, minimum: Role): boolean {
  return ROLE_RANK[role] >= ROLE_RANK[minimum]
}

/** Can create/update/delete workspace resources. */
export function canWrite(role: Role): boolean {
  return roleAtLeast(role, 'member')
}

/** Can invite/remove members and change roles. */
export function canManageMembers(role: Role): boolean {
  return roleAtLeast(role, 'admin')
}

/** Can delete the workspace. Owner only. */
export function canDeleteWorkspace(role: Role): boolean {
  return role === 'owner'
}

/** Can transfer ownership. Owner only. */
export function canTransferOwnership(role: Role): boolean {
  return role === 'owner'
}

/** Can update workspace name/plan/settings. */
export function canEditWorkspace(role: Role): boolean {
  return roleAtLeast(role, 'admin')
}
