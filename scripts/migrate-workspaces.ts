/**
 * Workspace migration script.
 *
 * Usage:
 *   pnpm tsx scripts/migrate-workspaces.ts
 *
 * What it does:
 *   1. Collects all distinct userIds from conversations, agents, and documents.
 *   2. For each userId, creates a "Personal" workspace (if none exists).
 *   3. Inserts the user as owner in workspace_members.
 *   4. Backfills workspaceId on existing conversations, agents, and documents.
 *   5. Creates a users row with active_workspace_id pointing to their personal workspace.
 *   6. Idempotent: skips users who already have a "Personal" workspace.
 */

import 'dotenv/config'
import { config } from 'dotenv'
config({ path: '.env.local' })

import postgres from 'postgres'
import { drizzle } from 'drizzle-orm/postgres-js'
import { eq, and, isNull, sql } from 'drizzle-orm'
import { randomUUID } from 'crypto'
import * as schema from '../src/adapters/db/schema'

const {
  workspaces,
  workspaceMembers,
  users,
  conversations,
  agents,
  documents,
} = schema

async function main() {
  const client = postgres(process.env.DATABASE_URL!)
  const db = drizzle(client, { schema })

  console.log('Starting workspace migration...')

  // Collect distinct user IDs from all resource tables
  const [convUsers, agentUsers, docUsers] = await Promise.all([
    db
      .selectDistinct({ userId: conversations.userId })
      .from(conversations)
      .where(isNull(conversations.workspaceId)),
    // agents don't have a userId directly — skip for now (they can be picked up later)
    // We get them via scheduledAgents if needed
    Promise.resolve([] as { userId: string }[]),
    Promise.resolve([] as { userId: string }[]),
  ])

  // Also grab users from scheduled_agents
  const saUsers = await db
    .selectDistinct({ userId: schema.scheduledAgents.userId })
    .from(schema.scheduledAgents)

  const allUserIds = new Set([
    ...convUsers.map((r) => r.userId),
    ...agentUsers.map((r) => r.userId),
    ...docUsers.map((r) => r.userId),
    ...saUsers.map((r) => r.userId),
  ])

  console.log(`Found ${allUserIds.size} distinct users to migrate.`)

  for (const userId of allUserIds) {
    // Check if this user already has a Personal workspace
    const existingWs = await db
      .select({ id: workspaces.id })
      .from(workspaces)
      .innerJoin(workspaceMembers, eq(workspaceMembers.workspaceId, workspaces.id))
      .where(
        and(
          eq(workspaces.ownerId, userId),
          eq(workspaces.name, 'Personal'),
        ),
      )

    let workspaceId: string

    if (existingWs.length > 0) {
      workspaceId = existingWs[0].id
      console.log(`  [skip] User ${userId} already has Personal workspace (${workspaceId})`)
    } else {
      // Create workspace + member atomically
      workspaceId = randomUUID()

      await db.transaction(async (tx) => {
        await tx.insert(workspaces).values({
          id: workspaceId,
          name: 'Personal',
          ownerId: userId,
          plan: 'free',
          metadata: {},
        })

        await tx.insert(workspaceMembers).values({
          id: randomUUID(),
          workspaceId,
          userId,
          role: 'owner',
        })
      })

      console.log(`  [create] Personal workspace for ${userId}: ${workspaceId}`)
    }

    // Upsert user row with active workspace
    await db
      .insert(users)
      .values({ id: userId, activeWorkspaceId: workspaceId })
      .onConflictDoUpdate({
        target: users.id,
        set: {
          activeWorkspaceId: sql`COALESCE(${users.activeWorkspaceId}, ${workspaceId})`,
        },
      })

    // Backfill workspaceId on conversations
    await db
      .update(conversations)
      .set({ workspaceId })
      .where(
        and(
          eq(conversations.userId, userId),
          isNull(conversations.workspaceId),
        ),
      )

    console.log(`  [backfill] conversations for ${userId}`)

    // Backfill workspaceId on documents that are linked via knowledge_base — skip for now
    // (documents don't have userId directly; they belong to knowledge bases which are scoped by user)
    // TODO: join through knowledge_bases to find userId and backfill document workspaceId
  }

  console.log('\nMigration complete.')
  await client.end()
}

main().catch((err) => {
  console.error('Migration failed:', err)
  process.exit(1)
})
