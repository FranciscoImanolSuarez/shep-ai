import { canDeleteWorkspace, canEditWorkspace, canManageMembers, canTransferOwnership } from '@/lib/rbac'
import type { Workspace, WorkspaceMember, WorkspaceInvitation, Role, WorkspaceWithRole } from '@/core/domain/entities/workspace'
import type { WorkspacePort, CreateWorkspaceInput, UpdateWorkspaceInput, InviteMemberInput } from '@/core/ports/in/workspace.port'
import type { WorkspaceStorePort } from '@/core/ports/out/workspace-store.port'

export class WorkspaceForbiddenError extends Error {
  readonly status = 403
  constructor(message = 'Insufficient permissions') {
    super(message)
    this.name = 'WorkspaceForbiddenError'
  }
}

export class WorkspaceNotFoundError extends Error {
  readonly status = 404
  constructor(id: string) {
    super(`Workspace not found: ${id}`)
    this.name = 'WorkspaceNotFoundError'
  }
}

export class WorkspaceConflictError extends Error {
  readonly status = 409
  constructor(message: string) {
    super(message)
    this.name = 'WorkspaceConflictError'
  }
}

export class InvitationExpiredError extends Error {
  readonly status = 410
  constructor() {
    super('Invitation expired')
    this.name = 'InvitationExpiredError'
  }
}

export class WorkspaceUseCase implements WorkspacePort {
  constructor(private readonly store: WorkspaceStorePort) {}

  private async assertMember(userId: string, workspaceId: string): Promise<WorkspaceMember> {
    const member = await this.store.getMember(workspaceId, userId)
    if (!member) throw new WorkspaceForbiddenError()
    return member
  }

  private async assertRole(userId: string, workspaceId: string, check: (role: Role) => boolean): Promise<WorkspaceMember> {
    const member = await this.assertMember(userId, workspaceId)
    if (!check(member.role as Role)) throw new WorkspaceForbiddenError()
    return member
  }

  async createWorkspace(userId: string, input: CreateWorkspaceInput): Promise<Workspace> {
    await this.store.upsertUser(userId)
    const ws = await this.store.insertWorkspace(
      { name: input.name, ownerId: userId, plan: 'free', metadata: {} },
      userId,
    )
    // Auto-set as active if this is their first workspace
    const existing = await this.store.getActiveWorkspaceId(userId)
    if (!existing) {
      await this.store.setActiveWorkspace(userId, ws.id)
    }
    return ws
  }

  async getWorkspace(userId: string, workspaceId: string): Promise<WorkspaceWithRole> {
    const [member, ws] = await Promise.all([
      this.store.getMember(workspaceId, userId),
      this.store.findWorkspaceById(workspaceId),
    ])
    if (!member) throw new WorkspaceForbiddenError()
    if (!ws) throw new WorkspaceNotFoundError(workspaceId)
    return { ...ws, role: member.role as Role }
  }

  async listWorkspaces(userId: string): Promise<WorkspaceWithRole[]> {
    await this.store.upsertUser(userId)
    return this.store.listWorkspacesByUser(userId)
  }

  async updateWorkspace(userId: string, workspaceId: string, input: UpdateWorkspaceInput): Promise<Workspace> {
    await this.assertRole(userId, workspaceId, canEditWorkspace)
    return this.store.updateWorkspace(workspaceId, { ...input, updatedAt: new Date() })
  }

  async deleteWorkspace(userId: string, workspaceId: string): Promise<void> {
    await this.assertRole(userId, workspaceId, canDeleteWorkspace)
    const count = await this.store.countMembers(workspaceId)
    if (count > 1) {
      throw new WorkspaceConflictError('Remove all members before deleting the workspace.')
    }
    await this.store.deleteWorkspace(workspaceId)
  }

  async listMembers(userId: string, workspaceId: string): Promise<WorkspaceMember[]> {
    await this.assertMember(userId, workspaceId)
    return this.store.listMembers(workspaceId)
  }

  async changeRole(userId: string, workspaceId: string, targetUserId: string, role: Role): Promise<WorkspaceMember> {
    const actor = await this.assertRole(userId, workspaceId, canManageMembers)

    // Prevent owner from demoting themselves without transfer
    if (targetUserId === userId && actor.role === 'owner') {
      throw new WorkspaceForbiddenError('Transfer ownership before changing your own role.')
    }

    // Admin cannot promote to owner
    if (role === 'owner' && actor.role !== 'owner') {
      throw new WorkspaceForbiddenError('Only the owner can assign the owner role.')
    }

    return this.store.updateMemberRole(workspaceId, targetUserId, role)
  }

  async removeMember(userId: string, workspaceId: string, targetUserId: string): Promise<void> {
    const actor = await this.assertRole(userId, workspaceId, canManageMembers)

    // Owner cannot remove themselves
    if (targetUserId === userId && actor.role === 'owner') {
      throw new WorkspaceForbiddenError('Transfer ownership before leaving the workspace.')
    }

    await this.store.removeMember(workspaceId, targetUserId)
  }

  async inviteMember(userId: string, workspaceId: string, input: InviteMemberInput): Promise<WorkspaceInvitation> {
    await this.assertRole(userId, workspaceId, canManageMembers)

    const token = crypto.randomUUID()
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days

    return this.store.insertInvitation({
      workspaceId,
      inviterId: userId,
      inviteeEmail: input.email,
      role: input.role,
      token,
      expiresAt,
    })
  }

  async listInvitationsByEmail(email: string): Promise<WorkspaceInvitation[]> {
    return this.store.listPendingInvitationsByEmail(email)
  }

  async acceptInvitation(userId: string, invitationId: string): Promise<WorkspaceMember> {
    const invitation = await this.store.findInvitationById(invitationId)
    if (!invitation) throw new WorkspaceNotFoundError(invitationId)
    if (invitation.acceptedAt) throw new WorkspaceConflictError('Invitation already accepted.')
    if (new Date() > invitation.expiresAt) throw new InvitationExpiredError()

    await this.store.upsertUser(userId)
    const member = await this.store.insertMember({
      workspaceId: invitation.workspaceId,
      userId,
      role: invitation.role as Role,
    })
    await this.store.acceptInvitation(invitationId)

    // Auto-set as active workspace if they have none
    const active = await this.store.getActiveWorkspaceId(userId)
    if (!active) {
      await this.store.setActiveWorkspace(userId, invitation.workspaceId)
    }

    return member
  }

  async declineInvitation(userId: string, invitationId: string): Promise<void> {
    const invitation = await this.store.findInvitationById(invitationId)
    if (!invitation) throw new WorkspaceNotFoundError(invitationId)
    await this.store.deleteInvitation(invitationId)
  }

  async transferOwnership(userId: string, workspaceId: string, newOwnerId: string): Promise<void> {
    await this.assertRole(userId, workspaceId, canTransferOwnership)
    const newOwnerMember = await this.store.getMember(workspaceId, newOwnerId)
    if (!newOwnerMember) throw new WorkspaceForbiddenError('Target user is not a member of this workspace.')
    await this.store.transferOwnership(workspaceId, userId, newOwnerId)
  }

  async setActiveWorkspace(userId: string, workspaceId: string): Promise<void> {
    await this.assertMember(userId, workspaceId)
    await this.store.upsertUser(userId)
    await this.store.setActiveWorkspace(userId, workspaceId)
  }
}
