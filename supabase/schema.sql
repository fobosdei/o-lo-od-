-- ╔═══════════════════════════════════════════════════════════════════════╗
-- ║  VAULT — Supabase Database Schema                                     ║
-- ║  Ejecuta este SQL en: Supabase Dashboard → SQL Editor                 ║
-- ╚═══════════════════════════════════════════════════════════════════════╝

-- ─── Extensions ───────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─── user_profiles ────────────────────────────────────────────────────────────
-- Stores per-user master salt (used to derive encryption key client-side)
-- The salt is NOT secret — it just ensures different users get different keys

CREATE TABLE IF NOT EXISTS public.user_profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email       TEXT NOT NULL,
  master_salt TEXT NOT NULL,           -- Base64 16-byte random salt
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.user_profiles IS 'User profile with encryption salt';
COMMENT ON COLUMN public.user_profiles.master_salt IS 'Random base64 salt for PBKDF2 key derivation. Not secret.';

-- ─── credentials ──────────────────────────────────────────────────────────────
-- Stores AES-256-GCM encrypted credential data
-- Plaintext NEVER stored — all sensitive fields are encrypted client-side

CREATE TABLE IF NOT EXISTS public.credentials (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Plaintext metadata (visible in DB, not sensitive)
  title               TEXT NOT NULL,
  category            TEXT NOT NULL DEFAULT 'general'
                      CHECK (category IN ('general','redes_sociales','banco','trabajo','email','juegos','otro')),
  is_favorite         BOOLEAN NOT NULL DEFAULT FALSE,

  -- Encrypted fields (AES-256-GCM ciphertext — base64)
  encrypted_password  TEXT NOT NULL,   -- Required
  iv                  TEXT NOT NULL,   -- 12-byte IV for password encryption

  encrypted_username  TEXT,            -- Optional
  iv_username         TEXT,

  encrypted_url       TEXT,            -- Optional
  iv_url              TEXT,

  encrypted_notes     TEXT,            -- Optional
  iv_notes            TEXT,

  -- Timestamps
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.credentials IS 'AES-256-GCM encrypted credential store';
COMMENT ON COLUMN public.credentials.encrypted_password IS 'AES-256-GCM ciphertext (base64). Decryptable only with user master key.';
COMMENT ON COLUMN public.credentials.iv IS 'Unique 96-bit GCM initialization vector per credential (base64).';

-- Index for user queries
CREATE INDEX IF NOT EXISTS idx_credentials_user_id ON public.credentials(user_id);
CREATE INDEX IF NOT EXISTS idx_credentials_category ON public.credentials(user_id, category);
CREATE INDEX IF NOT EXISTS idx_credentials_updated ON public.credentials(user_id, updated_at DESC);

-- ─── audit_logs ───────────────────────────────────────────────────────────────
-- Immutable security event log (append-only)

CREATE TABLE IF NOT EXISTS public.audit_logs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  credential_id   UUID,             -- Not FK to allow logs after deletion
  action          TEXT NOT NULL
                  CHECK (action IN (
                    'create', 'update', 'delete',
                    'copy_password', 'copy_username',
                    'view_password', 'login', 'logout',
                    'lock', 'unlock'
                  )),
  ip_address      TEXT,
  user_agent      TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON public.audit_logs(user_id, created_at DESC);

-- ─── Row Level Security (RLS) ─────────────────────────────────────────────────
-- CRITICAL: Users can ONLY see and modify their OWN data

ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credentials   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs    ENABLE ROW LEVEL SECURITY;

-- user_profiles: only own profile
CREATE POLICY "Users can view own profile"
  ON public.user_profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.user_profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Service role can insert profiles"
  ON public.user_profiles FOR INSERT
  WITH CHECK (auth.uid() = id OR auth.role() = 'service_role');

-- credentials: full CRUD only on own data
CREATE POLICY "Users can view own credentials"
  ON public.credentials FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own credentials"
  ON public.credentials FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own credentials"
  ON public.credentials FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own credentials"
  ON public.credentials FOR DELETE
  USING (auth.uid() = user_id);

-- audit_logs: users can only view their own logs, never delete them
CREATE POLICY "Users can view own audit logs"
  ON public.audit_logs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can insert audit logs"
  ON public.audit_logs FOR INSERT
  WITH CHECK (auth.role() = 'service_role' OR auth.uid() = user_id);

-- ─── Triggers ─────────────────────────────────────────────────────────────────

-- Auto-update updated_at on user_profiles
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_profiles_updated_at
  BEFORE UPDATE ON public.user_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trigger_credentials_updated_at
  BEFORE UPDATE ON public.credentials
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Validate that IV is provided for each encrypted field
CREATE OR REPLACE FUNCTION validate_credential_ivs()
RETURNS TRIGGER AS $$
BEGIN
  -- Password IV is always required
  IF NEW.encrypted_password IS NOT NULL AND NEW.iv IS NULL THEN
    RAISE EXCEPTION 'IV is required for encrypted_password';
  END IF;
  -- Username IV required if username provided
  IF NEW.encrypted_username IS NOT NULL AND NEW.iv_username IS NULL THEN
    RAISE EXCEPTION 'IV is required for encrypted_username';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_validate_ivs
  BEFORE INSERT OR UPDATE ON public.credentials
  FOR EACH ROW EXECUTE FUNCTION validate_credential_ivs();

-- ─── totp_entries ─────────────────────────────────────────────────────────────
-- Stores TOTP authenticator entries with AES-256-GCM encrypted secret
-- The TOTP secret is the only sensitive field — all others are plaintext metadata

CREATE TABLE IF NOT EXISTS public.totp_entries (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Plaintext metadata
  issuer            TEXT NOT NULL,             -- e.g. "Google", "GitHub"
  account           TEXT NOT NULL,             -- e.g. "user@email.com"
  digits            INTEGER NOT NULL DEFAULT 6 CHECK (digits IN (6, 8)),
  period            INTEGER NOT NULL DEFAULT 30 CHECK (period IN (30, 60)),
  category          TEXT NOT NULL DEFAULT 'other'
                    CHECK (category IN ('google','microsoft','github','social','bank','work','email','other')),
  icon              TEXT,                       -- custom emoji override

  -- Encrypted TOTP secret (AES-256-GCM)
  encrypted_secret  TEXT NOT NULL,             -- base64 ciphertext
  iv_secret         TEXT NOT NULL,             -- base64 12-byte IV

  is_favorite       BOOLEAN NOT NULL DEFAULT FALSE,

  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.totp_entries IS 'TOTP authenticator entries — secret encrypted with user master key';
COMMENT ON COLUMN public.totp_entries.encrypted_secret IS 'AES-256-GCM ciphertext of TOTP base32 secret. Only decryptable with user master key.';

-- Indexes
CREATE INDEX IF NOT EXISTS idx_totp_user_id       ON public.totp_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_totp_category      ON public.totp_entries(user_id, category);
CREATE INDEX IF NOT EXISTS idx_totp_favorites     ON public.totp_entries(user_id, is_favorite);

-- RLS
ALTER TABLE public.totp_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own totp entries"
  ON public.totp_entries FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own totp entries"
  ON public.totp_entries FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own totp entries"
  ON public.totp_entries FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own totp entries"
  ON public.totp_entries FOR DELETE
  USING (auth.uid() = user_id);

-- Auto-update trigger
CREATE TRIGGER trigger_totp_updated_at
  BEFORE UPDATE ON public.totp_entries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ─── Views ────────────────────────────────────────────────────────────────────

-- Vault health view (no sensitive data)
CREATE OR REPLACE VIEW public.vault_health AS
  SELECT
    user_id,
    COUNT(*) AS total,
    COUNT(*) FILTER (WHERE is_favorite) AS favorites,
    COUNT(*) FILTER (WHERE category = 'banco') AS bank_count,
    COUNT(*) FILTER (WHERE updated_at < NOW() - INTERVAL '1 year') AS outdated,
    COUNT(*) FILTER (WHERE updated_at > NOW() - INTERVAL '3 months') AS recent,
    MAX(updated_at) AS last_updated
  FROM public.credentials
  GROUP BY user_id;

-- ─── Final Verification ───────────────────────────────────────────────────────
-- Run this to verify setup:
-- SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';
-- SELECT schemaname, tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public';
