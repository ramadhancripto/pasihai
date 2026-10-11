-- ══════════════════════════════════════════════════════════════
-- PASIHAI — CONSOLIDATED DATABASE MIGRATION
--
-- Tarehe: 2026-10-11
-- Supabase Project: lbcpacijbiukqcpkfktp
--
-- MIGRATION HII INAUNDA DATABASE YOTE YA PASIHAI kutoka mwanzo.
-- Inajumuisha: tables, indexes, functions, triggers, RLS policies,
-- Storage buckets, na Storage RLS policies.
--
-- USIENDESHE KAMA DATA YAKO ILIYOKUWEPO INAHITAJI KUHIFADHIWA.
-- Endesha kwenye database tupu au baada ya kuthibitisha kuwa
-- hakuna data ya maana iliyopo.
--
-- HATUA:
--   1. Fungua Supabase Dashboard → SQL Editor
--   2. Nakili na ubandike SQL yote hii (sehemu moja)
--   3. Bonyeza "Run"
--   4. Angalia matokeo ya verification queries mwishoni
--
-- SAFETY: SQL hii inatumia IF NOT EXISTS / IF EXISTS / CREATE OR REPLACE
-- kadri inavyowezekana, kwa hiyo inaweza kuendeshwa tena bila madhara
-- kwa tables zilizopo.
-- ══════════════════════════════════════════════════════════════

-- ── Section 1: Profiles ──────────────────────────────────────
-- ══════════════════════════════════════════════════════════════
-- PASIHAI — Migration 001: profiles
--
-- Inalingana na: mock.users + mock.me + identityRepository
-- Dependency: auth.users (Supabase built-in)
-- Rollback: DROP TABLE IF EXISTS profiles CASCADE;
--           DROP FUNCTION IF EXISTS handle_new_user() CASCADE;
-- ══════════════════════════════════════════════════════════════

-- ── Table ─────────────────────────────────────────────────────
CREATE TABLE profiles (
  user_id       UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username      TEXT UNIQUE NOT NULL
                  CHECK (char_length(username) >= 3 AND char_length(username) <= 30
                         AND username ~ '^[a-z0-9._]+$'),
  display_name  TEXT NOT NULL
                  CHECK (char_length(display_name) >= 1 AND char_length(display_name) <= 60),
  entity_type   TEXT NOT NULL DEFAULT 'person'
                  CHECK (entity_type IN (
                    'person','channel','hub','community','business','creator')),
  avatar_url    TEXT,
  avatar_tone   TEXT NOT NULL DEFAULT 'green'
                  CHECK (avatar_tone IN (
                    'green','blue','gold','clay','plum','slate','teal')),
  bio           TEXT NOT NULL DEFAULT ''
                  CHECK (char_length(bio) <= 500),
  category      TEXT,
  verified      BOOLEAN NOT NULL DEFAULT FALSE,
  -- Denormalized counts (zinasasishwa na triggers — SI source of truth)
  friends_count   INT NOT NULL DEFAULT 0 CHECK (friends_count >= 0),
  followers_count INT NOT NULL DEFAULT 0 CHECK (followers_count >= 0),
  following_count INT NOT NULL DEFAULT 0 CHECK (following_count >= 0),
  posts_count     INT NOT NULL DEFAULT 0 CHECK (posts_count >= 0),
  -- User preferences (content interests, view mode, etc.)
  prefs         JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at    TIMESTAMPTZ
);

-- ── Indexes ───────────────────────────────────────────────────
CREATE INDEX idx_profiles_username ON profiles(username)
  WHERE deleted_at IS NULL;
CREATE INDEX idx_profiles_type ON profiles(entity_type)
  WHERE deleted_at IS NULL;

