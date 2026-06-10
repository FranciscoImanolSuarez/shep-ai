export type Role = 'owner' | 'admin' | 'member' | 'viewer'

export interface Workspace {
  id: string
  name: string
  ownerId: string
  plan: string
  metadata: Record<string, unknown>
  createdAt: Date
  updatedAt: Date
}

export interface WorkspaceMember {
  id: string
  workspaceId: string
  userId: string
  role: Role
  joinedAt: Date
}

export interface WorkspaceInvitation {
  id: string
  workspaceId: string
  inviterId: string
  inviteeEmail: string
  role: Role
  token: string
  expiresAt: Date
  acceptedAt?: Date
  createdAt: Date
}

export interface WorkspaceWithRole extends Workspace {
  role: Role
}

export function createWorkspace(input: Pick<Workspace, 'name' | 'ownerId'>): Omit<Workspace, 'id' | 'createdAt' | 'updatedAt'> {
  return {
    name: input.name,
    ownerId: input.ownerId,
    plan: 'free',
    metadata: {},
  }
}

export function createWorkspaceMember(input: Pick<WorkspaceMember, 'workspaceId' | 'userId' | 'role'>): Omit<WorkspaceMember, 'id' | 'joinedAt'> {
  return {
    workspaceId: input.workspaceId,
    userId: input.userId,
    role: input.role,
  }
}

export function createWorkspaceInvitation(input: Pick<WorkspaceInvitation, 'workspaceId' | 'inviterId' | 'inviteeEmail' | 'role' | 'token' | 'expiresAt'>): Omit<WorkspaceInvitation, 'id' | 'createdAt' | 'acceptedAt'> {
  return {
    workspaceId: input.workspaceId,
    inviterId: input.inviterId,
    inviteeEmail: input.inviteeEmail,
    role: input.role,
    token: input.token,
    expiresAt: input.expiresAt,
  }
}
