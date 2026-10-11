-- ══════════════════════════════════════════════════════════════
-- PASIHAI — Migration 022: fix post count protection
--
-- Tatizo: protect_post_counts() (003) inarudisha reactions_count / comments_count /
-- shares_count isipokuwa current_user = 'supabase_admin'. Count triggers za SECURITY DEFINER
-- (004, 009, 011) zinaendeshwa kama mmiliki wa function, si supabase_admin, kwa hiyo masasisho
-- yao halali yanarudishwa kimya kimya. Imethibitishwa kwenye Postgres 17 ya ndani:
-- reaction moja iliacha posts.reactions_count = 0.
--
-- Suluhisho: rudisha thamani ya zamani ONLY pale UPDATE ni statement ya moja kwa moja ya client
-- (pg_trigger_depth() = 1). Count triggers zinafanya kazi ndani ya INSERT/DELETE ya reactions,
-- comments au shares (depth >= 2), kwa hiyo masasisho yao yanaruhusiwa. Client haiwezi kuunda
-- trigger, kwa hiyo haiwezi kufikia depth 2.
--
-- Haibadilishi migrations 003/004/009/011 zilizopo. CREATE OR REPLACE ni salama kurudia.
-- ══════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION protect_post_counts()
RETURNS TRIGGER AS $$
BEGIN
  IF pg_trigger_depth() = 1 AND current_user <> 'supabase_admin' THEN
    NEW.reactions_count := OLD.reactions_count;
    NEW.comments_count := OLD.comments_count;
    NEW.shares_count := OLD.shares_count;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
