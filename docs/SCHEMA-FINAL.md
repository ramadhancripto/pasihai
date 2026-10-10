# PASIHAI — Schema Proposal ya Mwisho (Hatua ya 3B)

**Tarehe:** 2026-10-09
**Msingi:** `docs/SCHEMA-PROPOSAL-v2.md`
**Status:** PROPOSAL YA MWISHO — inasubiri idhini kabla ya migration.
**Supabase project:** `lbcpacijbiukqcpkfktp`

---

## 0. MAAMUZI YALIYOKUBALIWA

| # | Maamuzi | Athari kwenye Schema |
|---|---|---|
| 1 | `entity_type` ibaki `'person'` kwa watu binafsi | `friendships` inaeleza urafiki; `entity_type` haibadiliki |
| 2 | `posts.kind='liveActivity'` = tangazo la live kwenye feed | `live_sessions` = table tofauti (Phase D baadaye) |
| 3 | `shares` table katika phase inayofaa | Si counter pekee — inafuatilia nani alishiriki |
| 4 | `poll_options` table + `poll_votes` table | Constraints za kura na ownership zimefafanuliwa |
| 5 | Full-text search kwa posts tu (Home feed) | Message search inaahirishwa hadi chat access control |
| 6 | `spaces.slug` auto-generated, unique, inabadilishwa | System inatengeneza; mtumiaji anaweza kubadilisha |

---

## 1. DEPENDENCY ANALYSIS YA PHASE A

### 1.1 Kazi za `feedService.js` na Dependencies Zake

| feedService Function | Repository Call | Table Inayohitajika |
|---|---|---|
| `getFeed({ tab, filter })` | `contentRepository.listFeed()` | `posts` |
| `getFeed()` — Channels tab | `identityRepository.listFollowed()` | `follows` |
| `getFeed()` — visibility filter | `isVisible()` → `ctx.followed` | `follows` |
| `loadFeedState()` — likes | `contentRepository.listLikes()` | `reactions` |
| `loadFeedState()` — saved | `contentRepository.listSaved()` | `bookmarks` |
| `loadFeedState()` — hidden | `contentRepository.listHidden()` | `hidden_items` |
| `loadFeedState()` — votes | `contentRepository.listVotes()` | `poll_votes` |
| `loadFeedState()` — vocabulary | `catalogRepository.getEntityVocabulary()` | *(app-side, si DB)* |
| `loadFeedState()` — directory | `identityRepository.listUsers()` | `profiles` |
| `toggleLike()` | `contentRepository.toggleLike()` | `reactions` |
| `createPost()` | `contentRepository.addPost()` | `posts` |

### 1.2 RLS ya `posts` — Dependencies

| Visibility Level | Sheria | Tables Zinazohitajika |
|---|---|---|
| `public` | Wote wanaona | *(hakuna dependency)* |
| `private` | Mwandishi pekee | *(hakuna dependency)* |
| `followers` | Friends + followed entities | `follows` + `friendships` |
| **Blocked users** | Hawaoni posts za blocker | `blocks` |

### 1.3 Hitimisho la Dependencies

**Phase A Core** (Home feed LOADING — 4 tables):
1. `profiles` — msingi wa utambulisho
2. `follows` — kufuatilia channels/creators (TAB_RULES zinahitaji)
3. `posts` — machapisho
4. `reactions` — kupenda (enriched feed items)

**Phase A Extended** (Home feed INTERACTIONS — 4 tables zaidi):
5. `bookmarks` — kuhifadhi posts
6. `hidden_items` — kuficha posts
7. `friendships` — visibility='followers' inahitaji hii
8. `blocks` — RLS ya posts inahitaji hii

**Kwa sasa, tunapendekeza Phase A = Core + Extended (8 tables zote)** kwa sababu:
- Bila `friendships`, RLS ya posts haiwezi kuthibitisha visibility='followers'
- Bila `blocks`, blocked users wanaweza kuona posts zote
- Bila `bookmarks`, toggleSaved haifanyi kazi
- Bila `hidden_items`, hidePost haifanyi kazi

---

## 2. PHASE A — SCHEMA KAMILI (8 Tables)

### 2.1 `profiles` (Migration 001)

**Inalingana na:** `mock.users` + `mock.me` + `identityRepository`