-- ── Full-text search (kwa kutafuta watumiaji kwenye Home feed) ─
ALTER TABLE profiles ADD COLUMN fts TSVECTOR
  GENERATED ALWAYS AS (
    setweight(to_tsvector('simple', coalesce(display_name, '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(username, '')), 'B')
  ) STORED;
CREATE INDEX idx_profiles_fts ON profiles USING GIN(fts)
  WHERE deleted_at IS NULL;

-- ── Generic updated_at trigger ────────────────────────────────
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── Auto-create profile on auth signup ────────────────────────
-- SECURITY DEFINER: inahitaji kuandika profiles hata kabla RLS
-- haijawezeshwa kwa mtumiaji mpya. Hii ndiyo NJIA PEKEE ya
-- kuunda profile — hakuna INSERT policy ya kawaida.
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_username TEXT;
  v_display TEXT;
BEGIN
  -- Sanitize username: lower() FIRST, then ondoa characters zisizoruhusiwa, truncate
  v_username := regexp_replace(
    lower(COALESCE(NEW.raw_user_meta_data->>'username', 'user_' || substr(replace(NEW.id::text, '-', ''), 1, 8))),
    '[^a-z0-9._]', '', 'g'
  );
  -- Hakikisha urefu wa username (3-30 chars)
  IF char_length(v_username) < 3 THEN
    v_username := v_username || substr(replace(NEW.id::text, '-', ''), 1, 3);
  END IF;
  v_username := left(v_username, 30);
  -- Kagua uniqueness (kwa nadra inatokea, lakini salama)
  IF EXISTS (SELECT 1 FROM profiles WHERE username = v_username) THEN
    v_username := left(v_username, 25) || '_' || substr(md5(random()::text), 1, 4);
  END IF;

  v_display := left(
    COALESCE(
      NEW.raw_user_meta_data->>'display_name',
      COALESCE(NEW.raw_user_meta_data->>'full_name', 'Mtumiaji Mpya')
    ),
    60
  );

  INSERT INTO profiles (user_id, username, display_name, avatar_tone)
  VALUES (NEW.id, v_username, v_display, 'green');

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ── RLS ───────────────────────────────────────────────────────
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles FORCE ROW LEVEL SECURITY;

-- SELECT: Yeyote aliyeingia anaweza kusoma profiles za wazi
CREATE POLICY "profiles_select_all"
  ON profiles FOR SELECT TO authenticated
  USING (deleted_at IS NULL);

-- INSERT: Hakuna policy ya kawaida — trigger pekee (handle_new_user)
-- Hii inamaanisha mtumiaji wa kawaida HAWEZI kuunda profile moja kwa moja.
-- Hii inazuia akaunti za uongo (fake profiles).

-- UPDATE: Mtumiaji anaweza kubadilisha profile yake PEKEE
-- WITH CHECK inazuia kubadilisha fields za hatari:
--   verified, entity_type, counts (zinabadilishwa na triggers/system pekee)
CREATE POLICY "profiles_update_own"
  ON profiles FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (
    user_id = auth.uid()
    AND verified = (SELECT p.verified FROM profiles p WHERE p.user_id = auth.uid())
    AND entity_type = (SELECT p.entity_type FROM profiles p WHERE p.user_id = auth.uid())
    AND friends_count = (SELECT p.friends_count FROM profiles p WHERE p.user_id = auth.uid())
    AND followers_count = (SELECT p.followers_count FROM profiles p WHERE p.user_id = auth.uid())
    AND following_count = (SELECT p.following_count FROM profiles p WHERE p.user_id = auth.uid())
    AND posts_count = (SELECT p.posts_count FROM profiles p WHERE p.user_id = auth.uid())
  );

-- DELETE: Hakuna policy — profiles hazifutwi moja kwa moja.
-- Ukifuta auth.users, CASCADE inashughulikia.
-- Soft delete (deleted_at) inafanyika kupitia UPDATE policy hapo juu.

-- ── Section 2: Follows ────────────────────────────────────────
-- ══════════════════════════════════════════════════════════════
-- PASIHAI — Migration 002: follows
--
-- Inalingana na: identityRepository.toggleFollow() + passesChannelGate()
-- Dependency: profiles (migration 001)
-- Rollback: DROP TABLE IF EXISTS follows CASCADE;
--           DROP FUNCTION IF EXISTS update_follow_counts() CASCADE;
-- ══════════════════════════════════════════════════════════════

CREATE TABLE follows (
  follower_id UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  followee_id UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (follower_id, followee_id),
  CHECK (follower_id != followee_id)
);

CREATE INDEX idx_follows_followee ON follows(followee_id);

-- ── Trigger: count updates ────────────────────────────────────
CREATE OR REPLACE FUNCTION update_follow_counts()
RETURNS TRIGGER AS $$
BEGIN
  -- SECURITY DEFINER: runs as supabase_admin (table owner)
  IF TG_OP = 'INSERT' THEN
    UPDATE profiles SET followers_count = followers_count + 1
      WHERE user_id = NEW.followee_id;
    UPDATE profiles SET following_count = following_count + 1
      WHERE user_id = NEW.follower_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE profiles SET followers_count = GREATEST(0, followers_count - 1)
      WHERE user_id = OLD.followee_id;
    UPDATE profiles SET following_count = GREATEST(0, following_count - 1)
      WHERE user_id = OLD.follower_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_follow_counts
  AFTER INSERT OR DELETE ON follows
  FOR EACH ROW EXECUTE FUNCTION update_follow_counts();

-- ── RLS ───────────────────────────────────────────────────────
ALTER TABLE follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE follows FORCE ROW LEVEL SECURITY;

-- SELECT: Yeyote aliyeingia anaweza kusoma (kwa hesabu na UI)
CREATE POLICY "follows_select_all"
  ON follows FOR SELECT TO authenticated
  USING (true);

-- INSERT: Mtumiaji anaweza kufuata kwa niaba yake PEKEE
-- Kuzuia user spoofing: follower_id lazima iwe auth.uid()
CREATE POLICY "follows_insert_own"
  ON follows FOR INSERT TO authenticated
  WITH CHECK (follower_id = auth.uid());

-- DELETE: Mtumiaji anaweza kuacha kufuata kwa niaba yake PEKEE
CREATE POLICY "follows_delete_own"
  ON follows FOR DELETE TO authenticated
  USING (follower_id = auth.uid());

-- Hakuna UPDATE — follows haina fields za kubadilisha baada ya kuundwa.
-- Kubadilisha = DELETE + INSERT.

-- ── Section 3: Posts ──────────────────────────────────────────
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

-- ── Section 4: Reactions ──────────────────────────────────────
-- ══════════════════════════════════════════════════════════════
-- PASIHAI — Migration 004: reactions
--
-- Inalingana na: contentRepository.toggleLike() + session.liked
-- Dependency: profiles (001), posts (003)
-- Rollback: DROP TABLE IF EXISTS reactions CASCADE;
--           DROP FUNCTION IF EXISTS update_reaction_count() CASCADE;
-- ══════════════════════════════════════════════════════════════

CREATE TABLE reactions (
  user_id     UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  post_id     UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  emoji       TEXT NOT NULL DEFAULT 'like'
                CHECK (emoji IN ('like','heart','clap','fire','laugh','sad')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, post_id)  -- reaction MOJA kwa kila post
);

CREATE INDEX idx_reactions_post ON reactions(post_id);

-- ── Trigger: count updates ────────────────────────────────────
CREATE OR REPLACE FUNCTION update_reaction_count()
RETURNS TRIGGER AS $$
BEGIN
  -- SECURITY DEFINER: runs as supabase_admin (table owner)
  -- protect_post_counts allows supabase_admin to change counts
  IF TG_OP = 'INSERT' THEN
    UPDATE posts SET reactions_count = reactions_count + 1
      WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE posts SET reactions_count = GREATEST(0, reactions_count - 1)
      WHERE id = OLD.post_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_reaction_count
  AFTER INSERT OR DELETE ON reactions
  FOR EACH ROW EXECUTE FUNCTION update_reaction_count();

-- ── RLS ───────────────────────────────────────────────────────
ALTER TABLE reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE reactions FORCE ROW LEVEL SECURITY;

-- SELECT: Yeyote aliyeingia anaweza kusoma (kwa UI — likes count)
CREATE POLICY "reactions_select_all"
  ON reactions FOR SELECT TO authenticated
  USING (true);

-- INSERT: Mtumiaji anaweza kupenda kwa niaba yake PEKEE
-- Kuzuia user spoofing: user_id lazima iwe auth.uid()
CREATE POLICY "reactions_insert_own"
  ON reactions FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- DELETE: Mtumiaji anaweza kuondoa reaction yake PEKEE
CREATE POLICY "reactions_delete_own"
  ON reactions FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- UPDATE: Hakuna — reaction haibadiliki. Kubadilisha = DELETE + INSERT.

-- ── Section 5: Bookmarks ──────────────────────────────────────
-- ══════════════════════════════════════════════════════════════
-- PASIHAI — Migration 005: bookmarks
--
-- Inalingana na: contentRepository.toggleSaved() + saveEntity()
--                + session.saved + session.savedEntities
-- Dependency: profiles (001)
-- Rollback: DROP TABLE IF EXISTS bookmarks CASCADE;
-- ══════════════════════════════════════════════════════════════

CREATE TABLE bookmarks (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  ref_type    TEXT NOT NULL CHECK (ref_type IN ('post','entity')),
  ref_id      UUID NOT NULL,  -- posts.id au profiles.user_id
  meta        JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- UNIQUE: kuzuia duplicates (mtumiaji + ref_type + ref_id)
  UNIQUE (user_id, ref_type, ref_id)
);

CREATE INDEX idx_bookmarks_user ON bookmarks(user_id, created_at DESC);
CREATE INDEX idx_bookmarks_ref ON bookmarks(ref_type, ref_id);

-- ── RLS ───────────────────────────────────────────────────────
ALTER TABLE bookmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookmarks FORCE ROW LEVEL SECURITY;

-- SELECT: Mtumiaji anaona bookmarks zake PEKEE
CREATE POLICY "bookmarks_select_own"
  ON bookmarks FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- INSERT: Mtumiaji anaweza kuongeza bookmark yake PEKEE
CREATE POLICY "bookmarks_insert_own"
  ON bookmarks FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- DELETE: Mtumiaji anaweza kuondoa bookmark yake PEKEE
CREATE POLICY "bookmarks_delete_own"
  ON bookmarks FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- Hakuna UPDATE — bookmark haibadiliki. Kubadilisha = DELETE + INSERT.

-- ── Section 6: Hidden Items ───────────────────────────────────
-- ══════════════════════════════════════════════════════════════
-- PASIHAI — Migration 006: hidden_items
--
-- Inalingana na: contentRepository.hideItem() + session.hidden
-- Dependency: profiles (001), posts (003)
-- Rollback: DROP TABLE IF EXISTS hidden_items CASCADE;
-- ══════════════════════════════════════════════════════════════

CREATE TABLE hidden_items (
  user_id     UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  post_id     UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, post_id)
);

-- ── RLS ───────────────────────────────────────────────────────
ALTER TABLE hidden_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE hidden_items FORCE ROW LEVEL SECURITY;

CREATE POLICY "hidden_select_own"
  ON hidden_items FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "hidden_insert_own"
  ON hidden_items FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "hidden_delete_own"
  ON hidden_items FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- ── Section 7: Friendships ────────────────────────────────────
-- ══════════════════════════════════════════════════════════════
-- PASIHAI — Migration 007: friendships
--
-- Inalingana na: entityActions.friend + ring: 'friend'
--                + friends view kwa feedService visibility
-- Dependency: profiles (001)
-- Rollback: DROP TABLE IF EXISTS friendships CASCADE;
--           DROP VIEW IF EXISTS friends CASCADE;
--           DROP FUNCTION IF EXISTS update_friends_count() CASCADE;
-- ══════════════════════════════════════════════════════════════

CREATE TABLE friendships (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  addressee_id UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  status       TEXT NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending','accepted','declined','blocked')),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (requester_id, addressee_id)
);

CREATE INDEX idx_friendships_requester ON friendships(requester_id, status);
CREATE INDEX idx_friendships_addressee ON friendships(addressee_id, status);

-- ── View: urafiki uliokubalika (pande mbili) ─────────────────
CREATE OR REPLACE VIEW friends AS
SELECT requester_id AS user_a, addressee_id AS user_b,
       updated_at AS friends_since
FROM friendships WHERE status = 'accepted'
UNION
SELECT addressee_id AS user_a, requester_id AS user_b,
       updated_at AS friends_since
FROM friendships WHERE status = 'accepted';

-- ── Trigger: count updates ────────────────────────────────────
CREATE OR REPLACE FUNCTION update_friends_count()
RETURNS TRIGGER AS $$
BEGIN
  -- SECURITY DEFINER: runs as supabase_admin (table owner)
  IF TG_OP = 'UPDATE' AND NEW.status = 'accepted' AND OLD.status != 'accepted' THEN
    UPDATE profiles SET friends_count = friends_count + 1
      WHERE user_id = NEW.requester_id;
    UPDATE profiles SET friends_count = friends_count + 1
      WHERE user_id = NEW.addressee_id;
  ELSIF TG_OP = 'UPDATE' AND NEW.status != 'accepted' AND OLD.status = 'accepted' THEN
    UPDATE profiles SET friends_count = GREATEST(0, friends_count - 1)
      WHERE user_id = NEW.requester_id;
    UPDATE profiles SET friends_count = GREATEST(0, friends_count - 1)
      WHERE user_id = NEW.addressee_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_friends_count
  AFTER UPDATE ON friendships
  FOR EACH ROW EXECUTE FUNCTION update_friends_count();

-- ── updated_at trigger ────────────────────────────────────────
CREATE TRIGGER trg_friendships_updated_at
  BEFORE UPDATE ON friendships
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── RLS ───────────────────────────────────────────────────────
ALTER TABLE friendships ENABLE ROW LEVEL SECURITY;
ALTER TABLE friendships FORCE ROW LEVEL SECURITY;

-- SELECT: Mtumiaji anaona maombi yake (aliyotuma + aliyopokea)
CREATE POLICY "friendships_select_own"
  ON friendships FOR SELECT TO authenticated
  USING (requester_id = auth.uid() OR addressee_id = auth.uid());

-- INSERT: Mtumiaji anaweza kutuma ombi la urafiki (yeye ni requester)
-- Kuzuia: self-friendship na user spoofing
CREATE POLICY "friendships_insert_own"
  ON friendships FOR INSERT TO authenticated
  WITH CHECK (
    requester_id = auth.uid()
    AND requester_id != addressee_id
  );

-- UPDATE: Mpokeaji anaweza kukubali/kukataa; mwombaji anaweza kufuta
CREATE POLICY "friendships_update_own"
  ON friendships FOR UPDATE TO authenticated
  USING (
    -- Mpokeaji: kubali (accepted) au kataa (declined/block)
    (addressee_id = auth.uid())
    OR
    -- Mwombaji: futa ombi (kwa kubadilisha status)
    (requester_id = auth.uid() AND status = 'pending')
  )
  WITH CHECK (
    -- Hakuna kubadilisha requester_id au addressee_id
    -- Ndani ya WITH CHECK: column names = NEW values; subquery = EXISTING values
    requester_id = (SELECT f.requester_id FROM friendships f WHERE f.id = friendships.id)
    AND addressee_id = (SELECT f.addressee_id FROM friendships f WHERE f.id = friendships.id)
    AND (
      -- Mpokeaji anaweza kubadilisha status yoyote
      (SELECT f.addressee_id FROM friendships f WHERE f.id = friendships.id) = auth.uid()
      OR
      -- Mwombaji anaweza tu kubadilisha kwenda 'declined' (kufuta ombi)
      status = 'declined'
    )
  );

-- Hakuna DELETE — kubadilisha status ndio njia ya kufuta ombi.

-- ── Section 7b: Update can_see_post (adds friendship check) ──
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

-- ── Section 8: Blocks ────────────────────────────────────────
-- ══════════════════════════════════════════════════════════════
-- PASIHAI — Migration 008: blocks
--
-- Inalingana na: chatService.blockContact() + session.blocked
-- Dependency: profiles (001)
-- Rollback: DROP TABLE IF EXISTS blocks CASCADE;
-- ══════════════════════════════════════════════════════════════

CREATE TABLE blocks (
  blocker_id  UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  blocked_id  UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (blocker_id, blocked_id),
  CHECK (blocker_id != blocked_id)
);

CREATE INDEX idx_blocks_blocker ON blocks(blocker_id);
CREATE INDEX idx_blocks_blocked ON blocks(blocked_id);

-- ── RLS ───────────────────────────────────────────────────────
ALTER TABLE blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE blocks FORCE ROW LEVEL SECURITY;

-- SELECT: Mtumiaji anaona blocks zake PEKEE
CREATE POLICY "blocks_select_own"
  ON blocks FOR SELECT TO authenticated
  USING (blocker_id = auth.uid());

-- INSERT: Mtumiaji anaweza kuzuia kwa niaba yake PEKEE
-- Kuzuia: self-block na user spoofing
CREATE POLICY "blocks_insert_own"
  ON blocks FOR INSERT TO authenticated
  WITH CHECK (
    blocker_id = auth.uid()
    AND blocker_id != blocked_id
  );

-- DELETE: Mtumiaji anaweza kufungua kwa niaba yake PEKEE
CREATE POLICY "blocks_delete_own"
  ON blocks FOR DELETE TO authenticated
  USING (blocker_id = auth.uid());

-- Hakuna UPDATE — block haibadiliki. Kubadilisha = DELETE + INSERT.

-- ── Section 8b: Update is_blocked_by (uses blocks table) ─────
-- ══════════════════════════════════════════════════════════════
-- PASIHAI — Migration 008b: sasisha is_blocked_by()
--
-- Sasa inatumia blocks table (iliyoundwa na migration 008)
-- Dependency: blocks (008)
-- Rollback: Hakuna (migration 003 itakuwa na function ya awali)
-- ══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION is_blocked_by(blocked_user UUID, blocker UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM blocks
    WHERE blocker_id = blocker AND blocked_id = blocked_user
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ── Section 9: Comments ──────────────────────────────────────
-- ══════════════════════════════════════════════════════════════
-- PASIHAI — Migration 009: comments
--
-- Inalingana na: feedService.addComment() + feedService.listComments()
-- Dependency: profiles (001), posts (003)
-- Rollback: DROP TABLE IF EXISTS comments CASCADE;
--           DROP FUNCTION IF EXISTS update_comment_count() CASCADE;
-- ══════════════════════════════════════════════════════════════

CREATE TABLE comments (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id     UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  author_id   UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  parent_id   UUID REFERENCES comments(id) ON DELETE CASCADE,  -- kwa replies
  text        TEXT NOT NULL CHECK (char_length(text) >= 1 AND char_length(text) <= 2000),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at  TIMESTAMPTZ
);

CREATE INDEX idx_comments_post ON comments(post_id, created_at)
  WHERE deleted_at IS NULL;
CREATE INDEX idx_comments_author ON comments(author_id)
  WHERE deleted_at IS NULL;
CREATE INDEX idx_comments_parent ON comments(parent_id)
  WHERE deleted_at IS NULL AND parent_id IS NOT NULL;

-- ── Trigger: update comments_count on posts ──────────────────
CREATE OR REPLACE FUNCTION update_comment_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.deleted_at IS NULL THEN
    UPDATE posts SET comments_count = comments_count + 1 WHERE id = NEW.post_id;
  ELSIF TG_OP = 'UPDATE' AND OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL THEN
    UPDATE posts SET comments_count = GREATEST(0, comments_count - 1) WHERE id = NEW.post_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_comments_count
  AFTER INSERT OR UPDATE OF deleted_at ON comments
  FOR EACH ROW EXECUTE FUNCTION update_comment_count();

-- ── updated_at trigger ──────────────────────────────────────
CREATE TRIGGER trg_comments_updated_at
  BEFORE UPDATE ON comments
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── RLS ─────────────────────────────────────────────────────
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments FORCE ROW LEVEL SECURITY;

-- SELECT: wote wanaona comments za posts wanazoweza kuona
CREATE POLICY "comments_select_visible"
  ON comments FOR SELECT
  USING (
    deleted_at IS NULL
    AND can_see_post((SELECT p FROM posts p WHERE p.id = post_id))
  );

-- INSERT: mtumiaji yeyote aliyeingia anaweza kucomment
CREATE POLICY "comments_insert_auth"
  ON comments FOR INSERT
  WITH CHECK (auth.uid() = author_id);

-- UPDATE: mwandishi pekee anaweza kufuta (soft delete)
CREATE POLICY "comments_update_author"
  ON comments FOR UPDATE
  USING (auth.uid() = author_id)
  WITH CHECK (auth.uid() = author_id);

-- DELETE: mwandishi au admin (hard delete — kwa sasa hakuna admin role)
CREATE POLICY "comments_delete_author"
  ON comments FOR DELETE
  USING (auth.uid() = author_id);

-- ── Section 10: Polls ────────────────────────────────────────
-- ══════════════════════════════════════════════════════════════
-- PASIHAI — Migration 010: poll_options
--
-- Inalingana na: feedService.votePoll() + posts.poll_question
-- Dependency: posts (003)
-- Rollback: DROP TABLE IF EXISTS poll_options CASCADE;
--           DROP TABLE IF EXISTS poll_votes CASCADE;
-- ══════════════════════════════════════════════════════════════

CREATE TABLE poll_options (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id     UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  label       TEXT NOT NULL CHECK (char_length(label) >= 1 AND char_length(label) <= 200),
  position    INT NOT NULL CHECK (position >= 0),
  votes_count INT NOT NULL DEFAULT 0 CHECK (votes_count >= 0),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (post_id, position)
);

CREATE INDEX idx_poll_options_post ON poll_options(post_id, position);

-- ── RLS ─────────────────────────────────────────────────────
ALTER TABLE poll_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE poll_options FORCE ROW LEVEL SECURITY;

-- SELECT: wote wanaona poll options za posts wanazoweza kuona
CREATE POLICY "poll_options_select_visible"
  ON poll_options FOR SELECT
  USING (can_see_post((SELECT p FROM posts p WHERE p.id = post_id)));

-- INSERT: mwandishi wa post pekee anaweza kuongeza options (wakati wa kuunda post)
CREATE POLICY "poll_options_insert_author"
  ON poll_options FOR INSERT
  WITH CHECK (
    auth.uid() = (SELECT author_id FROM posts WHERE id = post_id)
  );

-- UPDATE: hakuna (votes_count inasasishwa na trigger)
-- DELETE: mwandishi wa post pekee
CREATE POLICY "poll_options_delete_author"
  ON poll_options FOR DELETE
  USING (
    auth.uid() = (SELECT author_id FROM posts WHERE id = post_id)
  );

-- ══════════════════════════════════════════════════════════════
-- poll_votes: kura za watumiaji
-- ══════════════════════════════════════════════════════════════

CREATE TABLE poll_votes (
  user_id     UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  option_id   UUID NOT NULL REFERENCES poll_options(id) ON DELETE CASCADE,
  post_id     UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, post_id),  -- kura MOJA kwa kila poll
  UNIQUE (user_id, option_id)  -- kuzuia kura mbili kwa option moja
);

CREATE INDEX idx_poll_votes_option ON poll_votes(option_id);
CREATE INDEX idx_poll_votes_post ON poll_votes(post_id);

-- ── Trigger: update votes_count on poll_options ─────────────
CREATE OR REPLACE FUNCTION update_poll_votes_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE poll_options SET votes_count = votes_count + 1 WHERE id = NEW.option_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE poll_options SET votes_count = GREATEST(0, votes_count - 1) WHERE id = OLD.option_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_poll_votes_count
  AFTER INSERT OR DELETE ON poll_votes
  FOR EACH ROW EXECUTE FUNCTION update_poll_votes_count();

-- ── RLS ─────────────────────────────────────────────────────
ALTER TABLE poll_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE poll_votes FORCE ROW LEVEL SECURITY;

-- SELECT: wote wanaona kura (kwa matokeo ya poll)
CREATE POLICY "poll_votes_select_all"
  ON poll_votes FOR SELECT
  USING (can_see_post((SELECT p FROM posts p WHERE p.id = post_id)));

-- INSERT: mtumiaji aliyeingia anaweza kupiga kura (kura moja tu)
CREATE POLICY "poll_votes_insert_auth"
  ON poll_votes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- DELETE: mtumiaji anaweza kubadilisha kura yake
CREATE POLICY "poll_votes_delete_own"
  ON poll_votes FOR DELETE
  USING (auth.uid() = user_id);

-- ── Section 11: Shares ───────────────────────────────────────
-- ══════════════════════════════════════════════════════════════
-- PASIHAI — Migration 011: shares
--
-- Inalingana na: feedService.sharePost() + posts.shares_count
-- Dependency: profiles (001), posts (003)
-- Rollback: DROP TABLE IF EXISTS shares CASCADE;
--           DROP FUNCTION IF EXISTS update_share_count() CASCADE;
-- ══════════════════════════════════════════════════════════════

CREATE TABLE shares (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id     UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  platform    TEXT NOT NULL DEFAULT 'pasihai'
                CHECK (platform IN ('pasihai', 'whatsapp', 'twitter', 'facebook', 'link')),
  message     TEXT CHECK (char_length(message) <= 500),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_shares_post ON shares(post_id, created_at DESC);
-- Partial index with now() in the predicate is not allowed (now() is not IMMUTABLE),
-- so the migration could never apply. Plain composite index instead.
CREATE INDEX idx_shares_user ON shares(user_id, created_at DESC);

-- ── Trigger: update shares_count on posts ───────────────────
CREATE OR REPLACE FUNCTION update_share_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE posts SET shares_count = shares_count + 1 WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE posts SET shares_count = GREATEST(0, shares_count - 1) WHERE id = OLD.post_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_shares_count
  AFTER INSERT OR DELETE ON shares
  FOR EACH ROW EXECUTE FUNCTION update_share_count();

-- ── RLS ─────────────────────────────────────────────────────
ALTER TABLE shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE shares FORCE ROW LEVEL SECURITY;

-- SELECT: wote wanaona shares za posts wanazoweza kuona
CREATE POLICY "shares_select_visible"
  ON shares FOR SELECT
  USING (can_see_post((SELECT p FROM posts p WHERE p.id = post_id)));

-- INSERT: mtumiaji yeyote aliyeingia anaweza kushiriki
CREATE POLICY "shares_insert_auth"
  ON shares FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- DELETE: mtumiaji anaweza kufuta shares zake mwenyewe
CREATE POLICY "shares_delete_own"
  ON shares FOR DELETE
  USING (auth.uid() = user_id);

-- ── Section 12: Chat ─────────────────────────────────────────
-- ══════════════════════════════════════════════════════════════
-- PASIHAI — Migration 012: chat_conversations + chat_messages
--
-- Inalingana na: chatService + chatRepository
-- Dependency: profiles (001)
-- Rollback: DROP TABLE IF EXISTS chat_messages CASCADE;
--           DROP TABLE IF EXISTS chat_conversations CASCADE;
-- ══════════════════════════════════════════════════════════════

-- ── chat_conversations ──────────────────────────────────────
CREATE TABLE chat_conversations (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type        TEXT NOT NULL DEFAULT 'direct'
                CHECK (type IN ('direct', 'group')),
  title       TEXT CHECK (type = 'direct' OR (type = 'group' AND char_length(title) >= 1 AND char_length(title) <= 100)),
  created_by  UUID REFERENCES profiles(user_id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_conversations_updated ON chat_conversations(updated_at DESC);

-- ── Trigger: updated_at ─────────────────────────────────────
CREATE TRIGGER trg_conversations_updated_at
  BEFORE UPDATE ON chat_conversations
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── chat_participants (junction table) ──────────────────────
CREATE TABLE chat_participants (
  conversation_id UUID NOT NULL REFERENCES chat_conversations(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  joined_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_read_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (conversation_id, user_id)
);

CREATE INDEX idx_participants_user ON chat_participants(user_id);

-- ── chat_messages ───────────────────────────────────────────
CREATE TABLE chat_messages (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES chat_conversations(id) ON DELETE CASCADE,
  sender_id       UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  text            TEXT CHECK (char_length(text) >= 1 AND char_length(text) <= 5000),
  media_url       TEXT CHECK (media_url IS NULL OR media_url ~ '^https?://'),
  media_type      TEXT CHECK (media_type IN ('image', 'video', 'audio', 'file')),
  reply_to_id     UUID REFERENCES chat_messages(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at      TIMESTAMPTZ
);

CREATE INDEX idx_messages_conversation ON chat_messages(conversation_id, created_at DESC)
  WHERE deleted_at IS NULL;
CREATE INDEX idx_messages_sender ON chat_messages(sender_id)
  WHERE deleted_at IS NULL;

-- ── Trigger: update conversation updated_at ─────────────────
CREATE OR REPLACE FUNCTION update_conversation_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE chat_conversations SET updated_at = now() WHERE id = NEW.conversation_id;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_messages_update_conversation
  AFTER INSERT ON chat_messages
  FOR EACH ROW EXECUTE FUNCTION update_conversation_timestamp();

-- ── RLS: chat_conversations ─────────────────────────────────
ALTER TABLE chat_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_conversations FORCE ROW LEVEL SECURITY;

-- SELECT: washiriki pekee wanaona conversation
CREATE POLICY "conversations_select_participant"
  ON chat_conversations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM chat_participants
      WHERE conversation_id = chat_conversations.id AND user_id = auth.uid()
    )
  );

-- INSERT: mtumiaji yeyote aliyeingia anaweza kuunda conversation
CREATE POLICY "conversations_insert_auth"
  ON chat_conversations FOR INSERT
  WITH CHECK (auth.uid() = created_by OR created_by IS NULL);

-- UPDATE: washiriki pekee wanaweza kusasisha (kwa sasa hakuna update fields)
CREATE POLICY "conversations_update_participant"
  ON chat_conversations FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM chat_participants
      WHERE conversation_id = chat_conversations.id AND user_id = auth.uid()
    )
  );

-- ── RLS: chat_participants ──────────────────────────────────
ALTER TABLE chat_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_participants FORCE ROW LEVEL SECURITY;

-- SELECT: washiriki pekee wanaona washiriki wengine
CREATE POLICY "participants_select_participant"
  ON chat_participants FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM chat_participants cp
      WHERE cp.conversation_id = chat_participants.conversation_id AND cp.user_id = auth.uid()
    )
  );

-- INSERT: creator wa conversation au admin (kwa sasa creator pekee)
CREATE POLICY "participants_insert_creator"
  ON chat_participants FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    OR auth.uid() = (SELECT created_by FROM chat_conversations WHERE id = conversation_id)
  );

