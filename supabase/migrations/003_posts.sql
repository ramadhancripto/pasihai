-- ══════════════════════════════════════════════════════════════
-- PASIHAI — Migration 003: posts
--
-- Inalingana na: mock.posts + mock.reels + feedMapper.mapPost()
--                + feedMapper.mapReel() + feedService visibility
-- Dependency: profiles (migration 001)
-- Note: live_session_id FK itaongezwa Phase D (live_sessions table)
-- Rollback: DROP TABLE IF EXISTS posts CASCADE;
--           DROP FUNCTION IF EXISTS can_see_post(posts) CASCADE;
--           DROP FUNCTION IF EXISTS is_blocked_by(UUID, UUID) CASCADE;
-- ══════════════════════════════════════════════════════════════

CREATE TABLE posts (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id   UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  kind        TEXT NOT NULL CHECK (kind IN (
                'text','image','video','audio','poll',
                'announcement','reel','product','event','liveActivity')),
  text        TEXT,

  -- Media (nullable — kwa image/video/audio/reel)
  media_url   TEXT CHECK (media_url IS NULL OR media_url ~ '^https?://'),
  media_meta  JSONB NOT NULL DEFAULT '{}'::jsonb,

  -- Poll question (nullable — kwa kind='poll'; options ziko poll_options table Phase B)
  poll_question TEXT,

  -- Highlights + CTA (kwa announcements/products/events)
  highlights  JSONB,
  cta         JSONB,
  label       TEXT,

  -- Live activity reference (nullable — kwa kind='liveActivity' pekee)
  -- FK itaongezwa Phase D wakati live_sessions table itakapokuwepo
  live_session_id UUID,

  -- Visibility (kulingana na isVisible() ya feedService.js)
  visibility  TEXT NOT NULL DEFAULT 'public'
                CHECK (visibility IN ('public','followers','private')),

  -- Engagement (denormalized — zinasasishwa na triggers)
  reactions_count INT NOT NULL DEFAULT 0 CHECK (reactions_count >= 0),
  comments_count  INT NOT NULL DEFAULT 0 CHECK (comments_count >= 0),
  shares_count    INT NOT NULL DEFAULT 0 CHECK (shares_count >= 0),

  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at  TIMESTAMPTZ
);

-- ── Indexes kwa feed queries ──────────────────────────────────
CREATE INDEX idx_posts_feed_public
  ON posts(created_at DESC)
  WHERE deleted_at IS NULL AND visibility = 'public';

CREATE INDEX idx_posts_feed_author
  ON posts(author_id, created_at DESC)
  WHERE deleted_at IS NULL AND visibility IN ('public','followers');

CREATE INDEX idx_posts_kind
  ON posts(kind, created_at DESC)
  WHERE deleted_at IS NULL;

-- ── Full-text search (kwa Home feed search — posts pekee) ────
ALTER TABLE posts ADD COLUMN fts TSVECTOR
  GENERATED ALWAYS AS (
    setweight(to_tsvector('simple', coalesce(text, '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(label, '')), 'B')
  ) STORED;
CREATE INDEX idx_posts_fts ON posts USING GIN(fts)
  WHERE deleted_at IS NULL;

-- ── updated_at trigger ────────────────────────────────────────
CREATE TRIGGER trg_posts_updated_at
  BEFORE UPDATE ON posts
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── Helper: Je, mtumiaji anaweza kuona post hii? ─────────────
-- SECURITY DEFINER: inasoma follows/friendships/blocks kwa niaba ya
-- mtumiaji anayeuliza. Hii ni SALAMA kwa sababu:
--   1. Inakagua tu kama mtumiaji ANASTAHILI kuona — haimruhusu
--      kufanya kitu kingine chochote.
--   2. Inatumia auth.uid() — haiwezi kupitisha kwa mtumiaji mwingine.
--   3. STABLE: haibadilishi data; inasoma tu.
--
-- Phase A (sasa): inatumia follows pekee kwa 'followers' check.
-- Baada ya migration 007 (friendships): itasasishwa kutumia pia
-- friendships view.
-- Baada ya migration 008 (blocks): itasasishwa kutumia blocks.
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
  -- Private: mwandishi pekee (tayari tumeshindwa hapo juu)
  IF post_row.visibility = 'private' THEN RETURN FALSE; END IF;
  -- Followers: ninamfuata mwandishi?
  IF post_row.visibility = 'followers' THEN
    IF EXISTS (
      SELECT 1 FROM follows
      WHERE follower_id = v_user AND followee_id = post_row.author_id
    ) THEN RETURN TRUE; END IF;
    -- Baada ya migration 007: friendship check itaongezwa hapa
    RETURN FALSE;
  END IF;
  -- Fail-closed: visibility isiyojulikana = hakuoni
  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ── Helper: Je, mtumiaji amezuiliwa na mwandishi? ────────────
-- Phase A (sasa): inarudisha FALSE (hakuna blocks bado).
-- Baada ya migration 008: itasasishwa kutumia blocks table.
CREATE OR REPLACE FUNCTION is_blocked_by(blocked_user UUID, blocker UUID)
RETURNS BOOLEAN AS $$
BEGIN
  -- Phase A: hakuna blocks table bado — daima FALSE
  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ── RLS ───────────────────────────────────────────────────────
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts FORCE ROW LEVEL SECURITY;

-- SELECT: Mtumiaji anaona posts kulingana na visibility + blocks
CREATE POLICY "posts_select_visible"
  ON posts FOR SELECT TO authenticated
  USING (can_see_post(posts) AND NOT is_blocked_by(auth.uid(), author_id));

-- INSERT: Mtumiaji aliyeingia anaweza kuunda post yake PEKEE
-- Kuzuia user spoofing: author_id lazima iwe auth.uid()
CREATE POLICY "posts_insert_own"
  ON posts FOR INSERT TO authenticated
  WITH CHECK (author_id = auth.uid());

-- UPDATE: Mwandishi pekee (trigger inalinda counts)
CREATE POLICY "posts_update_own"
  ON posts FOR UPDATE TO authenticated
  USING (author_id = auth.uid())
  WITH CHECK (author_id = auth.uid());

-- ── Trigger: Linda counts zisibadilishwe na mtumiaji ──────────
-- Counts (reactions, comments, shares) zinabadilishwa na triggers pekee
-- (update_reaction_count, n.k.). Trigger hii inarudisha thamani za zamani
-- ikiwa mtumiaji anajaribu kubadilisha counts moja kwa moja.
CREATE OR REPLACE FUNCTION protect_post_counts()
RETURNS TRIGGER AS $$
BEGIN
  -- NOT SECURITY DEFINER: runs as session user.
  -- current_user = 'pasihai_test' (or 'authenticated') for regular users.
  -- current_user = 'supabase_admin' for SECURITY DEFINER triggers
  -- (update_reaction_count, etc.) that need to change counts.
  IF current_user != 'supabase_admin' THEN
    NEW.reactions_count := OLD.reactions_count;
    NEW.comments_count := OLD.comments_count;
    NEW.shares_count := OLD.shares_count;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER protect_post_counts_trigger
  BEFORE UPDATE ON posts
  FOR EACH ROW EXECUTE FUNCTION protect_post_counts();

-- Hakuna DELETE policy — soft delete (UPDATE deleted_at) inafanyika
-- kupitia UPDATE policy hapo juu.
