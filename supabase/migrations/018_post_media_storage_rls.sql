-- ══════════════════════════════════════════════════════════════
-- PASIHAI — Migration 018: private Storage for post media
-- Scope: picha/video zilizoambatanishwa na posts; si Status media.
-- Tumia migration hii kwenye Supabase kabla ya kuweka VITE_SUPABASE_MODE=live.
-- ══════════════════════════════════════════════════════════════

ALTER TABLE public.posts
  ADD COLUMN IF NOT EXISTS media_path TEXT;

CREATE INDEX IF NOT EXISTS idx_posts_media_path
  ON public.posts (media_path)
  WHERE media_path IS NOT NULL;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'pasihai-post-media',
  'pasihai-post-media',
  FALSE,
  52428800,
  ARRAY[
    'image/jpeg', 'image/png', 'image/webp', 'image/gif',
    'video/mp4', 'video/webm', 'video/quicktime'
  ]::TEXT[]
)
ON CONFLICT (id) DO UPDATE
SET name = EXCLUDED.name,
    public = FALSE,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS post_media_insert_own ON storage.objects;
CREATE POLICY post_media_insert_own
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'pasihai-post-media'
    AND (storage.foldername(name))[1] = auth.uid()::TEXT
  );

DROP POLICY IF EXISTS post_media_select_visible ON storage.objects;
CREATE POLICY post_media_select_visible
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'pasihai-post-media'
    AND (
      -- Mmiliki anaweza kusaini media mara baada ya upload, kabla ya INSERT ya post.
      (storage.foldername(name))[1] = auth.uid()::TEXT
      OR EXISTS (
        SELECT 1
        FROM public.posts AS p
        WHERE p.media_path = storage.objects.name
          AND p.deleted_at IS NULL
          AND can_see_post(p)
          AND NOT is_blocked_by(auth.uid(), p.author_id)
      )
    )
  );

DROP POLICY IF EXISTS post_media_delete_own ON storage.objects;
CREATE POLICY post_media_delete_own
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'pasihai-post-media'
    AND (storage.foldername(name))[1] = auth.uid()::TEXT
  );
