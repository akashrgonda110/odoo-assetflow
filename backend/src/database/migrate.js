import { pool } from '../config/db.js';
import { logger } from '../utils/logger.js';

const migrations = [
  /* ─── 001 – users ──────────────────────────────────────────────── */
  `
  CREATE TABLE IF NOT EXISTS users (
    id         UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    name       VARCHAR(100) NOT NULL,
    email      VARCHAR(255) NOT NULL UNIQUE,
    password   TEXT         NOT NULL,
    role       VARCHAR(20)  NOT NULL DEFAULT 'user'
                            CHECK (role IN ('user', 'admin')),
    is_active  BOOLEAN      NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
  );
  `,

  /* ─── 002 – refresh_tokens ─────────────────────────────────────── */
  `
  CREATE TABLE IF NOT EXISTS refresh_tokens (
    id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash TEXT        NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    revoked    BOOLEAN     NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
  `,

  /* Index to speed up lookup & cleanup */
  `CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON refresh_tokens(user_id);`,
  `CREATE INDEX IF NOT EXISTS idx_refresh_tokens_token_hash ON refresh_tokens(token_hash);`,

  /* ─── 003 – updated_at trigger ─────────────────────────────────── */
  `
  CREATE OR REPLACE FUNCTION set_updated_at()
  RETURNS TRIGGER AS $$
  BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
  END;
  $$ LANGUAGE plpgsql;
  `,
  `
  DO $$
  BEGIN
    IF NOT EXISTS (
      SELECT 1 FROM pg_trigger WHERE tgname = 'trg_users_updated_at'
    ) THEN
      CREATE TRIGGER trg_users_updated_at
        BEFORE UPDATE ON users
        FOR EACH ROW EXECUTE FUNCTION set_updated_at();
    END IF;
  END;
  $$;
  `,
];

(async () => {
  logger.info('Running migrations…');
  const client = await pool.connect();
  try {
    for (const sql of migrations) {
      await client.query(sql);
    }
    logger.info('All migrations ran successfully.');
  } catch (err) {
    logger.error('Migration failed', { error: err.message });
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
})();