```sql
-- Migration: 001_profiles.sql

CREATE TABLE profiles (
  user_id       UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username      TEXT UNIQUE NOT NULL
                  CHECK (char_length(username) >= 3 AND char_length(username) <= 30),
  display_name  TEXT NOT NULL
                  CHECK (char_length(display_name) >= 1 AND char_length(display_name) <= 60),
  entity_type   TEXT NOT NULL DEFAULT 'person'
                  CHECK (entity_type IN (
                    'person','channel','hub','community','business','creator')),
  avatar_url    TEXT,
  avatar_tone   TEXT NOT NULL DEFAULT 'green'
                  CHECK (avatar_tone IN (
                    'green','blue','gold','clay','plum','slate','teal')),
  bio           TEXT DEFAULT '' CHECK (char_length(bio) <= 500),
  category      TEXT,
  verified      BOOLEAN NOT NULL DEFAULT FALSE,
  -- Denormalized counts (zinasasishwa na triggers — SI source of truth)
  friends_count   INT NOT NULL DEFAULT 0 CHECK (friends_count >= 0),
  followers_count INT NOT NULL DEFAULT 0 CHECK (followers_count >= 0),
  following_count INT NOT NULL DEFAULT 0 CHECK (following_count >= 0),
  posts_count     INT NOT NULL DEFAULT 0 CHECK (posts_count >= 0),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at    TIMESTAMPTZ
);

CREATE INDEX idx_profiles_username ON profiles(username) WHERE deleted_at IS NULL;
CREATE INDEX idx_profiles_type ON profiles(entity_type) WHERE deleted_at IS NULL;

-- Full-text search (kwa kutafuta watumiaji — Home feed pekee kwa sasa)
ALTER TABLE profiles ADD COLUMN fts TSVECTOR
  GENERATED ALWAYS AS (
    setweight(to_tsvector('simple', coalesce(display_name, '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(username, '')), 'B')
  ) STORED;
CREATE INDEX idx_profiles_fts ON profiles USING GIN(fts);
```

**Auth Integration (usalama wa kuunganisha na `auth.users`):**

```sql
-- Trigger: auto-create profile on signup
-- Hii inaenda kwa SECURITY DEFINER ili iweze kuandika profiles
-- hata kama mtumiaji bado hana RLS policy ya INSERT.
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (user_id, username, display_name, avatar_tone)
  VALUES (
    NEW.id,
    COALESCE(
      NEW.raw_user_meta_data->>'username',
      'user_' || substr(replace(NEW.id::text, '-', ''), 1, 8)
    ),
    COALESCE(
      NEW.raw_user_meta_data->>'display_name',
      COALESCE(NEW.raw_user_meta_data->>'full_name', 'Mtumiaji Mpya')
    ),
    'green'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
```

**Kuzuia akaunti za uongo:**
- Profile inaweza kuundwa TU na trigger (baada ya `auth.users` INSERT)
- Hakuna INSERT policy ya kawaida kwa profiles
- `user_id` ni FK kwa `auth.users` — haiwezi kuwa na profile bila auth account
- Trigger inatumia `SECURITY DEFINER` kwa sababu ni njia pekee ya kuunda profile

```sql
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- SELECT: Yeyote aliyeingia anaweza kusoma profiles za wazi
CREATE POLICY "profiles_select_all" ON profiles
  FOR SELECT TO authenticated
  USING (deleted_at IS NULL);

-- INSERT: Trigger pekee (hakuna policy ya INSERT)
-- Hii inamaanisha mtumiaji wa kawaida HAWEZI kuunda profile moja kwa moja

-- UPDATE: Mtumiaji anaweza kubadilisha profile yake PEKEE
CREATE POLICY "profiles_update_own" ON profiles
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
```

---

### 2.2 `follows` (Migration 002)

**Inalingana na:** `identityRepository.toggleFollow()` + `passesChannelGate()` ya feedService

```sql
-- Migration: 002_follows.sql

CREATE TABLE follows (
  follower_id UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  followee_id UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (follower_id, followee_id),
  CHECK (follower_id != followee_id)
);

CREATE INDEX idx_follows_followee ON follows(followee_id);

-- Trigger: count updates
CREATE OR REPLACE FUNCTION update_follow_counts()
RETURNS TRIGGER AS $$
BEGIN
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
```

**RLS:**
```sql
ALTER TABLE follows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "follows_select_all" ON follows
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "follows_insert_own" ON follows
  FOR INSERT TO authenticated
  WITH CHECK (follower_id = auth.uid());

CREATE POLICY "follows_delete_own" ON follows
  FOR DELETE TO authenticated
  USING (follower_id = auth.uid());
```

---

### 2.3 `posts` (Migration 003)

**Inalingana na:** `mock.posts` + `mock.reels` + `feedMapper.mapPost()` + `feedMapper.mapReel()`