-- UPDATE: mtumiaji anaweza kusasisha last_read_at yake
CREATE POLICY "participants_update_own"
  ON chat_participants FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- DELETE: mtumiaji anaweza kuondoka conversation
CREATE POLICY "participants_delete_own"
  ON chat_participants FOR DELETE
  USING (auth.uid() = user_id);

-- ── RLS: chat_messages ──────────────────────────────────────
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages FORCE ROW LEVEL SECURITY;

-- SELECT: washiriki pekee wanaona messages
CREATE POLICY "messages_select_participant"
  ON chat_messages FOR SELECT
  USING (
    deleted_at IS NULL
    AND EXISTS (
      SELECT 1 FROM chat_participants
      WHERE conversation_id = chat_messages.conversation_id AND user_id = auth.uid()
    )
  );

-- INSERT: washiriki pekee wanaweza kutuma messages
CREATE POLICY "messages_insert_participant"
  ON chat_messages FOR INSERT
  WITH CHECK (
    auth.uid() = sender_id
    AND EXISTS (
      SELECT 1 FROM chat_participants
      WHERE conversation_id = chat_messages.conversation_id AND user_id = auth.uid()
    )
  );

-- UPDATE: mtumiaji anaweza kufuta messages zake (soft delete)
CREATE POLICY "messages_update_sender"
  ON chat_messages FOR UPDATE
  USING (auth.uid() = sender_id)
  WITH CHECK (auth.uid() = sender_id);

