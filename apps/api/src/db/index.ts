import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import * as schema from './schema'

let _db: ReturnType<typeof drizzle> | null = null

export function getDb() {
  if (_db) return _db
  const dbUrl = process.env.DATABASE_URL ?? ':memory:'
  const sqlite = new Database(dbUrl)
  sqlite.pragma('journal_mode = WAL')
  sqlite.pragma('foreign_keys = ON')
  _db = drizzle(sqlite, { schema })
  return _db
}

// For test override
export function setTestDb(db: ReturnType<typeof drizzle>) {
  _db = db
}

export type Db = ReturnType<typeof drizzle>
