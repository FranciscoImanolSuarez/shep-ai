import type { Workspace, WorkspaceMember, WorkspaceInvitation, Role, WorkspaceWithRole } from '@/core/domain/entities/workspace'

export interface CreateWorkspaceInput {
  name: string
}

export interface UpdateWorkspaceInput {
  name?: string
  plan?: string
  metadata?: Record<string, unknown>
}

export interface InviteMemberInput {
  email: string
  role: Role
}

export interface WorkspacePort {
  // Workspace CRUD
  createWorkspace(userId: string, input: CreateWorkspaceInput): Promise<Workspace>
  getWorkspace(userId: string, workspaceId: string): Promise<WorkspaceWithRole>
  listWorkspaces(userId: string): Promise<WorkspaceWithRole[]>
  updateWorkspace(userId: string, workspaceId: string, input: UpdateWorkspaceInput): Promise<Workspace>
  deleteWorkspace(userId: string, workspaceId: string): Promise<void>

  // Members
  listMembers(userId: string, workspaceId: string): Promise<WorkspaceMember[]>
  changeRole(userId: string, workspaceId: string, targetUserId: string, role: Role): Promise<WorkspaceMember>
  removeMember(userId: string, workspaceId: string, targetUserId: string): Promise<void>

  // Invitations
  inviteMember(userId: string, workspaceId: string, input: InviteMemberInput): Promise<WorkspaceInvitation>
  listInvitationsByEmail(email: string): Promise<WorkspaceInvitation[]>
  acceptInvitation(userId: string, invitationId: string): Promise<WorkspaceMember>
  declineInvitation(userId: string, invitationId: string): Promise<void>

  // Ownership
  transferOwnership(userId: string, workspaceId: string, newOwnerId: string): Promise<void>

  // Active workspace
  setActiveWorkspace(userId: string, workspaceId: string): Promise<void>
}