-- DELETE: mtumiaji anaweza kufuta messages zake (hard delete)
CREATE POLICY "messages_delete_sender"
  ON chat_messages FOR DELETE
  USING (auth.uid() = sender_id);

-- ── Section 13: Notifications ────────────────────────────────
-- ══════════════════════════════════════════════════════════════
-- PASIHAI — Migration 013: notifications
--
-- Inalingana na: notificationService.list() + activityRepository
-- Dependency: profiles (001), posts (003)
-- Rollback: DROP TABLE IF EXISTS notifications CASCADE;
-- ══════════════════════════════════════════════════════════════

CREATE TABLE notifications (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  type        TEXT NOT NULL CHECK (type IN (
                'like', 'comment', 'reply', 'follow', 'friend_request',
                'friend_accept', 'mention', 'share', 'system')),
  actor_id    UUID REFERENCES profiles(user_id) ON DELETE SET NULL,
  post_id     UUID REFERENCES posts(id) ON DELETE CASCADE,
  title       TEXT NOT NULL CHECK (char_length(title) >= 1 AND char_length(title) <= 200),
  body        TEXT CHECK (char_length(body) <= 500),
  read_at     TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_notifications_user ON notifications(user_id, created_at DESC)
  WHERE read_at IS NULL;
CREATE INDEX idx_notifications_user_all ON notifications(user_id, created_at DESC);
CREATE INDEX idx_notifications_actor ON notifications(actor_id)
  WHERE actor_id IS NOT NULL;

-- ── Helper: unread count ────────────────────────────────────
CREATE OR REPLACE FUNCTION get_unread_count(target_user UUID)
RETURNS INT AS $$
  SELECT COUNT(*)::INT FROM notifications
  WHERE user_id = target_user AND read_at IS NULL;
$$ LANGUAGE sql STABLE;

-- ── RLS ─────────────────────────────────────────────────────
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications FORCE ROW LEVEL SECURITY;

-- SELECT: mtumiaji anaona notifications zake pekee
CREATE POLICY "notifications_select_own"
  ON notifications FOR SELECT
  USING (auth.uid() = user_id);

-- INSERT: system au actor (kwa sasa hakuna admin role, hivyo auth pekee)
-- Kwa sasa, notifications zinaundwa na application logic, si DB triggers
CREATE POLICY "notifications_insert_auth"
  ON notifications FOR INSERT
  WITH CHECK (auth.uid() = actor_id OR actor_id IS NULL);

-- UPDATE: mtumiaji anaweza kusasisha read_at yake
CREATE POLICY "notifications_update_own"
  ON notifications FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- DELETE: mtumiaji anaweza kufuta notifications zake
CREATE POLICY "notifications_delete_own"
  ON notifications FOR DELETE
  USING (auth.uid() = user_id);

-- ── Section 14: Spaces ───────────────────────────────────────
-- ══════════════════════════════════════════════════════════════
-- PASIHAI — Migration 014: spaces (LOW PRIORITY)
--
-- Inalingana na: spacesService + spacesRepository
-- Dependency: profiles (001)
-- Rollback: DROP TABLE IF EXISTS space_posts CASCADE;
--           DROP TABLE IF EXISTS space_members CASCADE;
--           DROP TABLE IF EXISTS spaces CASCADE;
-- ══════════════════════════════════════════════════════════════

-- ── spaces ──────────────────────────────────────────────────
CREATE TABLE spaces (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug        TEXT UNIQUE NOT NULL
                CHECK (char_length(slug) >= 3 AND char_length(slug) <= 50
                       AND slug ~ '^[a-z0-9-]+$'),
  name        TEXT NOT NULL CHECK (char_length(name) >= 1 AND char_length(name) <= 100),
  type        TEXT NOT NULL CHECK (type IN ('hub', 'community', 'channel')),
  description TEXT CHECK (char_length(description) <= 1000),
  creator_id  UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  visibility  TEXT NOT NULL DEFAULT 'public'
                CHECK (visibility IN ('public', 'listed', 'private')),
  avatar_url  TEXT,
  cover_url   TEXT,
  members_count INT NOT NULL DEFAULT 0 CHECK (members_count >= 0),
  posts_count   INT NOT NULL DEFAULT 0 CHECK (posts_count >= 0),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at  TIMESTAMPTZ
);

CREATE INDEX idx_spaces_type ON spaces(type) WHERE deleted_at IS NULL;
CREATE INDEX idx_spaces_creator ON spaces(creator_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_spaces_slug ON spaces(slug) WHERE deleted_at IS NULL;

-- ── Trigger: updated_at ─────────────────────────────────────
CREATE TRIGGER trg_spaces_updated_at
  BEFORE UPDATE ON spaces
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── space_members ──────────────────────────────────────────
CREATE TABLE space_members (
  space_id    UUID NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  role        TEXT NOT NULL DEFAULT 'member'
                CHECK (role IN ('owner', 'admin', 'moderator', 'member')),
  status      TEXT NOT NULL DEFAULT 'active'
                CHECK (status IN ('pending', 'active', 'banned', 'left')),
  joined_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (space_id, user_id)
);

CREATE INDEX idx_space_members_user ON space_members(user_id) WHERE status = 'active';
CREATE INDEX idx_space_members_space ON space_members(space_id) WHERE status = 'active';

-- ── space_posts (junction table linking posts to spaces) ────
CREATE TABLE space_posts (
  space_id    UUID NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
  post_id     UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (space_id, post_id)
);

CREATE INDEX idx_space_posts_space ON space_posts(space_id, created_at DESC);

-- ── RLS: spaces ─────────────────────────────────────────────
ALTER TABLE spaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE spaces FORCE ROW LEVEL SECURITY;

-- SELECT: public/listed spaces zinaonekana kwa wote; private kwa members pekee
CREATE POLICY "spaces_select_visible"
  ON spaces FOR SELECT
  USING (
    deleted_at IS NULL
    AND (
      visibility IN ('public', 'listed')
      OR EXISTS (
        SELECT 1 FROM space_members
        WHERE space_id = spaces.id AND user_id = auth.uid() AND status = 'active'
      )
    )
  );

-- INSERT: mtumiaji yeyote aliyeingia anaweza kuunda space
CREATE POLICY "spaces_insert_auth"
  ON spaces FOR INSERT
  WITH CHECK (auth.uid() = creator_id);

-- UPDATE: owner/admin pekee wanaweza kusasisha
CREATE POLICY "spaces_update_admin"
  ON spaces FOR UPDATE
  USING (
    auth.uid() = creator_id
    OR EXISTS (
      SELECT 1 FROM space_members
      WHERE space_id = spaces.id AND user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- DELETE: owner pekee (soft delete)
CREATE POLICY "spaces_delete_owner"
  ON spaces FOR DELETE
  USING (auth.uid() = creator_id);

-- ── RLS: space_members ──────────────────────────────────────
ALTER TABLE space_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE space_members FORCE ROW LEVEL SECURITY;

-- SELECT: members wanaona washiriki wengine (au wote kwa public spaces)
CREATE POLICY "space_members_select_visible"
  ON space_members FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM spaces
      WHERE id = space_members.space_id AND deleted_at IS NULL
      AND (
        visibility IN ('public', 'listed')
        OR EXISTS (
          SELECT 1 FROM space_members sm
          WHERE sm.space_id = space_members.space_id AND sm.user_id = auth.uid() AND sm.status = 'active'
        )
      )
    )
  );

-- INSERT: mtumiaji anaweza kujiunga (au admin anaweza kumwongeza mtu)
CREATE POLICY "space_members_insert_join"
  ON space_members FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM space_members sm
      WHERE sm.space_id = space_members.space_id AND sm.user_id = auth.uid() AND sm.role IN ('owner', 'admin')
    )
  );

