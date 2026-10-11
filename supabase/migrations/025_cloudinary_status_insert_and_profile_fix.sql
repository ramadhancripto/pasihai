-- ══════════════════════════════════════════════════════════════
-- PASIHAI — Migration 025: Cloudinary Status Insert + Profile Upsert
--
-- Tatizo 1: statuses_insert_own RLS policy (017) inazuia media_url
-- yoyote isiyo NULL. Cloudinary inatuma media_url = 'https://res.cloudinary.com/...'
-- na media_path = NULL. RLS inakataa → HTTP 409.
--
-- Suluhisho: Ongeza kesi ya tatu kwenye RLS policy — Cloudinary URL
-- inayoruhusiwa wakati media_url inaanza na 'https://res.cloudinary.com/'
-- na media_path ni NULL.
--
-- Tatizo 2: handle_new_user trigger inaweza kutokuwepo au kushindwa.
-- Profile haipo → .single() returns 406 → getCurrentUser = null → UI imefichwa.
--
-- Suluhisho: Hakikisha trigger ipo. Ongeza function ya kujenga profile
-- kama njia ya pili (fallback) pale trigger iliposhindwa.
--
-- SALAMA: DROP POLICY IF EXISTS + CREATE POLICY = idempotent.
--         CREATE OR REPLACE FUNCTION = idempotent.
--         CREATE TRIGGER IF NOT EXISTS (Postgres 14+) = idempotent.
--         Haifuti data yoyote.
-- ══════════════════════════════════════════════════════════════

-- ── FIX 1: statuses RLS — ongeza Cloudinary case ──────────────
DROP POLICY IF EXISTS "statuses_insert_own" ON public.statuses;

CREATE POLICY "statuses_insert_own"
  ON public.statuses FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND expires_at > now()
    AND expires_at <= now() + interval '24 hours'
    AND (
      -- CASE 1: Text-only status (no media)
      (
        media_path IS NULL
        AND media_url IS NULL
        AND media_type IS NULL
        AND NULLIF(BTRIM(text), '') IS NOT NULL
      )
      OR
      -- CASE 2: Media via Supabase Storage (private bucket)
      (
        media_path IS NOT NULL
        AND media_url IS NULL
        AND media_type IN ('image', 'video')
        AND split_part(media_path, '/', 1) = auth.uid()::text
      )
      OR
      -- CASE 3: Media via Cloudinary (external URL)
      (
        media_path IS NULL
        AND media_url IS NOT NULL
        AND media_url LIKE 'https://res.cloudinary.com/%'
        AND media_type IN ('image', 'video')
      )
    )
  );

-- ── FIX 2: Hakikisha handle_new_user trigger ipo ─────────────
-- (Inaweza kukosekana kama profiles table iliundwa bila trigger)
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_username TEXT;
  v_display TEXT;
BEGIN
  v_username := regexp_replace(
    lower(COALESCE(NEW.raw_user_meta_data->>'username', 'user_' || substr(replace(NEW.id::text, '-', ''), 1, 8))),
    '[^a-z0-9._]', '', 'g'
  );
  IF char_length(v_username) < 3 THEN
    v_username := v_username || substr(replace(NEW.id::text, '-', ''), 1, 3);
  END IF;
  v_username := left(v_username, 30);
  IF EXISTS (SELECT 1 FROM profiles WHERE username = v_username) THEN
    v_username := left(v_username, 25) || '_' || substr(md5(random()::text), 1, 4);
  END IF;

  v_display := left(
    COALESCE(
      NEW.raw_user_meta_data->>'display_name',
      COALESCE(NEW.raw_user_meta_data->>'full_name', 'Mtumiaji Mpya')
    ),
    60
  );

  INSERT INTO profiles (user_id, username, display_name, avatar_tone)
  VALUES (NEW.id, v_username, v_display, 'green')
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate trigger (idempotent on Postgres 14+)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ── FIX 3: Function ya kujenga profile kama fallback ──────────
-- getCurrentUser() inaitumia pale profile row inapokosekana
-- (trigger haikufanya kazi au profile ilifutwa kimakosa).
CREATE OR REPLACE FUNCTION ensure_profile(p_user_id UUID)
RETURNS profiles AS $$
DECLARE
  v_profile profiles%ROWTYPE;
  v_auth_user RECORD;
  v_username TEXT;
  v_display TEXT;
BEGIN
  -- Kama profile tayari ipo, rudisha
  SELECT * INTO v_profile FROM profiles WHERE user_id = p_user_id;
  IF FOUND THEN RETURN v_profile; END IF;

  -- Profile haipo — unda kutoka auth.users metadata
  SELECT id, raw_user_meta_data, email
  INTO v_auth_user
  FROM auth.users WHERE id = p_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'User % haipo kwenye auth.users', p_user_id;
  END IF;

  v_username := regexp_replace(
    lower(COALESCE(v_auth_user.raw_user_meta_data->>'username',
      'user_' || substr(replace(v_auth_user.id::text, '-', ''), 1, 8))),
    '[^a-z0-9._]', '', 'g'
  );
  IF char_length(v_username) < 3 THEN
    v_username := v_username || substr(replace(v_auth_user.id::text, '-', ''), 1, 3);
  END IF;
  v_username := left(v_username, 30);
  IF EXISTS (SELECT 1 FROM profiles WHERE username = v_username) THEN
    v_username := left(v_username, 25) || '_' || substr(md5(random()::text), 1, 4);
  END IF;

  v_display := left(
    COALESCE(
      v_auth_user.raw_user_meta_data->>'display_name',
      COALESCE(v_auth_user.raw_user_meta_data->>'full_name', 'Mtumiaji Mpya')
    ),
    60
  );

  INSERT INTO profiles (user_id, username, display_name, avatar_tone)
  VALUES (p_user_id, v_username, v_display, 'green')
  ON CONFLICT (user_id) DO NOTHING;

  SELECT * INTO v_profile FROM profiles WHERE user_id = p_user_id;
  RETURN v_profile;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;