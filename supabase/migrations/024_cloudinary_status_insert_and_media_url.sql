-- ══════════════════════════════════════════════════════════════
-- PASIHAI — Migration 024: Cloudinary media kwa Status na Posts
--
-- TATIZO (limethibitishwa kwenye local PostgREST):
--   statuses_insert_own (017) inakubali media ya status kwa media_path tu
--   (Supabase Storage). Status ya Cloudinary (media_url=secure_url, media_path=NULL)
--   inakataliwa na RLS: "Huna ruhusa ya kufanya operesheni hii".
--   statuses_content_check (017) TAYARI inakubali muundo huo.
--
-- SULUHISHO:
--   1) statuses_insert_own: ongeza tawi la Cloudinary. Inakubali media_url ya
--      cloud yetu tu (https://res.cloudinary.com/noropw5y/{image|video}/upload/...).
--   2) posts: CHECK ya media_url inakubali NULL au URL ya cloud yetu tu.
--      NOT VALID: inatumika kwa safu mpya/zilizobadilishwa; haisomi data ya zamani
--      kiotomatiki. VALIDATE hufanywa baadaye, kwa mpango ulioidhinishwa.
--
-- Hakuna jedwali au data inayofutwa. Jina la cloud limewekwa hapa kwa makusudi:
-- likibadilika, migration mpya inahitajika.
-- ══════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS "statuses_insert_own" ON public.statuses;
CREATE POLICY "statuses_insert_own"
  ON public.statuses FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND expires_at > now()
    AND expires_at <= now() + interval '24 hours'
    AND (
      -- Maandishi pekee
      (
        media_path IS NULL
        AND media_url IS NULL
        AND media_type IS NULL
        AND NULLIF(BTRIM(text), '') IS NOT NULL
      )
      -- Supabase Storage (njia ya zamani; folder ya mmiliki)
      OR (
        media_path IS NOT NULL
        AND media_url IS NULL
        AND media_type IN ('image', 'video')
        AND split_part(media_path, '/', 1) = auth.uid()::text
      )
      -- Cloudinary (URL ya cloud yetu pekee)
      OR (
        media_path IS NULL
        AND media_url ~ '^https://res\.cloudinary\.com/noropw5y/(image|video)/upload/'
        AND media_type IN ('image', 'video')
      )
    )
  );

ALTER TABLE public.posts
  DROP CONSTRAINT IF EXISTS posts_media_url_own_cloudinary;
ALTER TABLE public.posts
  ADD CONSTRAINT posts_media_url_own_cloudinary
  CHECK (media_url IS NULL OR media_url ~ '^https://res\.cloudinary\.com/noropw5y/(image|video)/upload/')
  NOT VALID;

-- ROLLBACK (kwa mpango ulioidhinishwa tu):
--   ALTER TABLE public.posts DROP CONSTRAINT IF EXISTS posts_media_url_own_cloudinary;
--   Rudisha statuses_insert_own kutoka 017_status_media_storage_rls.sql.