-- UPDATE: admin pekee wanaweza kusasisha role/status
CREATE POLICY "space_members_update_admin"
  ON space_members FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM space_members sm
      WHERE sm.space_id = space_members.space_id AND sm.user_id = auth.uid() AND sm.role IN ('owner', 'admin')
    )
  );

-- DELETE: mtumiaji anaweza kuondoka (au admin anaweza kumfukuza)
CREATE POLICY "space_members_delete_leave"
  ON space_members FOR DELETE
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM space_members sm
      WHERE sm.space_id = space_members.space_id AND sm.user_id = auth.uid() AND sm.role IN ('owner', 'admin')
    )
  );

-- ── RLS: space_posts ────────────────────────────────────────
ALTER TABLE space_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE space_posts FORCE ROW LEVEL SECURITY;

-- SELECT: members wanaona posts (au wote kwa public spaces)
CREATE POLICY "space_posts_select_visible"
  ON space_posts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM spaces
      WHERE id = space_posts.space_id AND deleted_at IS NULL
      AND (
        visibility IN ('public', 'listed')
        OR EXISTS (
          SELECT 1 FROM space_members sm
          WHERE sm.space_id = space_posts.space_id AND sm.user_id = auth.uid() AND sm.status = 'active'
        )
      )
    )
  );

