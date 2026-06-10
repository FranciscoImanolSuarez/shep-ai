import type { Workspace, WorkspaceMember, WorkspaceInvitation, Role, WorkspaceWithRole } from '@/core/domain/entities/workspace'

export interface WorkspaceStorePort {
  // Workspace
  insertWorkspace(workspace: Omit<Workspace, 'id' | 'createdAt' | 'updatedAt'>, ownerUserId: string): Promise<Workspace>
  findWorkspaceById(id: string): Promise<Workspace | null>
  listWorkspacesByUser(userId: string): Promise<WorkspaceWithRole[]>
  updateWorkspace(id: string, data: Partial<Pick<Workspace, 'name' | 'plan' | 'metadata' | 'updatedAt'>>): Promise<Workspace>
  deleteWorkspace(id: string): Promise<void>

  // Members
  listMembers(workspaceId: string): Promise<WorkspaceMember[]>
  getMember(workspaceId: string, userId: string): Promise<WorkspaceMember | null>
  updateMemberRole(workspaceId: string, userId: string, role: Role): Promise<WorkspaceMember>
  removeMember(workspaceId: string, userId: string): Promise<void>
  insertMember(member: Omit<WorkspaceMember, 'id' | 'joinedAt'>): Promise<WorkspaceMember>
  countMembers(workspaceId: string): Promise<number>

  // Invitations
  insertInvitation(invitation: Omit<WorkspaceInvitation, 'id' | 'createdAt' | 'acceptedAt'>): Promise<WorkspaceInvitation>
  findInvitationById(id: string): Promise<WorkspaceInvitation | null>
  findInvitationByToken(token: string): Promise<WorkspaceInvitation | null>
  listPendingInvitationsByEmail(email: string): Promise<WorkspaceInvitation[]>
  acceptInvitation(id: string): Promise<void>
  deleteInvitation(id: string): Promise<void>

  // Users
  upsertUser(userId: string): Promise<void>
  setActiveWorkspace(userId: string, workspaceId: string | null): Promise<void>
  getActiveWorkspaceId(userId: string): Promise<string | null>
  transferOwnership(workspaceId: string, fromUserId: string, toUserId: string): Promise<void>
}