```sql
-- Migration: 003_posts.sql

CREATE TABLE posts (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id   UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  kind        TEXT NOT NULL CHECK (kind IN (
                'text','image','video','audio','poll',
                'announcement','reel','product','event','liveActivity')),
  text        TEXT,

  -- Media (nullable)
  media_url   TEXT,
  media_meta  JSONB DEFAULT '{}'::jsonb,

  -- Poll (nullable, kwa kind='poll')
  -- poll_question/options ziko kwenye poll_options table (migration 010)

  -- Highlights + CTA (kwa announcements/products/events)
  highlights  JSONB,
  cta         JSONB,
  label       TEXT,

  -- Live activity reference (nullable — kwa kind='liveActivity' pekee)
  -- Inarejelea live_sessions iliyopo au iliyopita
  live_session_id UUID,  -- FK itaongezwa Phase D (live_sessions table)

  -- Visibility (kulingana na isVisible() ya feedService.js)
  visibility  TEXT NOT NULL DEFAULT 'public'
                CHECK (visibility IN ('public','followers','private')),

  -- Engagement (denormalized)
  reactions_count INT NOT NULL DEFAULT 0 CHECK (reactions_count >= 0),
  comments_count  INT NOT NULL DEFAULT 0 CHECK (comments_count >= 0),
  shares_count    INT NOT NULL DEFAULT 0 CHECK (shares_count >= 0),

  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at  TIMESTAMPTZ
);

-- Feed query indexes
CREATE INDEX idx_posts_feed_public
  ON posts(created_at DESC)
  WHERE deleted_at IS NULL AND visibility = 'public';

CREATE INDEX idx_posts_feed_author
  ON posts(author_id, created_at DESC)
  WHERE deleted_at IS NULL AND visibility IN ('public','followers');

CREATE INDEX idx_posts_kind
  ON posts(kind, created_at DESC)
  WHERE deleted_at IS NULL;

-- Full-text search (kwa Home feed search — posts pekee)
ALTER TABLE posts ADD COLUMN fts TSVECTOR
  GENERATED ALWAYS AS (
    setweight(to_tsvector('simple', coalesce(text, '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(label, '')), 'B')
  ) STORED;
CREATE INDEX idx_posts_fts ON posts USING GIN(fts)
  WHERE deleted_at IS NULL;
```

**Helper function kwa RLS ya posts:**

```sql
-- Helper: Je, mtumiaji anaweza kuona post hii?
-- Phase A: public + private + author pekee.
-- Baada ya friendships na blocks (Phase A+): followers visibility + blocked filtering.
CREATE OR REPLACE FUNCTION can_see_post(post_row posts)
RETURNS BOOLEAN AS $$
DECLARE
  v_user UUID := auth.uid();
BEGIN
  IF post_row.deleted_at IS NOT NULL THEN RETURN FALSE; END IF;
  IF post_row.author_id = v_user THEN RETURN TRUE; END IF;
  IF post_row.visibility = 'public' THEN RETURN TRUE; END IF;
  IF post_row.visibility = 'private' THEN RETURN FALSE; END IF;
  -- 'followers': baada ya friendships na blocks kuwepo, hapa ndipo
  -- tunakagua urafiki na kufuata. Kwa sasa (Phase A), 'followers'
  -- inafanya kazi kama 'public' kwa wote walioingia (temporary).
  -- Itasasishwa Phase A+ (baada ya migration 007/008).
  IF post_row.visibility = 'followers' THEN
    -- Je, ninamfuata mwandishi?
    IF EXISTS (
      SELECT 1 FROM follows WHERE follower_id = v_user AND followee_id = post_row.author_id
    ) THEN RETURN TRUE; END IF;
    -- Je, ni rafiki? (Phase A+: itatumia friendships view)
    -- Kwa sasa, rudi FALSE (fail-closed)
    RETURN FALSE;
  END IF;
  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Helper: Je, mtumiaji amezuiliwa na mwandishi wa post?
-- Kwa sasa inarudisha FALSE (hakuna blocks bado).
-- Itasasishwa Phase A+ (baada ya migration 008).
CREATE OR REPLACE FUNCTION is_blocked_by(blocked_user UUID, blocker UUID)
RETURNS BOOLEAN AS $$
BEGIN
  -- Phase A: hakuna blocks table bado — rudi FALSE
  -- Baada ya migration 008, hii itabadilishwa:
  --   RETURN EXISTS (SELECT 1 FROM blocks WHERE blocker_id = blocker AND blocked_id = blocked_user);
  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;
```

**RLS:**
```sql
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "posts_select_visible" ON posts
  FOR SELECT TO authenticated
  USING (can_see_post(posts) AND NOT is_blocked_by(auth.uid(), author_id));

CREATE POLICY "posts_insert_own" ON posts
  FOR INSERT TO authenticated
  WITH CHECK (author_id = auth.uid());

CREATE POLICY "posts_update_own" ON posts
  FOR UPDATE TO authenticated
  USING (author_id = auth.uid())
  WITH CHECK (author_id = auth.uid());

-- Soft delete: UPDATE deleted_at (si hard DELETE)
CREATE POLICY "posts_soft_delete_own" ON posts
  FOR UPDATE TO authenticated
  USING (author_id = auth.uid())
  WITH CHECK (author_id = auth.uid());
```

**Uhusiano wa `kind='liveActivity'` na `live_sessions`:**

| `posts.kind` | Maana | Phase |
|---|---|---|
| `'liveActivity'` | Tangazo la live kwenye feed (mfano: "Nipo hewani sasa!") | A (sasa) |
| `live_sessions` table | Kikao HALISI cha moja kwa moja (viewers, speakers, state) | D (baadaye) |

Kwa Phase A, `posts.kind='liveActivity'` ni post ya kawaida yenye:
- `text` = maelezo ya live
- `live_session_id` = NULL (live_sessions table haipo bado)
- Inaonekana kwenye Mchanganyiko tab (kama post nyingine)