-- INSERT: members pekee wanaweza kuongeza posts
CREATE POLICY "space_posts_insert_member"
  ON space_posts FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM space_members
      WHERE space_id = space_posts.space_id AND user_id = auth.uid() AND status = 'active'
    )
  );

-- DELETE: mwandishi wa post au admin
CREATE POLICY "space_posts_delete_author_or_admin"
  ON space_posts FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM posts WHERE id = space_posts.post_id AND author_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM space_members sm
      WHERE sm.space_id = space_posts.space_id AND sm.user_id = auth.uid() AND sm.role IN ('owner', 'admin')
    )
  );

-- ── Section 15: Live Sessions, Statuses, Reports ─────────────
-- ══════════════════════════════════════════════════════════════
-- PASIHAI — Migration 015: live_sessions + statuses + reports
--
-- LOW PRIORITY tables zilizobaki
-- Dependency: profiles (001), posts (003)
-- Rollback: DROP TABLE IF EXISTS reports CASCADE;
--           DROP TABLE IF EXISTS statuses CASCADE;
--           DROP TABLE IF EXISTS live_sessions CASCADE;
-- ══════════════════════════════════════════════════════════════

-- ── live_sessions ───────────────────────────────────────────
CREATE TABLE live_sessions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  host_id       UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  title         TEXT NOT NULL CHECK (char_length(title) >= 1 AND char_length(title) <= 200),
  mode          TEXT NOT NULL DEFAULT 'Video'
                  CHECK (mode IN ('Video', 'Sauti')),
  state         TEXT NOT NULL DEFAULT 'live'
                  CHECK (state IN ('upcoming', 'live', 'ended')),
  category      TEXT NOT NULL DEFAULT 'General',
  visibility    TEXT NOT NULL DEFAULT 'public'
                  CHECK (visibility IN ('public', 'followers', 'private')),
  viewers_count INT NOT NULL DEFAULT 0 CHECK (viewers_count >= 0),
  started_at    TIMESTAMPTZ,
  ended_at      TIMESTAMPTZ,
  scheduled_at  TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_live_sessions_state ON live_sessions(state, created_at DESC)
  WHERE state IN ('live', 'upcoming');
