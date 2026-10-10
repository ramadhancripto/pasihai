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
