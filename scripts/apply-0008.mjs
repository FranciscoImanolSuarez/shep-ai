import { config } from 'dotenv'
import { readFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import pg from 'pg'

config({ path: '.env.local' })

const SQL_PATH = 'drizzle/0008_cute_rick_jones.sql'
const raw = await readFile(SQL_PATH, 'utf8')

// Drizzle tracks the SHA-256 hex of the raw file contents
const hash = createHash('sha256').update(raw).digest('hex')

// Make every CREATE INDEX idempotent so re-runs are safe
const statements = raw
  .split('--> statement-breakpoint')
  .map((s) => s.trim())
  .filter(Boolean)
  .map((s) => s.replace(/^CREATE INDEX "/, 'CREATE INDEX IF NOT EXISTS "'))

const { Client } = pg
const client = new Client({ connectionString: process.env.DATABASE_URL })
await client.connect()

try {
  const exists = await client.query(
    'SELECT 1 FROM drizzle.__drizzle_migrations WHERE hash=$1',
    [hash],
  )
  if (exists.rowCount > 0) {
    console.log('Migration 0008 already tracked. Nothing to do.')
    process.exit(0)
  }

  await client.query('BEGIN')
  for (const stmt of statements) {
    console.log('→', stmt.slice(0, 70).replace(/\s+/g, ' '))
    await client.query(stmt)
  }
  await client.query(
    'INSERT INTO drizzle.__drizzle_migrations (hash, created_at) VALUES ($1, $2)',
    [hash, Date.now()],
  )
  await client.query('COMMIT')
  console.log(`\n✅ Applied 0008 — ${statements.length} statements, migration tracked.`)
} catch (err) {
  await client.query('ROLLBACK').catch(() => {})
  console.error('❌ Failed, rolled back:', err.message)
  process.exitCode = 1
} finally {
  await client.end()
}
