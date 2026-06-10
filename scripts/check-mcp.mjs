import { config } from 'dotenv'
import pg from 'pg'

config({ path: '.env.local' })

const { Client } = pg
const client = new Client({ connectionString: process.env.DATABASE_URL })

try {
  await client.connect()

  // Try both common drizzle migration table locations
  let migrationsRows = null
  try {
    const r = await client.query(
      "SELECT hash, created_at FROM drizzle.__drizzle_migrations ORDER BY created_at DESC LIMIT 8",
    )
    migrationsRows = r.rows
    console.log('Migrations tracker: drizzle.__drizzle_migrations')
  } catch {
    try {
      const r = await client.query(
        "SELECT hash, created_at FROM __drizzle_migrations ORDER BY created_at DESC LIMIT 8",
      )
      migrationsRows = r.rows
      console.log('Migrations tracker: public.__drizzle_migrations')
    } catch {
      console.log('No drizzle migrations tracker table found (DB was set up another way)')
    }
  }
  if (migrationsRows) {
    for (const row of migrationsRows) console.log(' ', row.hash?.slice(0, 12), row.created_at)
  }

  const r2 = await client.query(
    "SELECT to_regclass('public.mcp_servers')::text as t",
  )
  console.log('mcp_servers table:', r2.rows[0].t ?? 'DOES NOT EXIST')

  if (r2.rows[0].t) {
    const r3 = await client.query(
      "SELECT column_name, data_type FROM information_schema.columns WHERE table_name='mcp_servers' ORDER BY ordinal_position",
    )
    console.log('Columns:')
    for (const c of r3.rows) console.log(' ', c.column_name, c.data_type)
  }
} catch (e) {
  console.error('ERROR:', e.message)
  process.exit(2)
} finally {
  await client.end()
}