Phase D itaongeza: `live_session_id` FK kwa `live_sessions`, na `live_sessions` table yenye lifecycle kamili.

---

### 2.4 `reactions` (Migration 004)

```sql
-- Migration: 004_reactions.sql

CREATE TABLE reactions (
  user_id     UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  post_id     UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  emoji       TEXT NOT NULL DEFAULT 'like'
                CHECK (emoji IN ('like','heart','clap','fire','laugh','sad')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, post_id)
);

CREATE INDEX idx_reactions_post ON reactions(post_id);

-- Trigger: count
CREATE OR REPLACE FUNCTION update_reaction_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE posts SET reactions_count = reactions_count + 1 WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE posts SET reactions_count = GREATEST(0, reactions_count - 1) WHERE id = OLD.post_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_reaction_count
  AFTER INSERT OR DELETE ON reactions
  FOR EACH ROW EXECUTE FUNCTION update_reaction_count();
```

**RLS:**
```sql
ALTER TABLE reactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "reactions_select_all" ON reactions
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "reactions_upsert_own" ON reactions
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "reactions_delete_own" ON reactions
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());
```

---

### 2.5 `bookmarks` (Migration 005)

**Inalingana na:** `contentRepository.toggleSaved()` + `saveEntity()` + `session.saved` + `session.savedEntities`

```sql
-- Migration: 005_bookmarks.sql

CREATE TABLE bookmarks (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  ref_type    TEXT NOT NULL CHECK (ref_type IN ('post','entity')),
  ref_id      UUID NOT NULL,
  meta        JSONB DEFAULT '{}'::jsonb,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, ref_type, ref_id)
);

CREATE INDEX idx_bookmarks_user ON bookmarks(user_id, created_at DESC);
```

**RLS:**
```sql
ALTER TABLE bookmarks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "bookmarks_select_own" ON bookmarks
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "bookmarks_upsert_own" ON bookmarks
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "bookmarks_delete_own" ON bookmarks
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());
```

---

### 2.6 `hidden_items` (Migration 006)

**Inalingana na:** `contentRepository.hideItem()` + `session.hidden`

```sql
-- Migration: 006_hidden_items.sql

CREATE TABLE hidden_items (
  user_id     UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  post_id     UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, post_id)
);
```

**RLS:**
```sql
ALTER TABLE hidden_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "hidden_select_own" ON hidden_items
  FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY "hidden_insert_own" ON hidden_items
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE POLICY "hidden_delete_own" ON hidden_items
  FOR DELETE TO authenticated USING (user_id = auth.uid());
```

---

### 2.7 `friendships` (Migration 007)

**Inalingana na:** `entityActions.friend` + `ring: 'friend'` + `friends` view kwenye feedService visibility

```sql
-- Migration: 007_friendships.sql

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

-- View: urafiki uliokubalika (pande mbili)
CREATE OR REPLACE VIEW friends AS
SELECT requester_id AS user_a, addressee_id AS user_b, updated_at AS friends_since
FROM friendships WHERE status = 'accepted'
UNION
SELECT addressee_id AS user_a, requester_id AS user_b, updated_at AS friends_since
FROM friendships WHERE status = 'accepted';

-- Trigger: count
CREATE OR REPLACE FUNCTION update_friends_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.status = 'accepted' AND OLD.status != 'accepted' THEN
    UPDATE profiles SET friends_count = friends_count + 1
      WHERE user_id IN (NEW.requester_id, NEW.addressee_id);
  ELSIF TG_OP = 'UPDATE' AND NEW.status != 'accepted' AND OLD.status = 'accepted' THEN
    UPDATE profiles SET friends_count = GREATEST(0, friends_count - 1)
      WHERE user_id IN (NEW.requester_id, NEW.addressee_id);
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_friends_count
  AFTER UPDATE ON friendships
  FOR EACH ROW EXECUTE FUNCTION update_friends_count();
```

**RLS:**
```sql
ALTER TABLE friendships ENABLE ROW LEVEL SECURITY;

CREATE POLICY "friendships_select_own" ON friendships
  FOR SELECT TO authenticated
  USING (requester_id = auth.uid() OR addressee_id = auth.uid());

CREATE POLICY "friendships_insert_own" ON friendships
  FOR INSERT TO authenticated
  WITH CHECK (requester_id = auth.uid() AND requester_id != addressee_id);

CREATE POLICY "friendships_update_own" ON friendships
  FOR UPDATE TO authenticated
  USING (addressee_id = auth.uid() OR requester_id = auth.uid());
```

