import postgres from 'postgres'
import { drizzle } from 'drizzle-orm/postgres-js'
import * as schema from './schema'

const globalForDb = globalThis as unknown as {
  pgClient?: ReturnType<typeof postgres>
}

const client =
  globalForDb.pgClient ??
  postgres(process.env.DATABASE_URL!, {
    max: 10,
    idle_timeout: 20,
    connect_timeout: 10,
  })

globalForDb.pgClient = client

export function createDb() {
  return drizzle(client, { schema })
}

export type Database = ReturnType<typeof createDb>
