import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { InMemoryCacheAdapter } from './in-memory-cache.adapter'
import type { CachePort } from '@/core/ports/out/cache.port'
import type { WorkspaceWithRole } from '@/core/domain/entities/workspace'
import { WorkspaceUseCase } from '@/core/usecases/workspace.usecase'

// ---------------------------------------------------------------------------
// InMemoryCacheAdapter unit tests
// ---------------------------------------------------------------------------

describe('InMemoryCacheAdapter', () => {
  let cache: InMemoryCacheAdapter

  beforeEach(() => {
    cache = new InMemoryCacheAdapter()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns null for a missing key', async () => {
    expect(await cache.get('missing')).toBeNull()
  })

  it('stores and retrieves a value', async () => {
    await cache.set('k', { x: 1 })
    expect(await cache.get<{ x: number }>('k')).toEqual({ x: 1 })
  })

  it('deletes a key', async () => {
    await cache.set('k', 42)
    await cache.delete('k')
    expect(await cache.get('k')).toBeNull()
  })

  it('is a no-op delete on a missing key', async () => {
    await expect(cache.delete('nope')).resolves.toBeUndefined()
  })

  it('returns the value before TTL expires', async () => {
    await cache.set('k', 'hello', 10) // 10s TTL
    vi.advanceTimersByTime(9_000)     // 9s later
    expect(await cache.get('k')).toBe('hello')
  })

  it('returns null after TTL expires', async () => {
    await cache.set('k', 'hello', 10)
    vi.advanceTimersByTime(10_001) // just past 10s
    expect(await cache.get('k')).toBeNull()
  })

  it('stores without TTL and never expires', async () => {
    await cache.set('k', 'permanent')
    vi.advanceTimersByTime(1_000_000_000)
    expect(await cache.get('k')).toBe('permanent')
  })

  it('overwrites an existing key', async () => {
    await cache.set('k', 1)
    await cache.set('k', 2)
    expect(await cache.get<number>('k')).toBe(2)
  })

  it('handles multiple independent keys', async () => {
    await cache.set('a', 'A')
    await cache.set('b', 'B')
    expect(await cache.get('a')).toBe('A')
    expect(await cache.get('b')).toBe('B')
    await cache.delete('a')
    expect(await cache.get('a')).toBeNull()
    expect(await cache.get('b')).toBe('B')
  })
})

// ---------------------------------------------------------------------------
// Cache-behaviour integration: WorkspaceUseCase + InMemoryCacheAdapter
// ---------------------------------------------------------------------------

function makeWorkspaceWithRole(id: string, userId: string): WorkspaceWithRole {
  return {
    id,
    name: `ws-${id}`,
    ownerId: userId,
    plan: 'free',
    metadata: {},
    createdAt: new Date(),
    updatedAt: new Date(),
    role: 'owner',
  }
}

function makeStubStore(ws: WorkspaceWithRole): {
  store: ConstructorParameters<typeof WorkspaceUseCase>[0]
  callCount: { listWorkspacesByUser: number }
} {
  const callCount = { listWorkspacesByUser: 0 }

  const store: ConstructorParameters<typeof WorkspaceUseCase>[0] = {
    insertWorkspace: async (data) => ({
      id: 'new-ws',
      name: data.name,
      ownerId: data.ownerId,
      plan: data.plan,
      metadata: data.metadata,
      createdAt: new Date(),
      updatedAt: new Date(),
    }),
    findWorkspaceById: async () => null,
    listWorkspacesByUser: async () => {
      callCount.listWorkspacesByUser++
      return [ws]
    },
    updateWorkspace: async (_id, data) => ({ ...ws, ...data, updatedAt: new Date() }),
    deleteWorkspace: async () => {},
    listMembers: async () => [{ id: 'm1', workspaceId: ws.id, userId: ws.ownerId, role: 'owner', joinedAt: new Date() }],
    getMember: async (_wsId, userId) =>
      userId === ws.ownerId
        ? { id: 'm1', workspaceId: ws.id, userId, role: 'owner', joinedAt: new Date() }
        : null,
    updateMemberRole: async (_wsId, uid, role) => ({ id: 'm2', workspaceId: ws.id, userId: uid, role, joinedAt: new Date() }),
    removeMember: async () => {},
    insertMember: async (m) => ({ id: 'm3', workspaceId: m.workspaceId, userId: m.userId, role: m.role, joinedAt: new Date() }),
    countMembers: async () => 1,
    insertInvitation: async (inv) => ({
      id: 'inv-1',
      workspaceId: inv.workspaceId,
      inviterId: inv.inviterId,
      inviteeEmail: inv.inviteeEmail,
      role: inv.role,
      token: inv.token,
      expiresAt: inv.expiresAt,
      createdAt: new Date(),
    }),
    findInvitationById: async () => null,
    findInvitationByToken: async () => null,
    listPendingInvitationsByEmail: async () => [],
    acceptInvitation: async () => {},
    deleteInvitation: async () => {},
    upsertUser: async () => {},
    setActiveWorkspace: async () => {},
    getActiveWorkspaceId: async () => null,
    transferOwnership: async () => {},
  }

  return { store, callCount }
}

describe('WorkspaceUseCase cache behaviour', () => {
  let cache: CachePort
  const userId = 'user-1'
  const ws = makeWorkspaceWithRole('ws-1', userId)

  beforeEach(() => {
    cache = new InMemoryCacheAdapter()
  })

  it('returns cached result on the 2nd listWorkspaces call', async () => {
    const { store, callCount } = makeStubStore(ws)
    const uc = new WorkspaceUseCase(store, cache)

    const first = await uc.listWorkspaces(userId)
    const second = await uc.listWorkspaces(userId)

    expect(callCount.listWorkspacesByUser).toBe(1)
    expect(first).toEqual(second)
  })

  it('busts cache after createWorkspace', async () => {
    const { store, callCount } = makeStubStore(ws)
    const uc = new WorkspaceUseCase(store, cache)

    await uc.listWorkspaces(userId)
    expect(callCount.listWorkspacesByUser).toBe(1)

    await uc.createWorkspace(userId, { name: 'new' })
    await uc.listWorkspaces(userId)

    // Must hit the store again because the create busted the key
    expect(callCount.listWorkspacesByUser).toBe(2)
  })

  it('busts cache after deleteWorkspace', async () => {
    const { store, callCount } = makeStubStore(ws)
    const uc = new WorkspaceUseCase(store, cache)

    await uc.listWorkspaces(userId)
    expect(callCount.listWorkspacesByUser).toBe(1)

    await uc.deleteWorkspace(userId, ws.id)
    await uc.listWorkspaces(userId)

    expect(callCount.listWorkspacesByUser).toBe(2)
  })
})
