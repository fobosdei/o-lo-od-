-- ╔═══════════════════════════════════════════════════════════════════════╗
-- ║  VAULT — Migration: Add TOTP entries table                           ║
-- ║  Ejecuta este SQL en: Supabase Dashboard → SQL Editor                ║
-- ╚═══════════════════════════════════════════════════════════════════════╝

-- ─── totp_entries ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.totp_entries (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Plaintext metadata
  issuer            TEXT NOT NULL,
  account           TEXT NOT NULL,
  digits            INTEGER NOT NULL DEFAULT 6 CHECK (digits IN (6, 8)),
  period            INTEGER NOT NULL DEFAULT 30 CHECK (period IN (30, 60)),
  category          TEXT NOT NULL DEFAULT 'other'
                    CHECK (category IN ('google','microsoft','github','social','bank','work','email','other')),
  icon              TEXT,

  -- Encrypted TOTP secret (AES-256-GCM)
  encrypted_secret  TEXT NOT NULL,
  iv_secret         TEXT NOT NULL,

  is_favorite       BOOLEAN NOT NULL DEFAULT FALSE,

  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_totp_user_id   ON public.totp_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_totp_category  ON public.totp_entries(user_id, category);
CREATE INDEX IF NOT EXISTS idx_totp_favorites ON public.totp_entries(user_id, is_favorite);

-- Enable RLS
ALTER TABLE public.totp_entries ENABLE ROW LEVEL SECURITY;

-- Policies
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

-- Auto-update trigger (reuses existing update_updated_at function)
CREATE TRIGGER trigger_totp_updated_at
  BEFORE UPDATE ON public.totp_entries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
