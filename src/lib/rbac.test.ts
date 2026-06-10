import { describe, it, expect } from 'vitest'
import {
  roleAtLeast,
  canWrite,
  canManageMembers,
  canDeleteWorkspace,
  canTransferOwnership,
  canEditWorkspace,
} from './rbac'
import type { Role } from '@/core/domain/entities/workspace'

const ALL_ROLES: Role[] = ['owner', 'admin', 'member', 'viewer']

describe('roleAtLeast', () => {
  it('every role is at least itself', () => {
    for (const role of ALL_ROLES) {
      expect(roleAtLeast(role, role)).toBe(true)
    }
  })

  it('respects the owner > admin > member > viewer hierarchy', () => {
    expect(roleAtLeast('owner', 'admin')).toBe(true)
    expect(roleAtLeast('admin', 'member')).toBe(true)
    expect(roleAtLeast('member', 'viewer')).toBe(true)
    expect(roleAtLeast('viewer', 'member')).toBe(false)
    expect(roleAtLeast('member', 'admin')).toBe(false)
    expect(roleAtLeast('admin', 'owner')).toBe(false)
  })
})

describe('capability helpers', () => {
  it('canWrite requires member or above', () => {
    expect(canWrite('owner')).toBe(true)
    expect(canWrite('admin')).toBe(true)
    expect(canWrite('member')).toBe(true)
    expect(canWrite('viewer')).toBe(false)
  })

  it('canManageMembers and canEditWorkspace require admin or above', () => {
    for (const fn of [canManageMembers, canEditWorkspace]) {
      expect(fn('owner')).toBe(true)
      expect(fn('admin')).toBe(true)
      expect(fn('member')).toBe(false)
      expect(fn('viewer')).toBe(false)
    }
  })

  it('destructive workspace actions are owner-only', () => {
    for (const fn of [canDeleteWorkspace, canTransferOwnership]) {
      expect(fn('owner')).toBe(true)
      expect(fn('admin')).toBe(false)
      expect(fn('member')).toBe(false)
      expect(fn('viewer')).toBe(false)
    }
  })
})
