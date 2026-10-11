-- ══════════════════════════════════════════════════════════════
-- PASIHAI — Migration 017: text-first statuses + private media
--
-- Additive migration for the Status flow. It preserves existing rows
-- and legacy media_url values; no hosted database is changed here.
-- Dependency: statuses (015), profiles/follows (001/002), Supabase Storage.
-- ══════════════════════════════════════════════════════════════

ALTER TABLE public.statuses
  ALTER COLUMN media_url DROP NOT NULL,
  ALTER COLUMN media_type DROP NOT NULL;

ALTER TABLE public.statuses
  ADD COLUMN IF NOT EXISTS media_path TEXT,
  ADD COLUMN IF NOT EXISTS tone TEXT NOT NULL DEFAULT 'green';

ALTER TABLE public.statuses
  ALTER COLUMN expires_at SET DEFAULT (now() + interval '24 hours');

-- `now()` is not IMMUTABLE, so it cannot appear in an index predicate.
-- Expiration remains enforced by read queries and RLS.
DROP INDEX IF EXISTS public.idx_statuses_user;
CREATE INDEX idx_statuses_user ON public.statuses(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_statuses_expires ON public.statuses(expires_at);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'statuses_tone_check'
      AND conrelid = 'public.statuses'::regclass
  ) THEN
    ALTER TABLE public.statuses
      ADD CONSTRAINT statuses_tone_check
      CHECK (tone IN ('green', 'blue', 'gold', 'plum'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'statuses_text_length_check'
      AND conrelid = 'public.statuses'::regclass
  ) THEN
    ALTER TABLE public.statuses
      ADD CONSTRAINT statuses_text_length_check
      CHECK (text IS NULL OR char_length(text) <= 500);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'statuses_content_check'
      AND conrelid = 'public.statuses'::regclass
  ) THEN
    ALTER TABLE public.statuses
      ADD CONSTRAINT statuses_content_check
      CHECK (
        (
          media_path IS NULL
          AND media_url IS NULL
          AND media_type IS NULL
          AND NULLIF(BTRIM(text), '') IS NOT NULL
        )
        OR (
          media_path IS NOT NULL
          AND media_url IS NULL
          AND media_type IN ('image', 'video')
        )
        OR (
          media_path IS NULL
          AND media_url IS NOT NULL
          AND media_type IN ('image', 'video')
        )
      );
  END IF;
END $$;

ALTER TABLE public.statuses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.statuses FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "statuses_select_followers" ON public.statuses;
CREATE POLICY "statuses_select_followers"
  ON public.statuses FOR SELECT TO authenticated
  USING (
    expires_at > now()
    AND (
      user_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM public.follows AS f
        WHERE f.follower_id = auth.uid()
          AND f.followee_id = statuses.user_id
      )
    )
  );

DROP POLICY IF EXISTS "statuses_insert_own" ON public.statuses;
CREATE POLICY "statuses_insert_own"
  ON public.statuses FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND expires_at > now()
    AND expires_at <= now() + interval '24 hours'
    AND (
      (
        media_path IS NULL
        AND media_url IS NULL
        AND media_type IS NULL
        AND NULLIF(BTRIM(text), '') IS NOT NULL
      )
      OR (
        media_path IS NOT NULL
        AND media_url IS NULL
        AND media_type IN ('image', 'video')
        AND split_part(media_path, '/', 1) = auth.uid()::text
      )
    )
  );

DROP POLICY IF EXISTS "statuses_delete_own" ON public.statuses;
CREATE POLICY "statuses_delete_own"
  ON public.statuses FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- Dedicated private bucket for status media (25 MiB max).
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'pasihai-status-media',
  'pasihai-status-media',
  FALSE,
  26214400,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif',
        'video/mp4', 'video/webm', 'video/quicktime']
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  public = FALSE,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "status_media_insert_own_folder" ON storage.objects;
CREATE POLICY "status_media_insert_own_folder"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'pasihai-status-media'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- A media object is readable only while an active, visible status row references it.
-- Signed URL expiry in the client is capped at the status expiry timestamp.
DROP POLICY IF EXISTS "status_media_select_active_visible" ON storage.objects;
CREATE POLICY "status_media_select_active_visible"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'pasihai-status-media'
    AND EXISTS (
      SELECT 1 FROM public.statuses AS s
      WHERE s.media_path = storage.objects.name
        AND s.expires_at > now()
        AND (
          s.user_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM public.follows AS f
            WHERE f.follower_id = auth.uid()
              AND f.followee_id = s.user_id
          )
        )
    )
  );

-- Status deletion removes the row first. This policy then allows cleanup of
-- the owner's unreferenced object, but prevents deleting media still in use.
DROP POLICY IF EXISTS "status_media_delete_unreferenced_own" ON storage.objects;
CREATE POLICY "status_media_delete_unreferenced_own"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'pasihai-status-media'
    AND (storage.foldername(name))[1] = auth.uid()::text
    AND NOT EXISTS (
      SELECT 1 FROM public.statuses AS s
      WHERE s.media_path = storage.objects.name
    )
  );
