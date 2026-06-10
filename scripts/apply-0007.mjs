import { config } from 'dotenv'
import { readFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import pg from 'pg'

config({ path: '.env.local' })

const SQL_PATH = 'drizzle/0007_add_mcp_servers.sql'
const sql = await readFile(SQL_PATH, 'utf8')

// Drizzle stores the hash of the raw file contents as SHA-256 hex
const hash = createHash('sha256').update(sql).digest('hex')

const { Client } = pg
const client = new Client({ connectionString: process.env.DATABASE_URL })
await client.connect()

try {
  // Inspect tracker columns so we can insert the right row shape
  const cols = await client.query(
    "SELECT column_name FROM information_schema.columns WHERE table_schema='drizzle' AND table_name='__drizzle_migrations' ORDER BY ordinal_position",
  )
  console.log('tracker cols:', cols.rows.map((r) => r.column_name).join(', '))

  // Check if this migration is already tracked
  const exists = await client.query(
    'SELECT 1 FROM drizzle.__drizzle_migrations WHERE hash=$1',
    [hash],
  )
  if (exists.rowCount > 0) {
    console.log('Migration already tracked. Nothing to do.')
    process.exit(0)
  }

  // Check if the table already exists (idempotency safeguard)
  const tbl = await client.query("SELECT to_regclass('public.mcp_servers')::text as t")
  if (tbl.rows[0].t) {
    console.log('mcp_servers already exists. Marking migration as applied without re-running.')
    await client.query(
      'INSERT INTO drizzle.__drizzle_migrations (hash, created_at) VALUES ($1, $2)',
      [hash, Date.now()],
    )
    console.log('Tracker updated.')
    process.exit(0)
  }

  // Apply the migration. The .sql file uses Drizzle's `--> statement-breakpoint`
  // marker between statements; we split on it and run each separately.
  const statements = sql
    .split('--> statement-breakpoint')
    .map((s) => s.trim())
    .filter(Boolean)

  console.log(`Applying ${statements.length} statements from 0007_add_mcp_servers.sql...`)

  await client.query('BEGIN')
  try {
    for (const stmt of statements) {
      await client.query(stmt)
    }
    await client.query(
      'INSERT INTO drizzle.__drizzle_migrations (hash, created_at) VALUES ($1, $2)',
      [hash, Date.now()],
    )
    await client.query('COMMIT')
    console.log('Applied successfully.')
  } catch (e) {
    await client.query('ROLLBACK')
    throw e
  }

  // Verify
  const verify = await client.query(
    "SELECT column_name, data_type FROM information_schema.columns WHERE table_name='mcp_servers' ORDER BY ordinal_position",
  )
  console.log('mcp_servers columns now:')
  for (const c of verify.rows) console.log(' ', c.column_name, c.data_type)
} catch (e) {
  console.error('ERROR:', e.message)
  process.exit(1)
} finally {
  await client.end()
}
