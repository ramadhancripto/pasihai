-- ══════════════════════════════════════════════════════════════
-- PASIHAI — 029: Profile Media (Avatar & Cover)
--
-- Ongeza cover_url kwenye profiles table.
-- Unda Storage bucket kwa profile media.
-- Weka RLS policies kwa upload/soma.
--
-- TABLES ZILIZOBAKIA: profiles (ALTER — ongeza cover_url)
-- STORAGE: profile-media bucket (mpya)
-- RLS: profiles SELECT public, UPDATE owner pekee
-- ══════════════════════════════════════════════════════════════

-- ── 1. Ongeza cover_url kwenye profiles ──────────────────────
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS cover_url text;

-- ── 2. Unda Storage bucket ───────────────────────────────────
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'profile-media',
  'profile-media',
  true,
  5242880, -- 5MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE SET
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

-- ── 3. RLS policies kwa Storage ──────────────────────────────
-- Mtu yeyote aweze kusoma profile media (public bucket)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'profile_media_select' AND tablename = 'objects'
  ) THEN
    CREATE POLICY "profile_media_select"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'profile-media');
  END IF;
END $$;

-- Mtumiaji aweze kupakia media yake mwenyewe
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'profile_media_insert' AND tablename = 'objects'
  ) THEN
    CREATE POLICY "profile_media_insert"
    ON storage.objects FOR INSERT
    WITH CHECK (
      bucket_id = 'profile-media'
      AND (storage.foldername(name))[1] = auth.uid()::text
    );
  END IF;
END $$;

-- Mtumiaji aweze kusasisha media yake mwenyewe
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'profile_media_update' AND tablename = 'objects'
  ) THEN
    CREATE POLICY "profile_media_update"
    ON storage.objects FOR UPDATE
    USING (
      bucket_id = 'profile-media'
      AND (storage.foldername(name))[1] = auth.uid()::text
    );
  END IF;
END $$;

-- Mtumiaji aweze kufuta media yake mwenyewe
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'profile_media_delete' AND tablename = 'objects'
  ) THEN
    CREATE POLICY "profile_media_delete"
    ON storage.objects FOR DELETE
    USING (
      bucket_id = 'profile-media'
      AND (storage.foldername(name))[1] = auth.uid()::text
    );
  END IF;
END $$;

-- ── 4. RLS kwa profiles — hakikisha cover_url inasomeka ──────
-- Profiles tayari ina RLS ya SELECT (public) — cover_url itapatikana
-- UPDATE policy tayari ipo — inaruhusu owner kubadilisha

COMMENT ON COLUMN profiles.cover_url IS 'URL ya cover/background ya profile (Supabase Storage)';