-- READ-ONLY inspection for a Supabase project (run in SQL Editor of the TEST project first).
-- Does not write, create, alter, or delete anything. No secrets are printed.
-- Output: one result set per block. Paste the results back for review.

-- 1) Migration tracking (Supabase CLI table, if present)
select 'tracking' as block,
       case when to_regclass('supabase_migrations.schema_migrations') is not null
            then 'present' else 'absent' end as status;
-- If block 1 says 'present', also run: select version, name from supabase_migrations.schema_migrations order by version;

-- 2) Expected app tables: exist, RLS enabled, RLS forced
with expected(t) as (values
  ('profiles'),('follows'),('posts'),('reactions'),('bookmarks'),('hidden_items'),
  ('friendships'),('blocks'),('comments'),('poll_options'),('poll_votes'),('shares'),
  ('chat_conversations'),('chat_participants'),('chat_messages'),('notifications'),
  ('spaces'),('space_members'),('space_posts'),('statuses'),('live_sessions'),('reports'))
select e.t as table_name,
       c.oid is not null as exists,
       coalesce(c.relrowsecurity, false) as rls_enabled,
       coalesce(c.relforcerowsecurity, false) as rls_forced
from expected e
left join pg_class c on c.relname = e.t
  and c.relnamespace = 'public'::regnamespace and c.relkind = 'r'
order by e.t;

-- 3) Policy count per public table (look for missing or extra policies)
select tablename, count(*) as policies
from pg_policies where schemaname = 'public'
group by tablename order by tablename;

-- Note: idempotency keys are columns (migration 016), not a table.
-- 4) Helper functions used by RLS / RPC (existence + SECURITY DEFINER flag)
select p.proname as function_name, p.prosecdef as security_definer
from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public' order by p.proname;

-- 5) Storage buckets (must be private: public = false)
select id, name, public, file_size_limit, allowed_mime_types
from storage.buckets order by id;

-- 6) Storage policies on storage.objects
select policyname, cmd, roles
from pg_policies where schemaname = 'storage' and tablename = 'objects'
order by policyname;

-- 7) Check constraints on chat_conversations and posts (migrations 012, 023, 024, 003)
select conrelid::regclass as table_name, conname, pg_get_constraintdef(oid) as definition
from pg_constraint
where conrelid in ('public.chat_conversations'::regclass, 'public.posts'::regclass)
  and contype = 'c'
order by table_name, conname;

-- 8) Row counts only (no data printed)
select 'profiles' as t, count(*) from public.profiles
union all select 'posts', count(*) from public.posts
union all select 'chat_conversations', count(*) from public.chat_conversations
union all select 'chat_messages', count(*) from public.chat_messages
union all select 'statuses', count(*) from public.statuses;
