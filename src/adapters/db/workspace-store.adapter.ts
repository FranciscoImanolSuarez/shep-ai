import { eq, and, isNull } from 'drizzle-orm'
import { randomUUID } from 'crypto'
import type { WorkspaceStorePort } from '@/core/ports/out/workspace-store.port'
import type { Workspace, WorkspaceMember, WorkspaceInvitation, Role, WorkspaceWithRole } from '@/core/domain/entities/workspace'
import { workspaces, workspaceMembers, workspaceInvitations, users } from './schema'
import type { Database } from './connection'

type WorkspaceRow = typeof workspaces.$inferSelect
type WorkspaceMemberRow = typeof workspaceMembers.$inferSelect
type WorkspaceInvitationRow = typeof workspaceInvitations.$inferSelect

function toWorkspaceDomain(row: WorkspaceRow): Workspace {
  return {
    id: row.id,
    name: row.name,
    ownerId: row.ownerId,
    plan: row.plan,
    metadata: (row.metadata ?? {}) as Record<string, unknown>,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}

function toMemberDomain(row: WorkspaceMemberRow): WorkspaceMember {
  return {
    id: row.id,
    workspaceId: row.workspaceId,
    userId: row.userId,
    role: row.role as Role,
    joinedAt: row.joinedAt,
  }
}

function toInvitationDomain(row: WorkspaceInvitationRow): WorkspaceInvitation {
  return {
    id: row.id,
    workspaceId: row.workspaceId,
    inviterId: row.inviterId,
    inviteeEmail: row.inviteeEmail,
    role: row.role as Role,
    token: row.token,
    expiresAt: row.expiresAt,
    acceptedAt: row.acceptedAt ?? undefined,
    createdAt: row.createdAt,
  }
}

export class WorkspaceStoreAdapter implements WorkspaceStorePort {
  constructor(private readonly db: Database) {}

  async insertWorkspace(workspace: Omit<Workspace, 'id' | 'createdAt' | 'updatedAt'>, ownerUserId: string): Promise<Workspace> {
    return this.db.transaction(async (tx) => {
      const [wsRow] = await tx.insert(workspaces).values({
        id: randomUUID(),
        name: workspace.name,
        ownerId: workspace.ownerId,
        plan: workspace.plan,
        metadata: workspace.metadata,
      }).returning()

      await tx.insert(workspaceMembers).values({
        id: randomUUID(),
        workspaceId: wsRow.id,
        userId: ownerUserId,
        role: 'owner',
      })

      return toWorkspaceDomain(wsRow)
    })
  }

  async findWorkspaceById(id: string): Promise<Workspace | null> {
    const [row] = await this.db.select().from(workspaces).where(eq(workspaces.id, id))
    return row ? toWorkspaceDomain(row) : null
  }

  async listWorkspacesByUser(userId: string): Promise<WorkspaceWithRole[]> {
    const rows = await this.db
      .select({
        ws: workspaces,
        member: workspaceMembers,
      })
      .from(workspaceMembers)
      .innerJoin(workspaces, eq(workspaces.id, workspaceMembers.workspaceId))
      .where(eq(workspaceMembers.userId, userId))

    return rows.map(({ ws, member }) => ({
      ...toWorkspaceDomain(ws),
      role: member.role as Role,
    }))
  }

  async updateWorkspace(id: string, data: Partial<Pick<Workspace, 'name' | 'plan' | 'metadata' | 'updatedAt'>>): Promise<Workspace> {
    const values: Record<string, unknown> = {}
    if (data.name !== undefined) values.name = data.name
    if (data.plan !== undefined) values.plan = data.plan
    if (data.metadata !== undefined) values.metadata = data.metadata
    if (data.updatedAt !== undefined) values.updatedAt = data.updatedAt

    const [row] = await this.db
      .update(workspaces)
      .set(values)
      .where(eq(workspaces.id, id))
      .returning()

    if (!row) throw new Error(`Workspace not found: ${id}`)
    return toWorkspaceDomain(row)
  }

  async deleteWorkspace(id: string): Promise<void> {
    await this.db.delete(workspaces).where(eq(workspaces.id, id))
  }

  async listMembers(workspaceId: string): Promise<WorkspaceMember[]> {
    const rows = await this.db
      .select()
      .from(workspaceMembers)
      .where(eq(workspaceMembers.workspaceId, workspaceId))

    return rows.map(toMemberDomain)
  }

  async getMember(workspaceId: string, userId: string): Promise<WorkspaceMember | null> {
    const [row] = await this.db
      .select()
      .from(workspaceMembers)
      .where(and(
        eq(workspaceMembers.workspaceId, workspaceId),
        eq(workspaceMembers.userId, userId),
      ))

    return row ? toMemberDomain(row) : null
  }

  async updateMemberRole(workspaceId: string, userId: string, role: Role): Promise<WorkspaceMember> {
    const [row] = await this.db
      .update(workspaceMembers)
      .set({ role })
      .where(and(
        eq(workspaceMembers.workspaceId, workspaceId),
        eq(workspaceMembers.userId, userId),
      ))
      .returning()

    if (!row) throw new Error(`Member not found: ${userId} in ${workspaceId}`)
    return toMemberDomain(row)
  }

  async removeMember(workspaceId: string, userId: string): Promise<void> {
    await this.db
      .delete(workspaceMembers)
      .where(and(
        eq(workspaceMembers.workspaceId, workspaceId),
        eq(workspaceMembers.userId, userId),
      ))
  }

  async insertMember(member: Omit<WorkspaceMember, 'id' | 'joinedAt'>): Promise<WorkspaceMember> {
    const [row] = await this.db.insert(workspaceMembers).values({
      id: randomUUID(),
      workspaceId: member.workspaceId,
      userId: member.userId,
      role: member.role,
    }).returning()

    return toMemberDomain(row)
  }

  async countMembers(workspaceId: string): Promise<number> {
    const rows = await this.db
      .select({ id: workspaceMembers.id })
      .from(workspaceMembers)
      .where(eq(workspaceMembers.workspaceId, workspaceId))

    return rows.length
  }

  async insertInvitation(invitation: Omit<WorkspaceInvitation, 'id' | 'createdAt' | 'acceptedAt'>): Promise<WorkspaceInvitation> {
    const [row] = await this.db.insert(workspaceInvitations).values({
      id: randomUUID(),
      workspaceId: invitation.workspaceId,
      inviterId: invitation.inviterId,
      inviteeEmail: invitation.inviteeEmail,
      role: invitation.role,
      token: invitation.token,
      expiresAt: invitation.expiresAt,
    }).returning()

    return toInvitationDomain(row)
  }

  async findInvitationById(id: string): Promise<WorkspaceInvitation | null> {
    const [row] = await this.db
      .select()
      .from(workspaceInvitations)
      .where(eq(workspaceInvitations.id, id))

    return row ? toInvitationDomain(row) : null
  }

  async findInvitationByToken(token: string): Promise<WorkspaceInvitation | null> {
    const [row] = await this.db
      .select()
      .from(workspaceInvitations)
      .where(eq(workspaceInvitations.token, token))

    return row ? toInvitationDomain(row) : null
  }

  async listPendingInvitationsByEmail(email: string): Promise<WorkspaceInvitation[]> {
    const rows = await this.db
      .select()
      .from(workspaceInvitations)
      .where(and(
        eq(workspaceInvitations.inviteeEmail, email),
        isNull(workspaceInvitations.acceptedAt),
      ))

    return rows
      .map(toInvitationDomain)
      .filter((inv) => inv.expiresAt > new Date())
  }

  async acceptInvitation(id: string): Promise<void> {
    await this.db
      .update(workspaceInvitations)
      .set({ acceptedAt: new Date() })
      .where(eq(workspaceInvitations.id, id))
  }

  async deleteInvitation(id: string): Promise<void> {
    await this.db.delete(workspaceInvitations).where(eq(workspaceInvitations.id, id))
  }

  async upsertUser(userId: string): Promise<void> {
    await this.db
      .insert(users)
      .values({ id: userId })
      .onConflictDoNothing()
  }

  async setActiveWorkspace(userId: string, workspaceId: string | null): Promise<void> {
    await this.db
      .update(users)
      .set({ activeWorkspaceId: workspaceId })
      .where(eq(users.id, userId))
  }

  async getActiveWorkspaceId(userId: string): Promise<string | null> {
    const [row] = await this.db
      .select({ activeWorkspaceId: users.activeWorkspaceId })
      .from(users)
      .where(eq(users.id, userId))

    return row?.activeWorkspaceId ?? null
  }

  async transferOwnership(workspaceId: string, fromUserId: string, toUserId: string): Promise<void> {
    await this.db.transaction(async (tx) => {
      // New owner
      await tx
        .update(workspaceMembers)
        .set({ role: 'owner' })
        .where(and(
          eq(workspaceMembers.workspaceId, workspaceId),
          eq(workspaceMembers.userId, toUserId),
        ))

      // Previous owner becomes admin
      await tx
        .update(workspaceMembers)
        .set({ role: 'admin' })
        .where(and(
          eq(workspaceMembers.workspaceId, workspaceId),
          eq(workspaceMembers.userId, fromUserId),
        ))

      // Update workspace ownerId
      await tx
        .update(workspaces)
        .set({ ownerId: toUserId, updatedAt: new Date() })
        .where(eq(workspaces.id, workspaceId))
    })
  }
}
