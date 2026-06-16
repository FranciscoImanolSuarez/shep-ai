/**
 * Workspace context helper.
 *
 * getActiveWorkspaceContext(req) — resolves the calling user's active workspace
 * from the session. Falls back to their first workspace if active is null.
 *
 * TODO (future PR): existing API routes should call this and scope queries by
 * workspaceId instead of userId, one route at a time.
 */

import { auth } from '@/lib/auth'
import type { WorkspaceWithRole } from '@/core/domain/entities/workspace'
import type { WorkspaceMember } from '@/core/domain/entities/workspace'
import type { Role } from '@/core/domain/entities/workspace'
import { roleAtLeast } from '@/lib/rbac'
import { getContainer } from '@/config/container'
import { WorkspaceForbiddenError } from '@/core/usecases/workspace.usecase'

export interface WorkspaceContext {
  workspace: WorkspaceWithRole
  member: WorkspaceMember
  role: Role
  userId: string
}

/**
 * Returns the active workspace context for the authenticated user, or null if
 * the user has no workspaces or is not authenticated.
 */
export async function getActiveWorkspaceContext(): Promise<WorkspaceContext | null> {
  const session = await auth()
  if (!session?.user?.email) return null

  const userId = session.user.email
  const container = getContainer()

  const { workspaceUseCase, workspaceStore } = container

  try {
    const workspaces = await workspaceUseCase.listWorkspaces(userId)
    if (workspaces.length === 0) return null

    // Try to find the active one
    let activeId: string | null = null

    if ('getActiveWorkspaceId' in workspaceStore && typeof workspaceStore.getActiveWorkspaceId === 'function') {
      activeId = await (workspaceStore as import('@/adapters/db/workspace-store.adapter').WorkspaceStoreAdapter).getActiveWorkspaceId(userId)
    }

    const activeWorkspace = workspaces.find((w) => w.id === activeId) ?? workspaces[0]

    const members = await workspaceUseCase.listMembers(userId, activeWorkspace.id)
    const member = members.find((m) => m.userId === userId)
    if (!member) return null

    return {
      workspace: activeWorkspace,
      member,
      role: activeWorkspace.role,
      userId,
    }
  } catch {
    return null
  }
}

/**
 * Asserts that the role meets the minimum requirement.
 * Throws a 403 WorkspaceForbiddenError if not.
 */
export function requireRole(role: Role, minimum: Role): void {
  if (!roleAtLeast(role, minimum)) {
    throw new WorkspaceForbiddenError()
  }
}