**Baada ya migration hii, sasisha `can_see_post()`:**
```sql
-- Migration: 007b_update_can_see_post.sql
-- Ongeza friendship check kwenye can_see_post()
CREATE OR REPLACE FUNCTION can_see_post(post_row posts)
RETURNS BOOLEAN AS $$
DECLARE
  v_user UUID := auth.uid();
BEGIN
  IF post_row.deleted_at IS NOT NULL THEN RETURN FALSE; END IF;
  IF post_row.author_id = v_user THEN RETURN TRUE; END IF;
  IF post_row.visibility = 'public' THEN RETURN TRUE; END IF;
  IF post_row.visibility = 'private' THEN RETURN FALSE; END IF;
  IF post_row.visibility = 'followers' THEN
    -- Je, ni rafiki?
    IF EXISTS (
      SELECT 1 FROM friendships WHERE status = 'accepted'
        AND ((requester_id = post_row.author_id AND addressee_id = v_user)
          OR (addressee_id = post_row.author_id AND requester_id = v_user))
    ) THEN RETURN TRUE; END IF;
    -- Je, ninamfuata?
    IF EXISTS (
      SELECT 1 FROM follows WHERE follower_id = v_user AND followee_id = post_row.author_id
    ) THEN RETURN TRUE; END IF;
    RETURN FALSE;
  END IF;
  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;
```

---

### 2.8 `blocks` (Migration 008)

```sql
-- Migration: 008_blocks.sql

CREATE TABLE blocks (
  blocker_id  UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  blocked_id  UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (blocker_id, blocked_id),
  CHECK (blocker_id != blocked_id)
);

CREATE INDEX idx_blocks_blocker ON blocks(blocker_id);
```

**RLS:**
```sql
ALTER TABLE blocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "blocks_select_own" ON blocks
  FOR SELECT TO authenticated USING (blocker_id = auth.uid());

CREATE POLICY "blocks_insert_own" ON blocks
  FOR INSERT TO authenticated WITH CHECK (blocker_id = auth.uid());

CREATE POLICY "blocks_delete_own" ON blocks
  FOR DELETE TO authenticated USING (blocker_id = auth.uid());
```

**Baada ya migration hii, sasisha `is_blocked_by()`:**
```sql
-- Migration: 008b_update_is_blocked_by.sql
CREATE OR REPLACE FUNCTION is_blocked_by(blocked_user UUID, blocker UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM blocks WHERE blocker_id = blocker AND blocked_id = blocked_user
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;
```

---

## 3. PHASES ZA BAADAYE (Muhtasari)

### Phase B: Content Interactions
| Migration | Table | Maelezo |
|---|---|---|
| 009 | `comments` | Maoni kwenye posts (threaded) |
| 010 | `poll_options` + `poll_votes` | Kura za poll (angalia chini) |
| 011 | `shares` | Kushiriki posts (angalia chini) |
| 012 | `reports` | Kuripoti content |

### Phase C: Live Sessions
| Migration | Table | Maelezo |
|---|---|---|
| 013 | `live_sessions` | Vikao vya moja kwa moja |
| 014 | `live_participants` | Washiriki wa live |

### Phase D: Chat
| Migration | Table | Maelezo |
|---|---|---|
| 015 | `conversations` | Mazungumzo (direct + group) |
| 016 | `conversation_members` | Wanachama wa mazungumzo |
| 017 | `messages` | Jumbe za chat |

### Phase E: Spaces
| Migration | Table | Maelezo |
|---|---|---|
| 018 | `spaces` | Hubs + Communities + Channels |
| 019 | `space_members` | Wanachama wa spaces |

### Phase F: Auxiliary
| Migration | Table | Maelezo |
|---|---|---|
| 020 | `notifications` | Taarifa |
| 021 | `statuses` | Stories (saa 24) |

---

## 4. `poll_options` + `poll_votes` (Phase B — Muundo)

```sql
CREATE TABLE poll_options (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id     UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  label       TEXT NOT NULL CHECK (char_length(label) > 0 AND char_length(label) <= 200),
  position    INT NOT NULL CHECK (position >= 0),
  votes_count INT NOT NULL DEFAULT 0 CHECK (votes_count >= 0),
  UNIQUE (post_id, position)
);

CREATE TABLE poll_votes (
  post_id     UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  option_id   UUID NOT NULL REFERENCES poll_options(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (post_id, user_id),  -- kura MOJA kwa kila mtumiaji kwa kila poll
  UNIQUE (user_id, post_id)         -- redundant na PK, lakini wazi
);

-- Trigger: sasisha votes_count
CREATE OR REPLACE FUNCTION update_poll_option_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE poll_options SET votes_count = votes_count + 1 WHERE id = NEW.option_id;
    UPDATE posts SET poll_total = COALESCE(poll_total, 0) + 1 WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE poll_options SET votes_count = GREATEST(0, votes_count - 1) WHERE id = OLD.option_id;
    UPDATE posts SET poll_total = GREATEST(0, COALESCE(poll_total, 0) - 1) WHERE id = OLD.post_id;
  ELSIF TG_OP = 'UPDATE' AND NEW.option_id != OLD.option_id THEN
    -- Kura imebadilishwa: punguza ya zamani, ongeza mpya
    UPDATE poll_options SET votes_count = GREATEST(0, votes_count - 1) WHERE id = OLD.option_id;
    UPDATE poll_options SET votes_count = votes_count + 1 WHERE id = NEW.option_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_poll_option_count
  AFTER INSERT OR DELETE OR UPDATE ON poll_votes
  FOR EACH ROW EXECUTE FUNCTION update_poll_option_count();
```

