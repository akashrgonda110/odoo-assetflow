import { pool } from '../config/db.js';
import { logger } from '../utils/logger.js';

const migrations = [

  // ─── 001 – updated_at trigger function ──────────────────────────────────────
  `
  CREATE OR REPLACE FUNCTION set_updated_at()
  RETURNS TRIGGER AS $$
  BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
  END;
  $$ LANGUAGE plpgsql;
  `,

  // ─── 002 – users ────────────────────────────────────────────────────────────
  `
  CREATE TABLE IF NOT EXISTS users (
    id           UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    name         VARCHAR(100) NOT NULL,
    email        VARCHAR(255) NOT NULL UNIQUE,
    password     TEXT         NOT NULL,
    role         VARCHAR(20)  NOT NULL DEFAULT 'employee'
                              CHECK (role IN ('admin','asset_manager','department_head','employee')),
    is_active    BOOLEAN      NOT NULL DEFAULT true,
    phone        VARCHAR(30),
    avatar_url   TEXT,
    created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
  );
  `,
  `
  DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_users_updated_at') THEN
      CREATE TRIGGER trg_users_updated_at
        BEFORE UPDATE ON users
        FOR EACH ROW EXECUTE FUNCTION set_updated_at();
    END IF;
  END; $$;
  `,

  // ─── 003 – refresh_tokens ───────────────────────────────────────────────────
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
  `CREATE INDEX IF NOT EXISTS idx_rt_user_id   ON refresh_tokens(user_id);`,
  `CREATE INDEX IF NOT EXISTS idx_rt_token_hash ON refresh_tokens(token_hash);`,

  // ─── 004 – departments ──────────────────────────────────────────────────────
  `
  CREATE TABLE IF NOT EXISTS departments (
    id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    name        VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    head_id     UUID         REFERENCES users(id) ON DELETE SET NULL,
    parent_id   UUID         REFERENCES departments(id) ON DELETE SET NULL,
    status      VARCHAR(10)  NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive')),
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
  );
  `,
  `
  DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_departments_updated_at') THEN
      CREATE TRIGGER trg_departments_updated_at
        BEFORE UPDATE ON departments
        FOR EACH ROW EXECUTE FUNCTION set_updated_at();
    END IF;
  END; $$;
  `,

  // Add department_id to users
  `
  DO $$ BEGIN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name='users' AND column_name='department_id'
    ) THEN
      ALTER TABLE users ADD COLUMN department_id UUID REFERENCES departments(id) ON DELETE SET NULL;
    END IF;
  END; $$;
  `,

  // ─── 005 – asset_categories ─────────────────────────────────────────────────
  `
  CREATE TABLE IF NOT EXISTS asset_categories (
    id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    name            VARCHAR(100) NOT NULL UNIQUE,
    description     TEXT,
    custom_fields   JSONB        DEFAULT '[]',
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
  );
  `,
  `
  DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_asset_categories_updated_at') THEN
      CREATE TRIGGER trg_asset_categories_updated_at
        BEFORE UPDATE ON asset_categories
        FOR EACH ROW EXECUTE FUNCTION set_updated_at();
    END IF;
  END; $$;
  `,

  // ─── 006 – assets ───────────────────────────────────────────────────────────
  `
  CREATE TABLE IF NOT EXISTS assets (
    id               UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    asset_tag        VARCHAR(20)   NOT NULL UNIQUE,
    name             VARCHAR(150)  NOT NULL,
    category_id      UUID          NOT NULL REFERENCES asset_categories(id) ON DELETE RESTRICT,
    serial_number    VARCHAR(100),
    acquisition_date DATE,
    acquisition_cost NUMERIC(12,2),
    condition        VARCHAR(20)   NOT NULL DEFAULT 'good'
                                   CHECK (condition IN ('new','good','fair','poor','damaged')),
    status           VARCHAR(25)   NOT NULL DEFAULT 'available'
                                   CHECK (status IN (
                                     'available','allocated','reserved',
                                     'under_maintenance','lost','retired','disposed'
                                   )),
    location         VARCHAR(150),
    department_id    UUID          REFERENCES departments(id) ON DELETE SET NULL,
    is_bookable      BOOLEAN       NOT NULL DEFAULT false,
    photo_url        TEXT,
    documents        JSONB         DEFAULT '[]',
    custom_fields    JSONB         DEFAULT '{}',
    notes            TEXT,
    created_by       UUID          REFERENCES users(id) ON DELETE SET NULL,
    created_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW()
  );
  `,
  `CREATE INDEX IF NOT EXISTS idx_assets_status      ON assets(status);`,
  `CREATE INDEX IF NOT EXISTS idx_assets_category_id ON assets(category_id);`,
  `CREATE INDEX IF NOT EXISTS idx_assets_department_id ON assets(department_id);`,
  `CREATE INDEX IF NOT EXISTS idx_assets_asset_tag   ON assets(asset_tag);`,
  `
  CREATE SEQUENCE IF NOT EXISTS asset_tag_seq START 1;
  `,
  `
  DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_assets_updated_at') THEN
      CREATE TRIGGER trg_assets_updated_at
        BEFORE UPDATE ON assets
        FOR EACH ROW EXECUTE FUNCTION set_updated_at();
    END IF;
  END; $$;
  `,

  // ─── 007 – allocations ──────────────────────────────────────────────────────
  `
  CREATE TABLE IF NOT EXISTS allocations (
    id                 UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    asset_id           UUID         NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
    assigned_to_user   UUID         REFERENCES users(id) ON DELETE SET NULL,
    assigned_to_dept   UUID         REFERENCES departments(id) ON DELETE SET NULL,
    allocated_by       UUID         REFERENCES users(id) ON DELETE SET NULL,
    expected_return_at DATE,
    returned_at        TIMESTAMPTZ,
    return_condition   VARCHAR(20)  CHECK (return_condition IN ('new','good','fair','poor','damaged')),
    return_notes       TEXT,
    is_active          BOOLEAN      NOT NULL DEFAULT true,
    created_at         TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at         TIMESTAMPTZ  NOT NULL DEFAULT NOW()
  );
  `,
  `CREATE INDEX IF NOT EXISTS idx_allocations_asset_id ON allocations(asset_id);`,
  `CREATE INDEX IF NOT EXISTS idx_allocations_user_id  ON allocations(assigned_to_user);`,
  `CREATE INDEX IF NOT EXISTS idx_allocations_active   ON allocations(is_active);`,
  `
  DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_allocations_updated_at') THEN
      CREATE TRIGGER trg_allocations_updated_at
        BEFORE UPDATE ON allocations
        FOR EACH ROW EXECUTE FUNCTION set_updated_at();
    END IF;
  END; $$;
  `,

  // ─── 008 – transfer_requests ────────────────────────────────────────────────
  `
  CREATE TABLE IF NOT EXISTS transfer_requests (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    asset_id        UUID        NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
    from_user_id    UUID        REFERENCES users(id) ON DELETE SET NULL,
    to_user_id      UUID        REFERENCES users(id) ON DELETE SET NULL,
    to_dept_id      UUID        REFERENCES departments(id) ON DELETE SET NULL,
    requested_by    UUID        REFERENCES users(id) ON DELETE SET NULL,
    approved_by     UUID        REFERENCES users(id) ON DELETE SET NULL,
    reason          TEXT,
    status          VARCHAR(20) NOT NULL DEFAULT 'pending'
                                CHECK (status IN ('pending','approved','rejected','completed')),
    approved_at     TIMESTAMPTZ,
    completed_at    TIMESTAMPTZ,
    rejection_note  TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
  `,
  `CREATE INDEX IF NOT EXISTS idx_transfers_asset_id ON transfer_requests(asset_id);`,
  `CREATE INDEX IF NOT EXISTS idx_transfers_status   ON transfer_requests(status);`,
  `
  DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_transfers_updated_at') THEN
      CREATE TRIGGER trg_transfers_updated_at
        BEFORE UPDATE ON transfer_requests
        FOR EACH ROW EXECUTE FUNCTION set_updated_at();
    END IF;
  END; $$;
  `,

  // ─── 009 – bookings ─────────────────────────────────────────────────────────
  `
  CREATE TABLE IF NOT EXISTS bookings (
    id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    asset_id     UUID        NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
    booked_by    UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    dept_id      UUID        REFERENCES departments(id) ON DELETE SET NULL,
    title        VARCHAR(200),
    start_time   TIMESTAMPTZ NOT NULL,
    end_time     TIMESTAMPTZ NOT NULL,
    status       VARCHAR(15) NOT NULL DEFAULT 'upcoming'
                             CHECK (status IN ('upcoming','ongoing','completed','cancelled')),
    cancel_reason TEXT,
    notes        TEXT,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT bookings_time_check CHECK (end_time > start_time)
  );
  `,
  `CREATE INDEX IF NOT EXISTS idx_bookings_asset_id   ON bookings(asset_id);`,
  `CREATE INDEX IF NOT EXISTS idx_bookings_booked_by  ON bookings(booked_by);`,
  `CREATE INDEX IF NOT EXISTS idx_bookings_start_time ON bookings(start_time);`,
  `CREATE INDEX IF NOT EXISTS idx_bookings_status     ON bookings(status);`,
  `
  DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_bookings_updated_at') THEN
      CREATE TRIGGER trg_bookings_updated_at
        BEFORE UPDATE ON bookings
        FOR EACH ROW EXECUTE FUNCTION set_updated_at();
    END IF;
  END; $$;
  `,

  // ─── 010 – maintenance_requests ─────────────────────────────────────────────
  `
  CREATE TABLE IF NOT EXISTS maintenance_requests (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    asset_id        UUID        NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
    raised_by       UUID        REFERENCES users(id) ON DELETE SET NULL,
    assigned_to     UUID        REFERENCES users(id) ON DELETE SET NULL,
    approved_by     UUID        REFERENCES users(id) ON DELETE SET NULL,
    issue_desc      TEXT        NOT NULL,
    priority        VARCHAR(10) NOT NULL DEFAULT 'medium'
                                CHECK (priority IN ('low','medium','high','critical')),
    status          VARCHAR(25) NOT NULL DEFAULT 'pending'
                                CHECK (status IN (
                                  'pending','approved','rejected',
                                  'technician_assigned','in_progress','resolved'
                                )),
    photo_url       TEXT,
    resolution_note TEXT,
    approved_at     TIMESTAMPTZ,
    assigned_at     TIMESTAMPTZ,
    resolved_at     TIMESTAMPTZ,
    rejection_note  TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
  `,
  `CREATE INDEX IF NOT EXISTS idx_maint_asset_id ON maintenance_requests(asset_id);`,
  `CREATE INDEX IF NOT EXISTS idx_maint_status   ON maintenance_requests(status);`,
  `
  DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_maintenance_updated_at') THEN
      CREATE TRIGGER trg_maintenance_updated_at
        BEFORE UPDATE ON maintenance_requests
        FOR EACH ROW EXECUTE FUNCTION set_updated_at();
    END IF;
  END; $$;
  `,

  // ─── 011 – audit_cycles ─────────────────────────────────────────────────────
  `
  CREATE TABLE IF NOT EXISTS audit_cycles (
    id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    title        VARCHAR(200) NOT NULL,
    scope_dept   UUID        REFERENCES departments(id) ON DELETE SET NULL,
    scope_location VARCHAR(150),
    start_date   DATE        NOT NULL,
    end_date     DATE        NOT NULL,
    status       VARCHAR(15) NOT NULL DEFAULT 'open'
                             CHECK (status IN ('open','closed')),
    created_by   UUID        REFERENCES users(id) ON DELETE SET NULL,
    closed_at    TIMESTAMPTZ,
    notes        TEXT,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT audit_date_check CHECK (end_date >= start_date)
  );
  `,
  `
  DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_audit_cycles_updated_at') THEN
      CREATE TRIGGER trg_audit_cycles_updated_at
        BEFORE UPDATE ON audit_cycles
        FOR EACH ROW EXECUTE FUNCTION set_updated_at();
    END IF;
  END; $$;
  `,

  // ─── 012 – audit_auditors (junction) ────────────────────────────────────────
  `
  CREATE TABLE IF NOT EXISTS audit_auditors (
    audit_id   UUID NOT NULL REFERENCES audit_cycles(id) ON DELETE CASCADE,
    user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    PRIMARY KEY (audit_id, user_id)
  );
  `,

  // ─── 013 – audit_items ──────────────────────────────────────────────────────
  `
  CREATE TABLE IF NOT EXISTS audit_items (
    id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    audit_id          UUID        NOT NULL REFERENCES audit_cycles(id) ON DELETE CASCADE,
    asset_id          UUID        NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
    expected_location VARCHAR(150),
    verification      VARCHAR(10) CHECK (verification IN ('verified','missing','damaged')),
    notes             TEXT,
    verified_by       UUID        REFERENCES users(id) ON DELETE SET NULL,
    verified_at       TIMESTAMPTZ,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (audit_id, asset_id)
  );
  `,
  `CREATE INDEX IF NOT EXISTS idx_audit_items_audit_id ON audit_items(audit_id);`,
  `
  DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_audit_items_updated_at') THEN
      CREATE TRIGGER trg_audit_items_updated_at
        BEFORE UPDATE ON audit_items
        FOR EACH ROW EXECUTE FUNCTION set_updated_at();
    END IF;
  END; $$;
  `,

  // ─── 014 – notifications ────────────────────────────────────────────────────
  `
  CREATE TABLE IF NOT EXISTS notifications (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type        VARCHAR(50) NOT NULL,
    title       VARCHAR(200) NOT NULL,
    message     TEXT        NOT NULL,
    entity_type VARCHAR(50),
    entity_id   UUID,
    is_read     BOOLEAN     NOT NULL DEFAULT false,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
  `,
  `CREATE INDEX IF NOT EXISTS idx_notif_user_id  ON notifications(user_id);`,
  `CREATE INDEX IF NOT EXISTS idx_notif_is_read  ON notifications(is_read);`,
  `CREATE INDEX IF NOT EXISTS idx_notif_created  ON notifications(created_at DESC);`,

  // ─── 015 – activity_logs ────────────────────────────────────────────────────
  `
  CREATE TABLE IF NOT EXISTS activity_logs (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id    UUID        REFERENCES users(id) ON DELETE SET NULL,
    actor_name  VARCHAR(100),
    action      VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50),
    entity_id   UUID,
    description TEXT,
    metadata    JSONB       DEFAULT '{}',
    ip_address  INET,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
  `,
  `CREATE INDEX IF NOT EXISTS idx_activity_actor   ON activity_logs(actor_id);`,
  `CREATE INDEX IF NOT EXISTS idx_activity_created ON activity_logs(created_at DESC);`,
  `CREATE INDEX IF NOT EXISTS idx_activity_entity  ON activity_logs(entity_type, entity_id);`,
];

(async () => {
  logger.info('Running migrations…');
  const client = await pool.connect();
  try {
    for (const sql of migrations) {
      await client.query(sql);
    }
    logger.info('All migrations completed successfully.');
  } catch (err) {
    logger.error('Migration failed', { error: err.message });
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
})();
