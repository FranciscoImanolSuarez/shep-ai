import postgres from 'postgres'
import { drizzle } from 'drizzle-orm/postgres-js'
import * as schema from './schema'

export function createDb() {
  const client = postgres(process.env.DATABASE_URL!)
  return drizzle(client, { schema })
}

export type Database = ReturnType<typeof createDb>