**RLS:**
```sql
ALTER TABLE poll_options ENABLE ROW LEVEL SECURITY;
-- SELECT: yeyote anaweza kuona options za poll (kama anaweza kuona post)
CREATE POLICY "poll_options_select" ON poll_options
  FOR SELECT TO authenticated
  USING (can_see_post((SELECT p FROM posts p WHERE p.id = post_id LIMIT 1)));
-- INSERT: mwandishi wa post pekee
CREATE POLICY "poll_options_insert_author" ON poll_options
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT author_id FROM posts WHERE id = post_id LIMIT 1) = auth.uid());

ALTER TABLE poll_votes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "poll_votes_select" ON poll_votes
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "poll_votes_upsert_own" ON poll_votes
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "poll_votes_update_own" ON poll_votes
  FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "poll_votes_delete_own" ON poll_votes
  FOR DELETE TO authenticated USING (user_id = auth.uid());
```

**Constraints muhimu:**
- `PRIMARY KEY (post_id, user_id)` = kura MOJA kwa kila mtumiaji kwa kila poll
- `poll_options.position` UNIQUE per post = hakuna nafasi zinazojirudia
- `poll_votes.option_id` FK kwa `poll_options` = kura lazima iwe kwa option halali
- Trigger inasasisha `votes_count` na `poll_total` moja kwa moja

---

## 5. `shares` TABLE (Phase B — Muundo)

```sql
CREATE TABLE shares (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  post_id     UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  -- Njia ya kushiriki (optional metadata)
  channel     TEXT,  -- 'chat' | 'copy_link' | 'external' | 'repost'
  target_id   UUID,  -- conversation_id (kwa chat shares)
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, post_id, channel)  -- mtumiaji anaweza kushiriki post moja kwa njia tofauti
);

CREATE INDEX idx_shares_post ON shares(post_id, created_at DESC);

-- Trigger: count
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

CREATE TRIGGER trg_share_count
  AFTER INSERT OR DELETE ON shares
  FOR EACH ROW EXECUTE FUNCTION update_share_count();
```

**RLS:**
```sql
ALTER TABLE shares ENABLE ROW LEVEL SECURITY;
CREATE POLICY "shares_select_all" ON shares
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "shares_insert_own" ON shares
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "shares_delete_own" ON shares
  FOR DELETE TO authenticated USING (user_id = auth.uid());
```

---

## 6. `spaces.slug` — Auto-Generation (Phase E)

```sql
-- Function: tengeneza slug kutoka jina
CREATE OR REPLACE FUNCTION generate_slug(name TEXT, table_name TEXT)
RETURNS TEXT AS $$
DECLARE
  base TEXT;
  slug TEXT;
  suffix TEXT;
  counter INT := 0;
BEGIN
  -- Safisha jina: lowercase, badilisha nafasi kuwa '-', ondoa herufi zisizo halali
  base := lower(regexp_replace(name, '[^a-zA-Z0-9\s-]', '', 'g'));
  base := regexp_replace(base, '[\s]+', '-', 'g');
  base := left(base, 40);
  slug := base;

  -- Kagua uniqueness
  LOOP
    IF table_name = 'spaces' THEN
      IF NOT EXISTS (SELECT 1 FROM spaces WHERE slug = slug) THEN
        RETURN slug;
      END IF;
    END IF;
    counter := counter + 1;
    suffix := substr(md5(random()::text), 1, 4);
    slug := base || '-' || suffix;
    IF counter > 10 THEN
      RAISE EXCEPTION 'Haiwezi kutengeneza slug ya kipekee';
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;
```

**Mtumiaji anaweza kubadilisha slug:**
- RLS inaruhusu UPDATE kwenye spaces kwa owner pekee
- UNIQUE constraint inazuia slug zinazojirudia
- Application layer inapendekeza slug mpya kabla ya kuhifadhi

---

## 7. MOCK DATA MIGRATION PLAN

### 7.1 Kanuni

1. **Hakuna data ya mock itakayoingia production.** Mock ni kwa majaribio pekee.
2. **Seed data itatengenezwa kwa majaribio** (staging environment) kupitia Supabase seed files.
3. **Production database itaanza tupu** — watumiaji watajiandikisha kupitia Auth.

### 7.2 Seed Data (kwa majaribio/staging)

```
supabase/
  seed/
    001_profiles.sql      -- Profiles 10 za majaribio (kutoka mock users)
    002_follows.sql       -- Follows za majaribio
    003_posts.sql         -- Posts 12 za majaribio (kutoka mock posts)
    004_reactions.sql     -- Reactions za majaribio
    005_bookmarks.sql     -- Bookmarks za majaribio
```

### 7.3 Jinsi Mock Inavyobadilishwa