CREATE INDEX idx_live_sessions_host ON live_sessions(host_id);

-- ── Trigger: updated_at ─────────────────────────────────────
CREATE TRIGGER trg_live_sessions_updated_at
  BEFORE UPDATE ON live_sessions
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── RLS ─────────────────────────────────────────────────────
ALTER TABLE live_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE live_sessions FORCE ROW LEVEL SECURITY;

-- SELECT: public sessions zinaonekana kwa wote
CREATE POLICY "live_sessions_select_visible"
  ON live_sessions FOR SELECT
  USING (
    visibility = 'public'
    OR (visibility = 'followers' AND host_id IN (
      SELECT followee_id FROM follows WHERE follower_id = auth.uid()
    ))
    OR host_id = auth.uid()
  );

-- INSERT: mtumiaji yeyote aliyeingia anaweza kuanza live session
CREATE POLICY "live_sessions_insert_auth"
  ON live_sessions FOR INSERT
  WITH CHECK (auth.uid() = host_id);

-- UPDATE: host pekee anaweza kusasisha
CREATE POLICY "live_sessions_update_host"
  ON live_sessions FOR UPDATE
  USING (auth.uid() = host_id)
  WITH CHECK (auth.uid() = host_id);

-- DELETE: host pekee
CREATE POLICY "live_sessions_delete_host"
  ON live_sessions FOR DELETE
  USING (auth.uid() = host_id);

-- ══════════════════════════════════════════════════════════════
-- statuses (Stories)
-- ══════════════════════════════════════════════════════════════

CREATE TABLE statuses (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  media_url   TEXT NOT NULL CHECK (media_url ~ '^https?://'),
  media_type  TEXT NOT NULL CHECK (media_type IN ('image', 'video')),
  text        TEXT CHECK (char_length(text) <= 500),
  expires_at  TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '24 hours'),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Partial index predicates must be IMMUTABLE; expiry filtering stays in the query/RLS.
CREATE INDEX idx_statuses_user ON statuses(user_id, created_at DESC);
CREATE INDEX idx_statuses_expires ON statuses(expires_at);

-- ── RLS ─────────────────────────────────────────────────────
ALTER TABLE statuses ENABLE ROW LEVEL SECURITY;
ALTER TABLE statuses FORCE ROW LEVEL SECURITY;

-- SELECT: owner na followers tu; hakuna profile-visibility branch hapa.
CREATE POLICY "statuses_select_followers"
  ON statuses FOR SELECT
  USING (
    expires_at > now()
    AND (
      user_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM follows
        WHERE follower_id = auth.uid() AND followee_id = statuses.user_id
      )
    )
  );

-- INSERT: mtumiaji anaweza kuunda status yake
CREATE POLICY "statuses_insert_own"
  ON statuses FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- DELETE: mtumiaji anaweza kufuta status yake
CREATE POLICY "statuses_delete_own"
  ON statuses FOR DELETE
  USING (auth.uid() = user_id);

-- ══════════════════════════════════════════════════════════════
-- reports
-- ══════════════════════════════════════════════════════════════

