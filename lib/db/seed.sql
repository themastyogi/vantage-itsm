-- Vantage ITSM — full schema + demo seed data
-- Run this once in Neon's web SQL Editor (Neon dashboard → SQL Editor → paste → Run)
-- No local database client needed.

-- pgcrypto gives us crypt()/gen_salt(), which produces bcrypt-format hashes
-- ($2a$...) compatible with the bcryptjs verification used by the app.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ---------- Enums ----------
DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('admin', 'agent', 'approver', 'requester');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE incident_status AS ENUM ('new', 'acknowledged', 'in_progress', 'resolved', 'closed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE priority_level AS ENUM ('low', 'medium', 'high', 'critical');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE change_status AS ENUM ('draft', 'pending_approval', 'approved', 'rejected', 'scheduled', 'implemented', 'closed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE risk_level AS ENUM ('low', 'medium', 'high');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE approval_decision AS ENUM ('approved', 'rejected');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE asset_type AS ENUM ('server', 'workstation', 'network_device', 'application', 'license', 'other');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE asset_status AS ENUM ('in_use', 'in_stock', 'under_maintenance', 'retired');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE notification_channel AS ENUM ('teams', 'email');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE notification_status AS ENUM ('sent', 'failed', 'skipped');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ---------- Tables ----------
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role user_role NOT NULL DEFAULT 'requester',
  teams_webhook_opt_in BOOLEAN NOT NULL DEFAULT TRUE,
  email_opt_in BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS incidents (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  status incident_status NOT NULL DEFAULT 'new',
  priority priority_level NOT NULL DEFAULT 'medium',
  asset_id TEXT,
  reporter_id TEXT NOT NULL,
  assignee_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS changes (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  risk_level risk_level NOT NULL DEFAULT 'medium',
  status change_status NOT NULL DEFAULT 'draft',
  requester_id TEXT NOT NULL,
  approver_id TEXT,
  asset_id TEXT,
  scheduled_for TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS change_approvals (
  id TEXT PRIMARY KEY,
  change_id TEXT NOT NULL,
  approver_id TEXT NOT NULL,
  decision approval_decision NOT NULL,
  comment TEXT,
  decided_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS assets (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type asset_type NOT NULL DEFAULT 'other',
  status asset_status NOT NULL DEFAULT 'in_use',
  owner TEXT,
  location TEXT,
  serial_number TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  channel notification_channel NOT NULL,
  event TEXT NOT NULL,
  recipient TEXT NOT NULL,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  status notification_status NOT NULL,
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  actor_id TEXT,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  metadata TEXT,
  ip_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------- Demo seed data ----------
-- Password for all four demo accounts: Passw0rd!123
-- (hashed here with pgcrypto so the plaintext is never stored)
INSERT INTO users (id, name, email, password_hash, role) VALUES
  (gen_random_uuid()::text, 'Ava Admin',     'admin@demo.itsm',     crypt('Passw0rd!123', gen_salt('bf', 12)), 'admin'),
  (gen_random_uuid()::text, 'Raj Agent',     'agent@demo.itsm',     crypt('Passw0rd!123', gen_salt('bf', 12)), 'agent'),
  (gen_random_uuid()::text, 'Priya Approver','approver@demo.itsm',  crypt('Passw0rd!123', gen_salt('bf', 12)), 'approver'),
  (gen_random_uuid()::text, 'Chen Requester','requester@demo.itsm', crypt('Passw0rd!123', gen_salt('bf', 12)), 'requester')
ON CONFLICT (email) DO NOTHING;

INSERT INTO assets (id, name, type, status, owner, location) VALUES
  (gen_random_uuid()::text, 'PROD-DB-01',              'server',         'in_use',            'Raj Agent', 'Mumbai DC'),
  (gen_random_uuid()::text, 'Finance ERP License Pool','license',        'in_use',            'Ava Admin', 'Cloud'),
  (gen_random_uuid()::text, 'NW-SWITCH-CORE-2',        'network_device', 'under_maintenance', 'Raj Agent', 'Kanpur HQ')
ON CONFLICT DO NOTHING;
