const { Pool } = require('pg');

let pool;
let schemaReady;

function db() {
  const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (!connectionString) throw new Error('Database is not configured. Set DATABASE_URL or POSTGRES_URL.');
  if (!pool) pool = new Pool({ connectionString });
  return pool;
}

async function ready() {
  if (!schemaReady) {
    schemaReady = (async () => {
      const connection = db();
      await connection.query(`
        CREATE TABLE IF NOT EXISTS users (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          email TEXT,
          avatar TEXT,
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
        ALTER TABLE users
          ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
        CREATE TABLE IF NOT EXISTS chats (
          id BIGSERIAL PRIMARY KEY,
          kind TEXT NOT NULL DEFAULT 'direct' CHECK (kind IN ('direct', 'group')),
          title TEXT,
          direct_key TEXT UNIQUE,
          created_by TEXT NOT NULL REFERENCES users(id),
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
        CREATE TABLE IF NOT EXISTS chat_members (
          chat_id BIGINT NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
          user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          PRIMARY KEY (chat_id, user_id)
        );
        CREATE TABLE IF NOT EXISTS messages (
          id BIGSERIAL PRIMARY KEY,
          chat_id BIGINT NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
          sender_id TEXT NOT NULL REFERENCES users(id),
          body TEXT NOT NULL CHECK (char_length(body) BETWEEN 1 AND 4000),
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
        CREATE INDEX IF NOT EXISTS chat_members_user_idx ON chat_members(user_id, chat_id);
        CREATE INDEX IF NOT EXISTS messages_chat_id_idx ON messages(chat_id, id);
      `);
    })().catch(error => {
      schemaReady = null;
      throw error;
    });
  }
  await schemaReady;
  return db();
}

async function saveUser(user) {
  const connection = await ready();
  await connection.query(
    `INSERT INTO users (id, name, email, avatar)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, email = EXCLUDED.email,
       avatar = EXCLUDED.avatar, updated_at = NOW()`,
    [user.id, user.name || user.id, user.email || null, user.avatar || null]
  );
}

module.exports = { ready, saveUser };