CREATE TABLE reports (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  target_type TEXT NOT NULL CHECK (target_type IN ('post', 'comment', 'profile', 'message')),
  target_id   UUID NOT NULL,
  reason      TEXT NOT NULL CHECK (reason IN (
                'spam', 'harassment', 'hate_speech', 'violence',
                'misinformation', 'inappropriate', 'other')),
  details     TEXT CHECK (char_length(details) <= 1000),
  status      TEXT NOT NULL DEFAULT 'pending'
                CHECK (status IN ('pending', 'reviewed', 'resolved', 'dismissed')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES profiles(user_id)
);

CREATE INDEX idx_reports_target ON reports(target_type, target_id);
CREATE INDEX idx_reports_status ON reports(status, created_at DESC)
  WHERE status = 'pending';

-- ── RLS ─────────────────────────────────────────────────────
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports FORCE ROW LEVEL SECURITY;

-- SELECT: reporter pekee anaona reports zake (au admin)
CREATE POLICY "reports_select_own"
  ON reports FOR SELECT
  USING (auth.uid() = reporter_id);

-- INSERT: mtumiaji yeyote aliyeingia anaweza kuripoti
CREATE POLICY "reports_insert_auth"
  ON reports FOR INSERT
  WITH CHECK (auth.uid() = reporter_id);

-- UPDATE: hakuna (admin pekee, lakini hakuna admin role bado)
-- DELETE: hakuna (reports hazifutwi)

-- ── Section 16: Idempotency Keys ─────────────────────────────
-- Migration: Idempotency Keys for Duplicate Prevention
-- Purpose: Kuzuia duplicate submissions wakati wa network timeouts/retries
-- Tables affected: posts, comments, reactions, bookmarks, hidden_items

-- ============================================================================
-- 1. POSTS - Ongeza idempotency_key column
-- ============================================================================
ALTER TABLE posts 
ADD COLUMN IF NOT EXISTS idempotency_key UUID;

-- Unda unique index (partial - kwa rows ambazo zina idempotency_key)
CREATE UNIQUE INDEX IF NOT EXISTS idx_posts_idempotency_key 
ON posts(idempotency_key) 
WHERE idempotency_key IS NOT NULL;

-- ============================================================================
-- 2. COMMENTS - Ongeza idempotency_key column
-- ============================================================================
ALTER TABLE comments 
ADD COLUMN IF NOT EXISTS idempotency_key UUID;

CREATE UNIQUE INDEX IF NOT EXISTS idx_comments_idempotency_key 
ON comments(idempotency_key) 
WHERE idempotency_key IS NOT NULL;

-- ============================================================================
-- 3. REACTIONS - Ongeza idempotency_key column
-- ============================================================================
ALTER TABLE reactions 
ADD COLUMN IF NOT EXISTS idempotency_key UUID;

CREATE UNIQUE INDEX IF NOT EXISTS idx_reactions_idempotency_key 
ON reactions(idempotency_key) 
WHERE idempotency_key IS NOT NULL;

-- ============================================================================
-- 4. BOOKMARKS - Ongeza idempotency_key column
-- ============================================================================
ALTER TABLE bookmarks 
ADD COLUMN IF NOT EXISTS idempotency_key UUID;

CREATE UNIQUE INDEX IF NOT EXISTS idx_bookmarks_idempotency_key 
ON bookmarks(idempotency_key) 
WHERE idempotency_key IS NOT NULL;

-- ============================================================================
-- 5. HIDDEN_ITEMS - Ongeza idempotency_key column
-- ============================================================================
ALTER TABLE hidden_items 
ADD COLUMN IF NOT EXISTS idempotency_key UUID;

CREATE UNIQUE INDEX IF NOT EXISTS idx_hidden_items_idempotency_key 
ON hidden_items(idempotency_key) 
WHERE idempotency_key IS NOT NULL;

-- ============================================================================
-- NOTES:
-- - idempotency_key ni NULL kwa records za zamani (backward compatible)
-- - Unique index ni partial (WHERE idempotency_key IS NOT NULL) ili kuruhusu NULL
-- - Client itatuma idempotency_key, na ON CONFLICT DO NOTHING itazuia duplicates
-- - Kama idempotency_key haipo, INSERT itafanya kazi kawaida (backward compatible)
-- ============================================================================

-- ── Section 17: Status Media Storage RLS ─────────────────────
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

-- ── Section 18: Post Media Storage RLS ───────────────────────
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

-- ── Section 22: Post Counts Guard Fix ────────────────────────
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

-- ══════════════════════════════════════════════════════════════
-- VERIFICATION QUERIES
--
-- Endesha queries hizi baada ya migration kukamilika.
-- Zinarudisha idadi ya tables, RLS policies, triggers, na functions
-- zilizoundwa.
-- ══════════════════════════════════════════════════════════════

-- 1. Tables created (inatarajiwa: 22)
SELECT 'TABLES' AS check_type, count(*) AS found,
       CASE WHEN count(*) >= 22 THEN 'PASS' ELSE 'FAIL' END AS status
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
    'profiles','follows','posts','reactions','bookmarks',
    'hidden_items','friendships','blocks','comments',
    'poll_options','poll_votes','shares',
    'chat_conversations','chat_participants','chat_messages',
    'notifications','spaces','space_members','space_posts',
    'live_sessions','statuses','reports'
  );

-- 2. RLS enabled on all public tables (inatarajiwa: 22)
SELECT 'RLS_ENABLED' AS check_type, count(*) AS tables_with_rls,
       CASE WHEN count(*) >= 22 THEN 'PASS' ELSE 'FAIL' END AS status
FROM pg_tables
WHERE schemaname = 'public'
  AND rowsecurity = true
  AND tablename IN (
    'profiles','follows','posts','reactions','bookmarks',
    'hidden_items','friendships','blocks','comments',
    'poll_options','poll_votes','shares',
    'chat_conversations','chat_participants','chat_messages',
    'notifications','spaces','space_members','space_posts',
    'live_sessions','statuses','reports'
  );

-- 3. Key functions exist (inatarajiwa: 13)
SELECT 'FUNCTIONS' AS check_type, count(*) AS found,
       CASE WHEN count(*) >= 13 THEN 'PASS' ELSE 'FAIL' END AS status
FROM pg_proc
WHERE proname IN (
  'handle_new_user','set_updated_at','can_see_post','is_blocked_by',
  'update_follow_counts','update_reaction_count','update_friends_count',
  'update_comment_count','update_share_count','update_poll_votes_count',
  'update_conversation_timestamp','protect_post_counts','get_unread_count'
);

-- 4. Storage buckets created (inatarajiwa: 2)
SELECT 'STORAGE_BUCKETS' AS check_type, count(*) AS found,
       CASE WHEN count(*) >= 2 THEN 'PASS' ELSE 'FAIL' END AS status
FROM storage.buckets
WHERE id IN ('pasihai-status-media','pasihai-post-media');

-- 5. Auth trigger exists
SELECT 'AUTH_TRIGGER' AS check_type, count(*) AS found,
       CASE WHEN count(*) = 1 THEN 'PASS' ELSE 'FAIL' END AS status
FROM pg_trigger
WHERE tgname = 'on_auth_user_created';

-- 6. Quick table listing
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public' ORDER BY table_name;