| Mock Concept | Seed SQL | Maelezo |
|---|---|---|
| `users.amina` | `INSERT INTO profiles (user_id, username, ...)` | `user_id` = UUID ya test account |
| `posts.p1` | `INSERT INTO posts (id, author_id, kind, text, ...)` | `author_id` = UUID ya profile |
| `reels.r1` | `INSERT INTO posts (kind='reel', ...)` | Reels = posts |
| `session.liked` | `INSERT INTO reactions (user_id, post_id, ...)` | |
| `session.saved` | `INSERT INTO bookmarks (user_id, ref_type='post', ref_id, ...)` | |

### 7.4 Utaratibu wa Seed

```bash
# Kwa staging/testing PEKEE
supabase db seed        # Endesha seed files
supabase db reset       # Futa + migrate + seed

# Kwa production
# HAKUNA seed — database inaanza tupu
```

### 7.5 Kuzuia Mock Kuingia Production

- Seed files ziko kwenye `supabase/seed/` — Supabase CLI haziendeshi kwenze `supabase db push`
- `.env.local` ya production haina `SUPABASE_SEED=true`
- CI/CD pipeline haina seed step kwa production

---

## 8. MPANGO WA MAJARIBIO (Test Plan)

### 8.1 RLS Tests (pgTAP au Supabase SQL tests)

**Test runner:** `supabase db test` (inaendesha SQL tests kwenye database ya majaribio)

#### Profiles Tests
```sql
-- test/001_profiles.sql
BEGIN;
SELECT plan(8);

-- 1. Profile inaundwa na trigger baada ya auth signup
SELECT is(
  (SELECT count(*) FROM profiles WHERE user_id = '...test_uuid...'),
  1,
  'Profile inaundwa na trigger'
);

-- 2. Mtumiaji anaweza kusoma profile yake
SELECT is(
  (SELECT display_name FROM profiles WHERE user_id = auth.uid()),
  'Test User',
  'Mtumiaji anasoma profile yake'
);

-- 3. Mtumiaji anaweza kubadilisha profile yake
UPDATE profiles SET bio = 'Updated' WHERE user_id = auth.uid();
SELECT is(
  (SELECT bio FROM profiles WHERE user_id = auth.uid()),
  'Updated',
  'Mtumiaji anabadilisha profile yake'
);

-- 4. Mtumiaji HAWEZI kubadilisha profile ya mtu mwingine
SELECT throws_ok(
  $$UPDATE profiles SET bio = 'Hacked' WHERE user_id != auth.uid()$$,
  'new row violates row-level security policy',
  'Mtumiaji hawezi kubadilisha profile ya mwingine'
);

-- 5. Mtumiaji HAWEZI kuunda profile moja kwa moja
SELECT throws_ok(
  $$INSERT INTO profiles (user_id, username, display_name) VALUES (gen_random_uuid(), 'fake', 'Fake')$$,
  'new row violates row-level security policy',
  'Mtumiaji hawezi kuunda profile bila trigger'
);

-- 6. Deleted profile haionekani
-- 7. Username ni unique
-- 8. entity_type check constraint

SELECT * FROM finish();
ROLLBACK;
```

#### Posts Tests
```sql
-- test/003_posts.sql
BEGIN;
SELECT plan(12);

-- 1. Mtumiaji anaweza kuunda post
-- 2. Post ya public inaonekana na wote
-- 3. Post ya private inaonekana na mwandishi pekee
-- 4. Post ya followers: rafiki anaona
-- 5. Post ya followers: asiye rafiki haoni
-- 6. Post ya followers: aliyefuata anaona
-- 7. Blocked user HAONI post
-- 8. Mtumiaji anaweza kubadilisha post yake
-- 9. Mtumiaji HAWEZI kubadilisha post ya mwingine
-- 10. Soft delete (deleted_at) inafanya kazi
-- 11. Deleted post haionekani
-- 12. kind check constraint

SELECT * FROM finish();
ROLLBACK;
```

#### Visibility Tests
```sql
-- test/visibility.sql
BEGIN;
SELECT plan(6);

-- 1. public post inaonekana na mtumiaji yeyote
-- 2. private post inaonekana na mwandishi pekee
-- 3. followers post: rafiki anaona (baada ya friendships)
-- 4. followers post: aliyefuata anaona (baada ya follows)
-- 5. followers post: asiye rafiki wala kufuata HAONI
-- 6. blocked user HAONI post yoyote ya blocker

SELECT * FROM finish();
ROLLBACK;
```

### 8.2 Integration Tests (feedService ↔ Supabase)

```javascript
// tests/feedService.integration.test.js (baadaye)
// Kwa sasa: smoke tests za sasa (461/461) zinaendelea kufanya kazi kwa mock mode

// Baada ya repository swap:
// 1. getFeed({ tab: 'mchanganyiko' }) inarudisha posts kutoka Supabase
// 2. getFeed({ tab: 'channels' }) inachuja channels zinazofuatwa
// 3. getFeed({ tab: 'friends' }) inachuja friends pekee
// 4. toggleLike(id) inabadilisha reactions table
// 5. createPost(draft) inaunda post kwenye Supabase
```

