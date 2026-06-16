import { canDeleteWorkspace, canEditWorkspace, canManageMembers, canTransferOwnership } from '@/lib/rbac'
import type { Workspace, WorkspaceMember, WorkspaceInvitation, Role, WorkspaceWithRole } from '@/core/domain/entities/workspace'
import type { WorkspacePort, CreateWorkspaceInput, UpdateWorkspaceInput, InviteMemberInput } from '@/core/ports/in/workspace.port'
import type { WorkspaceStorePort } from '@/core/ports/out/workspace-store.port'
import type { CachePort } from '@/core/ports/out/cache.port'

const WS_LIST_TTL = 60 // seconds

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
  constructor(
    private readonly store: WorkspaceStorePort,
    private readonly cache: CachePort,
  ) {}

  private wsListKey(userId: string): string {
    return `ws:list:${userId}`
  }

  private async bustWsList(userId: string): Promise<void> {
    await this.cache.delete(this.wsListKey(userId))
  }

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
    await this.bustWsList(userId)
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
    const cached = await this.cache.get<WorkspaceWithRole[]>(this.wsListKey(userId))
    if (cached) return cached
    const list = await this.store.listWorkspacesByUser(userId)
    await this.cache.set(this.wsListKey(userId), list, WS_LIST_TTL)
    return list
  }

  async updateWorkspace(userId: string, workspaceId: string, input: UpdateWorkspaceInput): Promise<Workspace> {
    await this.assertRole(userId, workspaceId, canEditWorkspace)
    const ws = await this.store.updateWorkspace(workspaceId, { ...input, updatedAt: new Date() })
    // Bust every member of this workspace — names/plan might appear in the list
    const members = await this.store.listMembers(workspaceId)
    await Promise.all(members.map((m) => this.bustWsList(m.userId)))
    return ws
  }

  async deleteWorkspace(userId: string, workspaceId: string): Promise<void> {
    await this.assertRole(userId, workspaceId, canDeleteWorkspace)
    const count = await this.store.countMembers(workspaceId)
    if (count > 1) {
      throw new WorkspaceConflictError('Remove all members before deleting the workspace.')
    }
    await this.store.deleteWorkspace(workspaceId)
    await this.bustWsList(userId)
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

    const member = await this.store.updateMemberRole(workspaceId, targetUserId, role)
    // Bust both actor and target — their workspace list may reflect role metadata
    await Promise.all([this.bustWsList(userId), this.bustWsList(targetUserId)])
    return member
  }

  async removeMember(userId: string, workspaceId: string, targetUserId: string): Promise<void> {
    const actor = await this.assertRole(userId, workspaceId, canManageMembers)

    // Owner cannot remove themselves
    if (targetUserId === userId && actor.role === 'owner') {
      throw new WorkspaceForbiddenError('Transfer ownership before leaving the workspace.')
    }

    await this.store.removeMember(workspaceId, targetUserId)
    // Bust the removed member's list (workspace gone) and actor's list (member count changes)
    await Promise.all([this.bustWsList(targetUserId), this.bustWsList(userId)])
  }

  async inviteMember(userId: string, workspaceId: string, input: InviteMemberInput): Promise<WorkspaceInvitation> {
    await this.assertRole(userId, workspaceId, canManageMembers)

    const token = crypto.randomUUID()
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days

    // No bust needed: invitations don't change workspace list until accepted
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

    // New member joins: bust their list (new workspace added)
    await this.bustWsList(userId)
    return member
  }

  async declineInvitation(userId: string, invitationId: string): Promise<void> {
    const invitation = await this.store.findInvitationById(invitationId)
    if (!invitation) throw new WorkspaceNotFoundError(invitationId)
    await this.store.deleteInvitation(invitationId)
    // No workspace list change — declining doesn't add/remove a workspace
  }

  async transferOwnership(userId: string, workspaceId: string, newOwnerId: string): Promise<void> {
    await this.assertRole(userId, workspaceId, canTransferOwnership)
    const newOwnerMember = await this.store.getMember(workspaceId, newOwnerId)
    if (!newOwnerMember) throw new WorkspaceForbiddenError('Target user is not a member of this workspace.')
    await this.store.transferOwnership(workspaceId, userId, newOwnerId)
    // Bust both old and new owner — roles change in their workspace lists
    await Promise.all([this.bustWsList(userId), this.bustWsList(newOwnerId)])
  }

  async setActiveWorkspace(userId: string, workspaceId: string): Promise<void> {
    await this.assertMember(userId, workspaceId)
    await this.store.upsertUser(userId)
    await this.store.setActiveWorkspace(userId, workspaceId)
  }
}
