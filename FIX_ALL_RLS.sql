-- ══════════════════════════════════════════════════════════════
-- PASIHAI — FIX KAMILI: Endesha hii KABISA kwenye Supabase SQL Editor
--
-- Itatatua MASUALOTEKUNDU YOTE ya RLS kwa mpigo mmoja:
-- 1. chat_conversations INSERT (42501)
-- 2. chat_participants INSERT
-- 3. profile_media storage RLS (029)
-- 4. is_chat_member function overload
-- ══════════════════════════════════════════════════════════════

-- ══════════════════════════════════════════════════════════════
-- SEHEMU 1: Fix is_chat_member function
-- ══════════════════════════════════════════════════════════════

DROP FUNCTION IF EXISTS public.is_chat_member(UUID);

CREATE OR REPLACE FUNCTION public.is_chat_member(
  p_conversation_id UUID,
  p_user_id UUID DEFAULT auth.uid()
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM chat_participants
    WHERE conversation_id = p_conversation_id
      AND user_id = p_user_id
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_chat_member(UUID, UUID) TO authenticated;


-- ══════════════════════════════════════════════════════════════
-- SEHEMU 2: Fix chat_conversations RLS
-- ══════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS "conversations_insert_auth" ON chat_conversations;
DROP POLICY IF EXISTS "chat_conversations_insert" ON chat_conversations;
DROP POLICY IF EXISTS "allow_insert" ON chat_conversations;
DROP POLICY IF EXISTS "conversations_select_participant" ON chat_conversations;
DROP POLICY IF EXISTS "conversations_update_participant" ON chat_conversations;
DROP POLICY IF EXISTS "conversations_delete_creator" ON chat_conversations;

CREATE POLICY "conversations_insert_auth"
  ON chat_conversations FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL AND (created_by = auth.uid() OR created_by IS NULL));

CREATE POLICY "conversations_select_participant"
  ON chat_conversations FOR SELECT TO authenticated
  USING (is_chat_member(chat_conversations.id));

CREATE POLICY "conversations_update_participant"
  ON chat_conversations FOR UPDATE TO authenticated
  USING (is_chat_member(chat_conversations.id));

CREATE POLICY "conversations_delete_creator"
  ON chat_conversations FOR DELETE TO authenticated
  USING (created_by = auth.uid());


-- ══════════════════════════════════════════════════════════════
-- SEHEMU 3: Fix chat_participants RLS
-- ══════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS "participants_insert_creator" ON chat_participants;
DROP POLICY IF EXISTS "participants_update_own" ON chat_participants;

CREATE POLICY "participants_insert_creator"
  ON chat_participants FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM chat_conversations WHERE id = conversation_id AND created_by = auth.uid())
  );

CREATE POLICY "participants_update_own"
  ON chat_participants FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);


-- ══════════════════════════════════════════════════════════════
-- SEHEMU 4: Fix profile_media storage RLS
-- ══════════════════════════════════════════════════════════════

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS cover_url text;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('profile-media', 'profile-media', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
ON CONFLICT (id) DO UPDATE SET file_size_limit = 5242880, allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'profile_media_select' AND tablename = 'objects' AND schemaname = 'storage') THEN
    CREATE POLICY "profile_media_select" ON storage.objects FOR SELECT USING (bucket_id = 'profile-media');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'profile_media_insert' AND tablename = 'objects' AND schemaname = 'storage') THEN
    CREATE POLICY "profile_media_insert" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'profile-media' AND (storage.foldername(name))[1] = auth.uid()::text);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'profile_media_update' AND tablename = 'objects' AND schemaname = 'storage') THEN
    CREATE POLICY "profile_media_update" ON storage.objects FOR UPDATE USING (bucket_id = 'profile-media' AND (storage.foldername(name))[1] = auth.uid()::text);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'profile_media_delete' AND tablename = 'objects' AND schemaname = 'storage') THEN
    CREATE POLICY "profile_media_delete" ON storage.objects FOR DELETE USING (bucket_id = 'profile-media' AND (storage.foldername(name))[1] = auth.uid()::text);
  END IF;
END $$;


-- ══════════════════════════════════════════════════════════════
-- SEHEMU 5: Verify — hakikisha kila kitu kinafanya kazi
-- ══════════════════════════════════════════════════════════════

SELECT '=== POLICIES ===' as info;
SELECT schemaname, tablename, policyname, cmd
FROM pg_policies
WHERE tablename IN ('chat_conversations', 'chat_participants')
   OR (tablename = 'objects' AND policyname LIKE 'profile_media_%')
ORDER BY tablename, policyname;

SELECT '=== FUNCTIONS ===' as info;
SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_name = 'is_chat_member';

SELECT '=== DONE ===' as info;