-- ══════════════════════════════════════════════════════════════
-- PASIHAI — PRODUCTION SCHEMA INSPECTION
--
-- Endesha SQL hii kwenye Supabase Dashboard → SQL Editor
-- KABLA ya kuendesha PASIHAI_FULL_MIGRATION.sql
--
-- Hii SQL ni READ-ONLY — haibadilishi chochote.
-- Inakuonyesha exactly ni tables zipi zipo na zipi hazipo.
-- ══════════════════════════════════════════════════════════════

-- ── 1. Table Existence Check ──────────────────────────────────
-- Angalia ni tables zipi za Pasihai zilizopo kwenye public schema

SELECT
  expected.table_name,
  CASE WHEN t.table_name IS NOT NULL THEN '✅ EXISTS' ELSE '❌ MISSING' END AS status
FROM (
  VALUES
    ('profiles'),
    ('follows'),
    ('posts'),
    ('reactions'),
    ('bookmarks'),
    ('hidden_items'),
    ('friendships'),
    ('blocks'),
    ('comments'),
    ('poll_options'),
    ('poll_votes'),
    ('shares'),
    ('chat_conversations'),
    ('chat_participants'),
    ('chat_messages'),
    ('notifications'),
    ('spaces'),
    ('space_members'),
    ('space_posts'),
    ('live_sessions'),
    ('statuses'),
    ('reports')
) AS expected(table_name)
LEFT JOIN information_schema.tables t
  ON t.table_name = expected.table_name
  AND t.table_schema = 'public'
ORDER BY expected.table_name;

-- ── 2. Column Count per Table ─────────────────────────────────
-- Angalia columns ngapi kila table ina

SELECT
  c.table_name,
  COUNT(*) AS column_count
FROM information_schema.columns c
WHERE c.table_schema = 'public'
  AND c.table_name IN (
    'profiles', 'follows', 'posts', 'reactions', 'bookmarks',
    'hidden_items', 'friendships', 'blocks', 'comments',
    'poll_options', 'poll_votes', 'shares',
    'chat_conversations', 'chat_participants', 'chat_messages',
    'notifications', 'spaces', 'space_members', 'space_posts',
    'live_sessions', 'statuses', 'reports'
  )
GROUP BY c.table_name
ORDER BY c.table_name;

-- ── 3. RLS Status ─────────────────────────────────────────────
-- Angalia kama RLS imewashwa kwenye kila table

SELECT
  schemaname,
  tablename,
  rowsecurity AS rls_enabled,
  forcerowsecurity AS rls_forced
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN (
    'profiles', 'follows', 'posts', 'reactions', 'bookmarks',
    'hidden_items', 'friendships', 'blocks', 'comments',
    'poll_options', 'poll_votes', 'shares',
    'chat_conversations', 'chat_participants', 'chat_messages',
    'notifications', 'spaces', 'space_members', 'space_posts',
    'live_sessions', 'statuses', 'reports'
  )
ORDER BY tablename;

-- ── 4. RLS Policy Count ───────────────────────────────────────
-- Angalia policies ngapi kila table ina

SELECT
  schemaname,
  tablename,
  COUNT(*) AS policy_count
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN (
    'profiles', 'follows', 'posts', 'reactions', 'bookmarks',
    'hidden_items', 'friendships', 'blocks', 'comments',
    'poll_options', 'poll_votes', 'shares',
    'chat_conversations', 'chat_participants', 'chat_messages',
    'notifications', 'spaces', 'space_members', 'space_posts',
    'live_sessions', 'statuses', 'reports'
  )
GROUP BY schemaname, tablename
ORDER BY tablename;

-- ── 5. Functions ──────────────────────────────────────────────
-- Angalia functions zilizopo

SELECT
  routine_name,
  routine_type,
  security_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN (
    'set_updated_at',
    'handle_new_user',
    'update_follow_counts',
    'can_see_post',
    'is_blocked_by',
    'protect_post_counts',
    'update_reaction_count',
    'update_friends_count',
    'update_comment_count',
    'update_poll_votes_count',
    'update_share_count',
    'update_conversation_timestamp',
    'get_unread_count'
  )
ORDER BY routine_name;

-- ── 6. Triggers ───────────────────────────────────────────────
-- Angalia triggers zilizopo kwenye public schema

SELECT
  trigger_name,
  event_object_table,
  action_timing,
  event_manipulation
FROM information_schema.triggers
WHERE trigger_schema = 'public'
ORDER BY event_object_table, trigger_name;

-- ── 7. Indexes ────────────────────────────────────────────────
-- Angalia custom indexes (si primary keys)

SELECT
  indexname,
  tablename
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN (
    'profiles', 'follows', 'posts', 'reactions', 'bookmarks',
    'hidden_items', 'friendships', 'blocks', 'comments',
    'poll_options', 'poll_votes', 'shares',
    'chat_conversations', 'chat_participants', 'chat_messages',
    'notifications', 'spaces', 'space_members', 'space_posts',
    'live_sessions', 'statuses', 'reports'
  )
  AND indexname NOT LIKE '%_pkey'
ORDER BY tablename, indexname;

-- ── 8. Storage Buckets ────────────────────────────────────────
-- Angalia storage buckets (ikiwa storage imewashwa)

SELECT
  id,
  name,
  public,
  file_size_limit
FROM storage.buckets
WHERE id IN ('pasihai-status-media', 'pasihai-post-media')
ORDER BY id;

-- ── 9. Auth Users Count ───────────────────────────────────────
-- Idadi ya users waliopo (hakuna sensitive data)

SELECT COUNT(*) AS total_users FROM auth.users;

-- ── 10. Existing Row Counts ───────────────────────────────────
-- Idadi ya rows kwenye kila table (ikiwa zipo)

DO $$
DECLARE
  t TEXT;
  cnt BIGINT;
BEGIN
  FOR t IN
    SELECT unnest(ARRAY[
      'profiles', 'follows', 'posts', 'reactions', 'bookmarks',
      'hidden_items', 'friendships', 'blocks', 'comments',
      'poll_options', 'poll_votes', 'shares',
      'chat_conversations', 'chat_participants', 'chat_messages',
      'notifications', 'spaces', 'space_members', 'space_posts',
      'live_sessions', 'statuses', 'reports'
    ])
  LOOP
    BEGIN
      EXECUTE format('SELECT COUNT(*) FROM public.%I', t) INTO cnt;
      RAISE NOTICE '% → % rows', t, cnt;
    EXCEPTION WHEN undefined_table THEN
      RAISE NOTICE '% → TABLE DOES NOT EXIST', t;
    END;
  END LOOP;
END $$;

-- ══════════════════════════════════════════════════════════════
-- MWISHO WA SCHEMA CHECK
--
-- Matokeo yataonyesha:
--   ✅ EXISTS / ❌ MISSING  kwa kila table
--   Idadi ya columns, policies, triggers, indexes
--   Functions zilizopo
--   Storage buckets
--   Row counts (ikiwa tables zipo)
-- ══════════════════════════════════════════════════════════════