### 8.3 Rollback Tests

Kila migration itajaribiwa kwa:
1. Endesha migration → thibitisha tables/policies zipo
2. Endesha rollback → thibitisha tables/policies zimeondolewa
3. Endesha migration tena → thibitisha inafanya kazi

```bash
supabase migration up          # Endesha migration
supabase migration repair --status reverted 003  # Weka kama reverted
# Endesha DROP statements
supabase migration up          # Jaribu tena
```

---

## 9. ORodha YA FILES ZITAKAZOBADILIKA

### 9.1 Files Mpya (Zitakazotengenezwa)

| Njia | Maelezo | Phase |
|---|---|---|
| `supabase/migrations/001_profiles.sql` | Profiles table + auth trigger | A |
| `supabase/migrations/002_follows.sql` | Follows table + count trigger | A |
| `supabase/migrations/003_posts.sql` | Posts table + FTS + helpers | A |
| `supabase/migrations/004_reactions.sql` | Reactions table + count trigger | A |
| `supabase/migrations/005_bookmarks.sql` | Bookmarks table | A |
| `supabase/migrations/006_hidden_items.sql` | Hidden items table | A |
| `supabase/migrations/007_friendships.sql` | Friendships + friends view + count | A |
| `supabase/migrations/007b_update_can_see_post.sql` | Sasisha RLS helper | A |
| `supabase/migrations/008_blocks.sql` | Blocks table | A |
| `supabase/migrations/008b_update_is_blocked_by.sql` | Sasisha RLS helper | A |
| `supabase/seed/001_profiles.sql` | Seed profiles za majaribio | A |
| `supabase/seed/002_follows.sql` | Seed follows za majaribio | A |
| `supabase/seed/003_posts.sql` | Seed posts za majaribio | A |
| `supabase/tests/001_profiles.sql` | RLS tests za profiles | A |
| `supabase/tests/002_follows.sql` | RLS tests za follows | A |
| `supabase/tests/003_posts.sql` | RLS tests za posts | A |
| `supabase/tests/004_reactions.sql` | RLS tests za reactions | A |
| `supabase/tests/visibility.sql` | Visibility integration tests | A |
| `docs/SCHEMA-FINAL.md` | Ripoti hii | A |

### 9.2 Files Zilizopo Zisizobadilishwa

| Njia | Sababu |
|---|---|
| `src/**` (zote) | Hakuna mabadiliko ya UI au repository switch point |
| `src/data/repositories/index.js` | Mock mode inabaki — swap itafanyika Phase inayofuata |
| `src/data/mock.js` | Inabaki kwa mock mode |
| `src/lib/supabaseClient.js` | Inabaki (mode = 'mock') |
| `.env.example` | Inabaki |
| `.gitignore` | Inabaki |

---

## 10. MASWALI YALIYOBAKI

| # | Swali | Athari | Pendekezo |
|---|---|---|---|
| 1 | Je, `can_see_post()` inapaswa kutumia `STABLE` au `IMMUTABLE`? | Inaathiri query planner performance | `STABLE` — inasoma data lakini haibadiliki ndani ya query moja |
| 2 | Je, tunataka `updated_at` trigger kwa kila table? | Inasasisha timestamp moja kwa moja | Ndiyo, ongeza `trg_updated_at` generic trigger |
| 3 | Je, `posts.media_url` inapaswa kuwa na format validation? | Kuzuia URLs hatari | Ndiyo, CHECK constraint kwa `https://` prefix |

---

## 11. MUHTASARI WA PHASE A

| # | Migration | Table | Dependencies | RLS Policies |
|---|---|---|---|---|
| 1 | 001 | `profiles` | `auth.users` | SELECT(all), UPDATE(own), INSERT(trigger only) |
| 2 | 002 | `follows` | `profiles` | SELECT(all), INSERT(own), DELETE(own) |
| 3 | 003 | `posts` | `profiles` | SELECT(visible+!blocked), INSERT(own), UPDATE(own) |
| 4 | 004 | `reactions` | `profiles`, `posts` | SELECT(all), INSERT(own), DELETE(own) |
| 5 | 005 | `bookmarks` | `profiles` | SELECT(own), INSERT(own), DELETE(own) |
| 6 | 006 | `hidden_items` | `profiles`, `posts` | SELECT(own), INSERT(own), DELETE(own) |
| 7 | 007 | `friendships` | `profiles` | SELECT(own), INSERT(own), UPDATE(own) |
| 7b | 007b | *(function update)* | `friendships` | — |
| 8 | 008 | `blocks` | `profiles` | SELECT(own), INSERT(own), DELETE(own) |
| 8b | 008b | *(function update)* | `blocks` | — |

**Jumla: 8 tables + 2 function updates + 5 seed files + 5 test files = 20 files**

---

*Ripoti hii ni PROPOSAL YA MWISHO ya Hatua ya 3B. Hakuna migration wala table yoyote iliyoundwa. Inasubiri idhini yako kabla ya hatua inayofuata.*
