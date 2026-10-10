-- ══════════════════════════════════════════════════════════════
-- PASIHAI — Migration 007b: sasisha can_see_post()
--
-- Ongeza friendship check kwenye visibility='followers'
-- Dependency: friendships (007), posts (003)
-- Rollback: Hakuna (migration 003 itakuwa na function ya awali)
-- ══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION can_see_post(post_row posts)
RETURNS BOOLEAN AS $$
DECLARE
  v_user UUID := auth.uid();
BEGIN
  -- Mwandishi anaona posts zake ZOTE (hata zilizofutwa — anahitaji kuziona kwa manage)
  IF post_row.author_id = v_user THEN RETURN TRUE; END IF;
  -- Soft-deleted posts hazionekani kwa wengine
  IF post_row.deleted_at IS NOT NULL THEN RETURN FALSE; END IF;
  -- Public: wote wanaona
  IF post_row.visibility = 'public' THEN RETURN TRUE; END IF;
  -- Private: mwandishi pekee
  IF post_row.visibility = 'private' THEN RETURN FALSE; END IF;
  -- Followers: rafiki AU aliyefuata
  IF post_row.visibility = 'followers' THEN
    -- 1. Je, ni rafiki? (friendships view — pande mbili)
    IF EXISTS (
      SELECT 1 FROM friendships WHERE status = 'accepted'
        AND ((requester_id = post_row.author_id AND addressee_id = v_user)
          OR (addressee_id = post_row.author_id AND requester_id = v_user))
    ) THEN RETURN TRUE; END IF;
    -- 2. Je, ninamfuata?
    IF EXISTS (
      SELECT 1 FROM follows
      WHERE follower_id = v_user AND followee_id = post_row.author_id
    ) THEN RETURN TRUE; END IF;
    -- Hakuoni
    RETURN FALSE;
  END IF;
  -- Fail-closed
  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;
