# PASIHAI — Supabase Schema Proposal v2 (Hatua ya 3A)

**Tarehe:** 2026-10-09
**Status:** PROPOSAL ILIYOBORESHWA — inasubiri idhini kabla ya migration yoyote.
**Baseline:** `661fcdb` (main)
**Supabase project:** `lbcpacijbiukqcpkfktp`

---

## 0. MABADILIKO KUTOKA v1 → v2

| # | Mabadiliko | Sababu |
|---|---|---|
| 1 | `live_sessions` = table tofauti (si ndani ya `posts`) | Maamuzi yaliyokubaliwa |
| 2 | Reels = ndani ya `posts` (`kind='reel'`) | Maamuzi yaliyokubaliwa |
| 3 | `bookmarks` table imeongezwa (posts + entities) | Maamuzi yaliyokubaliwa + contentRepository contract |
| 4 | `blocks` table imeongezwa | Maamuzi yaliyokubaliwa + chatRepository contract |
| 5 | Phone contacts = nje ya DB | Maamuzi yaliyokubaliwa |
| 6 | Visibility model imesasishwa: `public \| followers \| private` | Inalingana na `isVisible()` ya feedService.js |
| 7 | `posts.visibility` hauna `friends` kama level tofauti | Feed service inatumia `followers` = friends + followed |
| 8 | Mpango wa utekelezaji: Home feed kwanza (migration 1–4) | Usijenge tables zisizohitajika bado |
| 9 | RLS tests plan na rollback plan zimeongezwa | Usalama wa migration |
| 10 | Tofauti ya `posts` (live announcement) vs `live_sessions` (halisi) imfafanuliwa | Uwazi wa schema |

---

## 1. MUUNDO WA DATA HALISI (Kutoka Repositories)

### 1.1 Entity Model (`mock.js` + `identityRepository`)

```
Entity {
  id          : string (slug, e.g. 'amina')
  name        : string
  handle      : string (e.g. '@amina.said')
  type        : 'friend' | 'channel' | 'hub' | 'community' | 'business' | 'creator' | 'you'
  relationship: 'Rafiki' | 'Unafuatilia' | 'Hujafuatilia' | 'Umejiunga' | 'Biashara' | 'Wewe'
  avatarTone  : 'green' | 'blue' | 'gold' | 'clay' | 'plum' | 'slate' | 'teal'
  bio         : string
  verified    : boolean (channels pekee)
  category    : string (channels/hubs: 'Teknolojia', 'Elimu', ...)
  friends/following/followers: number (denormalized counts)
}
```

**Tofauti muhimu:**
- `type` = ROLE (aina ya entity, haibadiliki)
- `relationship` = uhusiano wangu na entity (inabadilika)
- Hizi ni TABAKA MBILI TOFAUTI (Role ≠ Relationship)

### 1.2 Feed Item Model (`feedMapper.js`)

```
FeedItem {
  id          : string ('p1' | 'reel-r1' | 'live-l1')
  kind        : 'text' | 'image' | 'video' | 'audio' | 'poll' |
                'announcement' | 'liveActivity' | 'reel'
  sourceKind  : string (kind ya awali kabla ya mapping)
  userId      : string → Entity.id
  relationship: string (kutoka Entity)
  ageMinutes  : number
  text        : string
  label       : string? ('Tangazo' | 'Bidhaa' | 'Tukio' | 'Toleo jipya')
  media       : { tone?, ratio?, caption?, duration?, views?, waveform? }?
  poll        : { question, options[], total, myVote? }?
  live        : { state, mode, title, host, viewers, when?, since?, category?, speakers?, waveform? }?
  highlights  : [{ text }]?
  cta         : { label, tone, url? }?
  source      : 'post' | 'reel' | 'liveSession'
  filters     : string[] (kwa content filter)
  stats       : { reactions, comments, shares }
  visibility  : 'public' | 'followers' | 'private'? (default: 'public')
}
```

### 1.3 Visibility Model (`feedService.js` → `isVisible()`)

```javascript
// Iliyopo kwenye feedService.js:
function isVisible(item, ctx) {
  const v = item.visibility ?? 'public'
  if (v === 'public') return true        // wote wanaona
  if (v === 'private') return !!item.mine // mimi pekee
  if (v === 'followers') return           // friends + channels zinazofuatwa
    item.entity?.type === 'friend' || ctx.followed.has(item.entity?.id)
  return false                            // fail-closed
}
```

**Hitimisho:** Visibility ni `public | followers | private` pekee.
- `public` = kila mtu anaona
- `followers` = marafiki + channels/hubs ninazofuata
- `private` = mimi pekee

**Hakuna `friends` kama level tofauti** — `followers` inajumuisha friends na followed entities.

### 1.4 Content Session State (`contentRepository.js`)

Vitendo vya mtumiaji vinavyohifadhiwa kwenye kikao (sasa ni in-memory):

| Kitendo | Hali | Schema Target |
|---|---|---|
| `toggleLike(id)` | `session.liked = { itemId: true }` | `reactions` table |
| `votePoll(itemId, optionId)` | `session.votes = { itemId: optionId }` | `poll_votes` table |
| `addComment(itemId, text)` | `session.comments = { itemId: [{...}] }` | `comments` table |
| `addPost(draft)` | `session.myPosts = [...]` | `posts` table |
| `toggleSaved(item)` | `session.saved = [...]` | `bookmarks` table |
| `saveEntity(entity)` | `session.savedEntities = {}` | `bookmarks` table (entity type) |
| `hideItem(id)` | `session.hidden = [...]` | `hidden_items` table |
| `reportItem(id, reason)` | `session.reported = [...]` | `reports` table |
| `startLive(mode)` / `endLive(id)` | `session.live = [...]` | `live_sessions` table |
| `joinLive(id)` | `session.joined = { liveId: true }` | `live_participants` table |
| `addStatus(st)` | `session.myStatuses = [...]` | `statuses` table |

### 1.5 Identity Session State (`identityRepository.js`)

| Kitendo | Hali | Schema Target |
|---|---|---|
| `toggleFollow(id)` | `follows = { id: boolean }` | `follows` table |
| `updateProfile(patch)` | `profilePatch = {}` | `profiles` table |

### 1.6 Live Sessions vs Posts (tofauti muhimu)

| Kipengele | `live_sessions` (table mpya) | `posts` (kind='liveActivity') |
|---|---|---|
| **Asili** | Kikao halisi cha moja kwa moja | Tangazo la kuwa live |
| **Chanzo** | `contentRepository.startLive()` | `mock.posts` (p11 kama mfano) |
| **Source** | `'liveSession'` | `'post'` |
| **Tab** | Live (pekee) | Mchanganyiko (na tabs nyingine) |
| **Hali** | live → upcoming → replay | N/A (ni post ya kawaida) |
| **Viewers** | Inabadilika (real-time count) | Haibadiliki (snapshot) |
| **Speakers** | Array ya userIds | Haipo |
| **Waveform** | Array ya namba (sauti) | Haipo |
| **Duration** | Inabadilika (timer) | Haipo |
| **Uundaji** | Mfumo unaanza kikao | Mtumiaji anachapisha tangazo |

---

## 2. MPANGO WA UTEKELEZAJI (Migration Phases)

### Phase A: Home Feed Foundation (Migration 1–4)
**Tables:** `profiles`, `follows`, `posts`, `reactions`
**Lengo:** Feed loading inafanya kazi (Mchanganyiko, Reels, Friends, Channels)

### Phase B: Interaction (Migration 5–7)
**Tables:** `comments`, `poll_votes`, `bookmarks`
**Lengo:** Post creation, comments, reactions, polls, bookmarks

### Phase C: Social (Migration 8–9)
**Tables:** `friendships`, `blocks`
**Lengo:** Friendship requests/accept, block management

### Phase D: Live (Migration 10–11)
**Tables:** `live_sessions`, `live_participants`
**Lengo:** Live session lifecycle

### Phase E: Chat (Migration 12–14)
**Tables:** `conversations`, `conversation_members`, `messages`
**Lengo:** Direct + group chat

### Phase F: Discovery & Spaces (Migration 15–16)
**Tables:** `spaces`, `space_members`
**Lengo:** Hubs, communities, channels

### Phase G: Auxiliary (Migration 17–19)
**Tables:** `notifications`, `statuses`, `reports`
**Lengo:** Notifications, stories, reports

### Phase H: Utility (Migration 20)
**Tables:** `hidden_items`
**Lengo:** Hide posts from feed

**Kwa hatua hii: Phase A pekee itatekelezwa kwanza.**

---

## 3. SCHEMA KAMILI (Tables Zote)

### 3.1 `profiles` (Migration 1 — Phase A)

**Inalingana na:** `mock.users` + `mock.me` + `identityRepository.getCurrentUser()`

```sql
-- Migration: 001_profiles.sql

CREATE TABLE profiles (
  user_id       UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username      TEXT UNIQUE NOT NULL,
  display_name  TEXT NOT NULL,
  entity_type   TEXT NOT NULL DEFAULT 'person'
                  CHECK (entity_type IN (
                    'person','channel','hub','community','business','creator')),
  avatar_url    TEXT,
  avatar_tone   TEXT NOT NULL DEFAULT 'green'
                  CHECK (avatar_tone IN (
                    'green','blue','gold','clay','plum','slate','teal')),
  bio           TEXT DEFAULT '',
  category      TEXT,
  verified      BOOLEAN NOT NULL DEFAULT FALSE,
  -- Denormalized counts (zinashasishwa na triggers)
  friends_count   INT NOT NULL DEFAULT 0 CHECK (friends_count >= 0),
  followers_count INT NOT NULL DEFAULT 0 CHECK (followers_count >= 0),
  following_count INT NOT NULL DEFAULT 0 CHECK (following_count >= 0),
  posts_count     INT NOT NULL DEFAULT 0 CHECK (posts_count >= 0),
  -- Timestamps
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at    TIMESTAMPTZ  -- soft delete
);

-- Triggers
CREATE INDEX idx_profiles_username ON profiles(username) WHERE deleted_at IS NULL;
CREATE INDEX idx_profiles_type ON profiles(entity_type) WHERE deleted_at IS NULL;

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (user_id, username, display_name, avatar_tone)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', 'user_' || substr(NEW.id::text, 1, 8)),
    COALESCE(NEW.raw_user_meta_data->>'display_name', 'Mtumiaji Mpya'),
    'green'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
```

**RLS Policies:**
```sql
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- SELECT: Yeyote aliyeingia anaweza kusoma profiles za wazi (si deleted)
CREATE POLICY "profiles_select_all" ON profiles
  FOR SELECT TO authenticated
  USING (deleted_at IS NULL);

-- INSERT: Trigger inashughulikia (SECURITY DEFINER)
-- Hakuna INSERT policy ya kawaida inayohitajika

-- UPDATE: Mtumiaji anaweza kubadilisha profile yake pekee
CREATE POLICY "profiles_update_own" ON profiles
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- DELETE: Soft delete pekee (mtumiaji mwenyewe)
-- Hard delete haifanyiki (CASCADE kutoka auth.users inashughulikia)
```

**Foreign Key Behavior:**
- `ON DELETE CASCADE`: Ukifuta `auth.users`, profile inafutwa pia.
- Soft delete (`deleted_at`): Profile haionekani kwenye queries lakini data inabaki.

**Uhusiano na model iliyopo:**

| Mock Field | DB Column | Maelezo |
|---|---|---|
| `users[].id` ('amina') | `user_id` (UUID) | Slug → UUID; migration script itahitaji slug→UUID mapping |
| `users[].name` | `display_name` | |
| `users[].handle` ('@amina.said') | `username` ('amina.said') | Bila `@` prefix |
| `users[].type` | `entity_type` | 'friend' → 'person' (kwa watu binafsi) |
| `users[].avatarTone` | `avatar_tone` | Sawa sawa |
| `users[].bio` | `bio` | |
| `users[].verified` | `verified` | |
| `users[].category` | `category` | |
| `users[].friends` | `friends_count` | Denormalized |
| `users[].followers` | `followers_count` | Denormalized |
| `users[].following` | `following_count` | Denormalized |
| `users[].relationship` | — | **SI column.** Inahesabiwa kwa runtime kutoka `follows` + `friendships` |
| `users[].ring` | — | SI column. Inahesabiwa kutoka relationship type |
| `users[].online` | — | Haipo. Itahitaji Realtime au presence system baadaye |
| `users[].since` | `created_at` | Format inabadilishwa kwenye UI |

**⚠️ Ufafanuzi unaohitajika:**
- `type: 'friend'` kwenye mock inamaanisha "mtu ambaye ni rafiki yangu." Kwenye DB, hii ni `entity_type = 'person'` + `friendships.status = 'accepted'`. Je, tunataka kuhifadhi `entity_type` ya awali (kama 'person') au kubadilisha kuwa 'friend' moja kwa moja?
  - **Pendekezo:** `entity_type` ibaki 'person'. Urafiki unatoka `friendships` table. Hii inalingana na kanuni ya "Role ≠ Relationship."

---

### 3.2 `follows` (Migration 2 — Phase A)

**Inalingana na:** `identityRepository.toggleFollow()` + `entityActions` (Fuata/Unafuatilia)

```sql
-- Migration: 002_follows.sql

CREATE TABLE follows (
  follower_id UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  followee_id UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (follower_id, followee_id),
  CHECK (follower_id != followee_id)  -- huwezi kujifuata mwenyewe
);

CREATE INDEX idx_follows_followee ON follows(followee_id);
CREATE INDEX idx_follows_follower ON follows(follower_id);

-- Trigger: sasisha followers_count na following_count
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

**RLS Policies:**
```sql
ALTER TABLE follows ENABLE ROW LEVEL SECURITY;

-- SELECT: Yeyote aliyeingia anaweza kusoma (kwa hesabu)
CREATE POLICY "follows_select_all" ON follows
  FOR SELECT TO authenticated
  USING (true);

-- INSERT: Mtumiaji anaweza kufuata kwa niaba yake pekee
CREATE POLICY "follows_insert_own" ON follows
  FOR INSERT TO authenticated
  WITH CHECK (follower_id = auth.uid());

-- DELETE: Mtumiaji anaweza kuacha kufuata kwa niaba yake pekee
CREATE POLICY "follows_delete_own" ON follows
  FOR DELETE TO authenticated
  USING (follower_id = auth.uid());
```

**Uhusiano na model iliyopo:**

| Mock Concept | DB Implementation |
|---|---|
| `relationship: 'Unafuatilia'` | `follows` record ipo |
| `relationship: 'Hujafuatilia'` | `follows` record haipo |
| `identityRepository.toggleFollow()` | INSERT/DELETE kwenye `follows` |
| `identityRepository.listFollowed()` | `SELECT followee_id FROM follows WHERE follower_id = auth.uid()` |
| `identityRepository.isFollowing(id)` | `SELECT EXISTS(...)` |
| Feed service `passesChannelGate()` | `followee_id IN (SELECT ... FROM follows)` |

**Kizuizi:** `follows` inatumika kwa channels, businesses, na creators pekee (kulingana na `FOLLOWABLE` set kwenye identityRepository). Kwa hubs na communities, tumia `space_members`. Kwa urafiki, tumia `friendships`.

---

### 3.3 `posts` (Migration 3 — Phase A)

**Inalingana na:** `mock.posts` + `mock.reels` + `feedMapper.mapPost()` + `feedMapper.mapReel()`

```sql
-- Migration: 003_posts.sql

CREATE TABLE posts (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id   UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  kind        TEXT NOT NULL CHECK (kind IN (
                'text','image','video','audio','poll',
                'announcement','reel','product','event')),
  -- Note: 'liveActivity' HAPO — live posts ni matangazo ya live sessions,
  -- yanaweza kuwa 'text' au 'image' na reference kwa live_sessions
  text        TEXT,

  -- Media (nullable, kwa image/video/audio/reel)
  media_url   TEXT,
  media_meta  JSONB DEFAULT '{}'::jsonb,
  -- Inashikilia: { tone, ratio, caption, duration, views, waveform }

  -- Poll (nullable, kwa kind='poll')
  poll_question TEXT,
  poll_options  JSONB,  -- [{ id, label }]
  poll_total    INT DEFAULT 0,

  -- Highlights + CTA (kwa announcements/products/events)
  highlights  JSONB,   -- [{ text }]
  cta         JSONB,   -- { label, tone, url }
  label       TEXT,    -- chip: 'Tangazo', 'Bidhaa', 'Tukio', 'Toleo jipya'

  -- Visibility (kulingana na isVisible() ya feedService.js)
  visibility  TEXT NOT NULL DEFAULT 'public'
                CHECK (visibility IN ('public','followers','private')),

  -- Space context (nullable: post inaweza kuwa ya Space)
  space_id    UUID REFERENCES spaces(id) ON DELETE SET NULL,

  -- Engagement (denormalized, zinasasishwa na triggers)
  reactions_count INT NOT NULL DEFAULT 0 CHECK (reactions_count >= 0),
  comments_count  INT NOT NULL DEFAULT 0 CHECK (comments_count >= 0),
  shares_count    INT NOT NULL DEFAULT 0 CHECK (shares_count >= 0),

  -- Timestamps
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at  TIMESTAMPTZ
);

-- Indexes kwa feed queries
CREATE INDEX idx_posts_feed_public
  ON posts(created_at DESC)
  WHERE deleted_at IS NULL AND visibility = 'public';

CREATE INDEX idx_posts_feed_followers
  ON posts(author_id, created_at DESC)
  WHERE deleted_at IS NULL AND visibility IN ('public','followers');

CREATE INDEX idx_posts_author
  ON posts(author_id, created_at DESC)
  WHERE deleted_at IS NULL;

CREATE INDEX idx_posts_kind
  ON posts(kind, created_at DESC)
  WHERE deleted_at IS NULL;

CREATE INDEX idx_posts_space
  ON posts(space_id, created_at DESC)
  WHERE deleted_at IS NULL AND space_id IS NOT NULL;
```

**RLS Policies:**
```sql
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;

-- SELECT: Mtumiaji anaona posts kulingana na visibility
-- Hii inatumia helper function kwa ufanisi
CREATE OR REPLACE FUNCTION can_see_post(post_row posts)
RETURNS BOOLEAN AS $$
DECLARE
  v_user UUID := auth.uid();
BEGIN
  -- Soft-deleted posts hazionekani
  IF post_row.deleted_at IS NOT NULL THEN RETURN FALSE; END IF;
  -- Mwandishi anaona posts zake zote
  IF post_row.author_id = v_user THEN RETURN TRUE; END IF;
  -- Public: wote wanaona
  IF post_row.visibility = 'public' THEN RETURN TRUE; END IF;
  -- Private: mwandishi pekee
  IF post_row.visibility = 'private' THEN RETURN FALSE; END IF;
  -- Followers: friends + followed entities
  IF post_row.visibility = 'followers' THEN
    -- Je, mwandishi ni rafiki yangu?
    IF EXISTS (
      SELECT 1 FROM friendships f
      WHERE f.status = 'accepted'
        AND ((f.requester_id = post_row.author_id AND f.addressee_id = v_user)
          OR (f.addressee_id = post_row.author_id AND f.requester_id = v_user))
    ) THEN RETURN TRUE; END IF;
    -- Je, ninamfuata mwandishi?
    IF EXISTS (
      SELECT 1 FROM follows
      WHERE follower_id = v_user AND followee_id = post_row.author_id
    ) THEN RETURN TRUE; END IF;
    RETURN FALSE;
  END IF;
  -- Fail-closed
  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

CREATE POLICY "posts_select_visible" ON posts
  FOR SELECT TO authenticated
  USING (can_see_post(posts));

-- INSERT: Mtumiaji aliyeingia anaweza kuunda post yake pekee
CREATE POLICY "posts_insert_own" ON posts
  FOR INSERT TO authenticated
  WITH CHECK (author_id = auth.uid());

-- UPDATE: Mwandishi pekee (haibadilishi author_id)
CREATE POLICY "posts_update_own" ON posts
  FOR UPDATE TO authenticated
  USING (author_id = auth.uid())
  WITH CHECK (author_id = auth.uid());

-- DELETE (soft): Mwandishi pekee
-- Note: tunatumia deleted_at, si hard DELETE
CREATE POLICY "posts_delete_own" ON posts
  FOR DELETE TO authenticated
  USING (author_id = auth.uid());
```

**Uhusiano na model iliyopo:**

| Mock Field | DB Column | Maelezo |
|---|---|---|
| `posts[].id` ('p1') | `id` (UUID) | String → UUID |
| `posts[].userId` | `author_id` | Slug → UUID |
| `posts[].kind` | `kind` | Sawa sawa (+ 'reel' sasa) |
| `posts[].text` | `text` | |
| `posts[].media` | `media_url` + `media_meta` | URL tofauti na metadata |
| `posts[].poll.question` | `poll_question` | |
| `posts[].poll.options` | `poll_options` (JSONB) | |
| `posts[].poll.total` | `poll_total` | |
| `posts[].poll.myVote` | → `poll_votes` table | Si column ya posts |
| `posts[].highlights` | `highlights` (JSONB) | |
| `posts[].cta` | `cta` (JSONB) | |
| `posts[].label` | `label` | |
| `posts[].reactions` | `reactions_count` | Denormalized |
| `posts[].comments` | `comments_count` | Denormalized |
| `posts[].shares` | `shares_count` | Denormalized |
| `posts[].ageMinutes` | — | Inahesabiwa: `now() - created_at` |
| `posts[].time` | — | Inahesabiwa kwa UI (`formatAge`) |
| `posts[].inHomeTabs` | — | Inahesabiwa kwa TAB_RULES (feedService) |
| `posts[].filterTypes` | — | Inahesabiwa kutoka `kind` (feedMapper) |
| `posts[].relationship` | — | Inahesabiwa kwa runtime (identity join) |
| `posts[].visibility` | `visibility` | Default: 'public' |
| `reels[].id` ('r1') | `id` (UUID) | Reels zinaingia posts kwa kind='reel' |
| `reels[].caption` | `text` | |
| `reels[].duration` | `media_meta->>'duration'` | |
| `reels[].tone` | `media_meta->>'tone'` | |
| `reels[].views` | `media_meta->>'views'` | |
| `reels[].ageMinutes` | — | `now() - created_at` |

---

### 3.4 `reactions` (Migration 4 — Phase A)

**Inalingana na:** `contentRepository.toggleLike()` + `session.liked`

```sql
-- Migration: 004_reactions.sql

CREATE TABLE reactions (
  user_id     UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  post_id     UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  emoji       TEXT NOT NULL DEFAULT 'like'
                CHECK (emoji IN ('like','heart','clap','fire','laugh','sad')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, post_id)  -- reaction moja kwa kila post
);

CREATE INDEX idx_reactions_post ON reactions(post_id);

-- Trigger: sasisha reactions_count
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

**RLS Policies:**
```sql
ALTER TABLE reactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "reactions_select_all" ON reactions
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "reactions_insert_own" ON reactions
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "reactions_delete_own" ON reactions
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());
```

---

### 3.5 `comments` (Migration 5 — Phase B)

```sql
-- Migration: 005_comments.sql

CREATE TABLE comments (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id     UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  author_id   UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  parent_id   UUID REFERENCES comments(id) ON DELETE CASCADE,  -- threaded reply
  text        TEXT NOT NULL CHECK (char_length(text) > 0),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at  TIMESTAMPTZ
);

CREATE INDEX idx_comments_post ON comments(post_id, created_at ASC) WHERE deleted_at IS NULL;
CREATE INDEX idx_comments_parent ON comments(parent_id) WHERE deleted_at IS NULL AND parent_id IS NOT NULL;

-- Trigger: sasisha comments_count
CREATE OR REPLACE FUNCTION update_comment_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE posts SET comments_count = comments_count + 1 WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE posts SET comments_count = GREATEST(0, comments_count - 1) WHERE id = OLD.post_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_comment_count
  AFTER INSERT OR DELETE ON comments
  FOR EACH ROW EXECUTE FUNCTION update_comment_count();
```

**RLS Policies:**
```sql
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

-- SELECT: Mtumiaji anaona comments za posts anazoweza kuona
CREATE POLICY "comments_select_visible" ON comments
  FOR SELECT TO authenticated
  USING (can_see_post((SELECT p FROM posts p WHERE p.id = comments.post_id LIMIT 1)));

-- INSERT: Mtumiaji aliyeingia, kwenye post anayoweza kuona
CREATE POLICY "comments_insert_own" ON comments
  FOR INSERT TO authenticated
  WITH CHECK (
    author_id = auth.uid()
    AND can_see_post((SELECT p FROM posts p WHERE p.id = post_id LIMIT 1))
  );

-- UPDATE: Mwandishi pekee
CREATE POLICY "comments_update_own" ON comments
  FOR UPDATE TO authenticated
  USING (author_id = auth.uid())
  WITH CHECK (author_id = auth.uid());

-- DELETE: Mwandishi au mwandishi wa post
CREATE POLICY "comments_delete_own_or_author" ON comments
  FOR DELETE TO authenticated
  USING (
    author_id = auth.uid()
    OR (SELECT author_id FROM posts WHERE id = comments.post_id LIMIT 1) = auth.uid()
  );
```

---

### 3.6 `poll_votes` (Migration 6 — Phase B)

```sql
-- Migration: 006_poll_votes.sql

CREATE TABLE poll_votes (
  post_id     UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  option_id   TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (post_id, user_id)
);

-- Trigger: sasisha poll_total kwenye posts
CREATE OR REPLACE FUNCTION update_poll_total()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE posts SET poll_total = poll_total + 1 WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE posts SET poll_total = GREATEST(0, poll_total - 1) WHERE id = OLD.post_id;
  ELSIF TG_OP = 'UPDATE' THEN
    -- Kura imebadilishwa: total haibadiliki
    NULL;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_poll_total
  AFTER INSERT OR DELETE OR UPDATE ON poll_votes
  FOR EACH ROW EXECUTE FUNCTION update_poll_total();
```

**RLS Policies:**
```sql
ALTER TABLE poll_votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "poll_votes_select" ON poll_votes
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "poll_votes_upsert_own" ON poll_votes
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "poll_votes_update_own" ON poll_votes
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "poll_votes_delete_own" ON poll_votes
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());
```

---

### 3.7 `bookmarks` (Migration 7 — Phase B)

**Inalingana na:** `contentRepository.toggleSaved()` + `saveEntity()` + `session.saved` + `session.savedEntities`

**Muhimu:** Kuna aina MBILI za bookmarks:
1. **Post bookmarks** (`ref_type = 'post'`): kuhifadhi chapisho
2. **Entity bookmarks** (`ref_type = 'entity'`): kuhifadhi mtu/biashara/channel/kikundi

```sql
-- Migration: 007_bookmarks.sql

CREATE TABLE bookmarks (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  ref_type    TEXT NOT NULL CHECK (ref_type IN ('post','entity')),
  ref_id      UUID NOT NULL,  -- posts.id au profiles.user_id
  -- Metadata cache (kwa entity bookmarks, ili UI ionyeshe bila join)
  meta        JSONB DEFAULT '{}'::jsonb,
  -- Inashikilia: { kind, name, subtitle } kwa entities; { kind, text, author } kwa posts
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- UNIQUE: kuzuia duplicates (mtumiaji + ref_type + ref_id)
  UNIQUE (user_id, ref_type, ref_id)
);

CREATE INDEX idx_bookmarks_user ON bookmarks(user_id, created_at DESC);
CREATE INDEX idx_bookmarks_ref ON bookmarks(ref_type, ref_id);

-- FK constraint kwa posts (inaweza kuwa null kwa entity bookmarks)
-- Note: hatuwezi kutumia FK moja kwa moja kwa sababu ref_id inarejelea
-- tables mbili tofauti (posts au profiles). Tunatumia CHECK + application logic.
```

**RLS Policies:**
```sql
ALTER TABLE bookmarks ENABLE ROW LEVEL SECURITY;

-- SELECT: Mtumiaji anaona bookmarks zake pekee
CREATE POLICY "bookmarks_select_own" ON bookmarks
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- INSERT: Mtumiaji anaweza kuongeza bookmark yake pekee
CREATE POLICY "bookmarks_insert_own" ON bookmarks
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- DELETE: Mtumiaji anaweza kuondoa bookmark yake pekee
CREATE POLICY "bookmarks_delete_own" ON bookmarks
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());
```

---

### 3.8 `friendships` (Migration 8 — Phase C)

**Inalingana na:** `entityActions.friend` + `ring: 'friend'` + `Gundua Friends view`

```sql
-- Migration: 008_friendships.sql

CREATE TABLE friendships (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  addressee_id UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  status       TEXT NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending','accepted','declined','blocked')),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- Kuzuia ombi la pili kwa jozi ileile (pande zote mbili)
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

-- Trigger: sasisha friends_count
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

**RLS Policies:**
```sql
ALTER TABLE friendships ENABLE ROW LEVEL SECURITY;

-- SELECT: Mtumiaji anaona maombi yake (aliyotuma + aliyopokea)
CREATE POLICY "friendships_select_own" ON friendships
  FOR SELECT TO authenticated
  USING (requester_id = auth.uid() OR addressee_id = auth.uid());

-- INSERT: Mtumiaji anaweza kutuma ombi (yeye ni requester)
CREATE POLICY "friendships_insert_own" ON friendships
  FOR INSERT TO authenticated
  WITH CHECK (requester_id = auth.uid());

-- UPDATE: Mpokeaji anaweza kukubali/kukataa; mwombaji anaweza kufuta
CREATE POLICY "friendships_update_own" ON friendships
  FOR UPDATE TO authenticated
  USING (
    (addressee_id = auth.uid() AND status IN ('pending'))  -- mpokeaji: kubali/kataa
    OR (requester_id = auth.uid() AND status = 'pending')  -- mwombaji: futa
  );
```

---

### 3.9 `blocks` (Migration 9 — Phase C)

**Inalingana na:** `chatService.blockContact()` + `chatService.unblockContact()` + `session.blocked`

```sql
-- Migration: 009_blocks.sql

CREATE TABLE blocks (
  blocker_id  UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  blocked_id  UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (blocker_id, blocked_id),
  CHECK (blocker_id != blocked_id)  -- huwezi kujizuia mwenyewe
);

CREATE INDEX idx_blocks_blocker ON blocks(blocker_id);
CREATE INDEX idx_blocks_blocked ON blocks(blocked_id);
```

**RLS Policies:**
```sql
ALTER TABLE blocks ENABLE ROW LEVEL SECURITY;

-- SELECT: Mtumiaji anaona blocks zake pekee
CREATE POLICY "blocks_select_own" ON blocks
  FOR SELECT TO authenticated
  USING (blocker_id = auth.uid());

-- INSERT: Mtumiaji anaweza kuzuia kwa niaba yake pekee
CREATE POLICY "blocks_insert_own" ON blocks
  FOR INSERT TO authenticated
  WITH CHECK (blocker_id = auth.uid());

-- DELETE: Mtumiaji anaweza kufungua kwa niaba yake pekee
CREATE POLICY "blocks_delete_own" ON blocks
  FOR DELETE TO authenticated
  USING (blocker_id = auth.uid());
```

**Athari za blocks kwenye mfumo:**
- Blocked user hawezi kuona posts za blocker (inapaswa kuongezwa kwenye `can_see_post()`)
- Blocked user hawezi kutuma ujumbe kwa blocker (chat RLS)
- Blocked user hawezi kutuma ombi la urafiki

---

### 3.10 `live_sessions` (Migration 10 — Phase D)

**Inalingana na:** `mock.liveSessions` + `feedMapper.mapLiveSession()` + `contentRepository.startLive()/endLive()`

**Tofauti na `posts`:**
- `live_sessions` = kikao HALISI cha moja kwa moja (vinaanza, vinaendelea, vinakamilika)
- `posts` zenye text kuhusu live = tangazo/chapisho la kawaida (mfano: p11 "Mjadala mfupi wa sauti")
- `live_sessions` zinaonekana kwenye tab ya **Live** pekee
- `posts` za liveActivity zinaonekana kwenye **Mchanganyiko**

```sql
-- Migration: 010_live_sessions.sql

CREATE TABLE live_sessions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  host_id     UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  mode        TEXT NOT NULL DEFAULT 'Video'
                CHECK (mode IN ('Video','Sauti','Mchanganyiko')),
  state       TEXT NOT NULL DEFAULT 'upcoming'
                CHECK (state IN ('upcoming','live','replay')),
  category    TEXT,
  -- Media/thumbnail
  thumbnail_url TEXT,
  thumbnail_tone TEXT DEFAULT 'green',
  -- Viewers (real-time count — denormalized)
  viewers_count INT NOT NULL DEFAULT 0 CHECK (viewers_count >= 0),
  -- Speakers (kwa audio/mixed sessions)
  speakers    JSONB DEFAULT '[]'::jsonb,  -- [user_id, ...]
  -- Waveform (kwa audio sessions)
  waveform    JSONB,  -- [namba, ...]
  -- Schedule
  scheduled_at TIMESTAMPTZ,  -- kwa upcoming
  started_at   TIMESTAMPTZ,  -- kikao kimeanza
  ended_at     TIMESTAMPTZ,  -- kikao kimeisha
  -- Visibility
  visibility   TEXT NOT NULL DEFAULT 'public'
                 CHECK (visibility IN ('public','followers','private')),
  -- Timestamps
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_live_sessions_state ON live_sessions(state, created_at DESC);
CREATE INDEX idx_live_sessions_host ON live_sessions(host_id, created_at DESC);
CREATE INDEX idx_live_sessions_live ON live_sessions(created_at DESC) WHERE state = 'live';
```

**RLS Policies:**
```sql
ALTER TABLE live_sessions ENABLE ROW LEVEL SECURITY;

-- SELECT: kulingana na visibility (sawa na posts)
CREATE POLICY "live_sessions_select_visible" ON live_sessions
  FOR SELECT TO authenticated
  USING (
    state IS NOT NULL AND (
      visibility = 'public'
      OR host_id = auth.uid()
      OR (visibility = 'followers' AND (
        EXISTS (SELECT 1 FROM friendships WHERE status = 'accepted'
          AND ((requester_id = host_id AND addressee_id = auth.uid())
            OR (addressee_id = host_id AND requester_id = auth.uid())))
        OR EXISTS (SELECT 1 FROM follows WHERE follower_id = auth.uid() AND followee_id = host_id)
      ))
    )
  );

-- INSERT: Mtumiaji anaweza kuanza kikao chake pekee
CREATE POLICY "live_sessions_insert_own" ON live_sessions
  FOR INSERT TO authenticated
  WITH CHECK (host_id = auth.uid());

-- UPDATE: Host pekee
CREATE POLICY "live_sessions_update_own" ON live_sessions
  FOR UPDATE TO authenticated
  USING (host_id = auth.uid())
  WITH CHECK (host_id = auth.uid());
```

---

### 3.11 `live_participants` (Migration 11 — Phase D)

```sql
-- Migration: 011_live_participants.sql

CREATE TABLE live_participants (
  session_id  UUID NOT NULL REFERENCES live_sessions(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  role        TEXT NOT NULL DEFAULT 'viewer'
                CHECK (role IN ('host','speaker','viewer')),
  joined_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (session_id, user_id)
);
```

**RLS Policies:**
```sql
ALTER TABLE live_participants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "live_participants_select" ON live_participants
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "live_participants_insert_own" ON live_participants
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "live_participants_delete_own" ON live_participants
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());
```

---

### 3.12 `conversations` + `conversation_members` (Migration 12–13 — Phase E)

```sql
-- Migration: 012_conversations.sql

CREATE TABLE conversations (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type          TEXT NOT NULL CHECK (type IN ('direct','group')),
  title         TEXT,
  icon_tone     TEXT DEFAULT 'green',
  group_icon    TEXT,
  parent_type   TEXT,          -- 'community' | 'hub' | null
  parent_id     UUID,
  parent_label  TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Migration: 013_conversation_members.sql

CREATE TABLE conversation_members (
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  role            TEXT NOT NULL DEFAULT 'member'
                    CHECK (role IN ('owner','admin','moderator','member')),
  joined_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_read_at    TIMESTAMPTZ,
  archived        BOOLEAN NOT NULL DEFAULT FALSE,
  PRIMARY KEY (conversation_id, user_id)
);

CREATE INDEX idx_conv_members_user ON conversation_members(user_id, joined_at DESC);
```

---

### 3.13 `messages` (Migration 14 — Phase E)

```sql
-- Migration: 014_messages.sql

CREATE TABLE messages (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  author_id       UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  kind            TEXT NOT NULL CHECK (kind IN (
                    'text','audio','image','video','poll','location',
                    'shared','announcement','document')),
  text            TEXT,
  reply_to_id     UUID REFERENCES messages(id) ON DELETE SET NULL,
  content         JSONB DEFAULT '{}'::jsonb,
  reactions       JSONB DEFAULT '{}'::jsonb,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at      TIMESTAMPTZ
);

CREATE INDEX idx_messages_conv ON messages(conversation_id, created_at ASC)
  WHERE deleted_at IS NULL;
```

---

### 3.14 `spaces` + `space_members` (Migration 15–16 — Phase F)

```sql
-- Migration: 015_spaces.sql

CREATE TABLE spaces (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug        TEXT UNIQUE NOT NULL,
  name        TEXT NOT NULL,
  type        TEXT NOT NULL CHECK (type IN ('hub','community','channel')),
  description TEXT,
  avatar_url  TEXT,
  avatar_tone TEXT DEFAULT 'green',
  category    TEXT,
  visibility  TEXT NOT NULL DEFAULT 'public'
                CHECK (visibility IN ('public','listed','hidden')),
  join_mode   TEXT NOT NULL DEFAULT 'open'
                CHECK (join_mode IN ('open','follow','request','invite')),
  purpose     TEXT,
  rules       JSONB DEFAULT '[]'::jsonb,
  members_count INT NOT NULL DEFAULT 0 CHECK (members_count >= 0),
  posts_count   INT NOT NULL DEFAULT 0 CHECK (posts_count >= 0),
  created_by  UUID NOT NULL REFERENCES profiles(user_id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at  TIMESTAMPTZ
);

-- Migration: 016_space_members.sql

CREATE TABLE space_members (
  space_id    UUID NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  role        TEXT NOT NULL DEFAULT 'member'
                CHECK (role IN ('owner','admin','moderator','member')),
  status      TEXT NOT NULL DEFAULT 'active'
                CHECK (status IN ('active','pending','left','removed')),
  joined_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (space_id, user_id)
);
```

---

### 3.15 `notifications` (Migration 17 — Phase G)

```sql
-- Migration: 017_notifications.sql

CREATE TABLE notifications (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  actor_id    UUID REFERENCES profiles(user_id) ON DELETE SET NULL,
  type        TEXT NOT NULL CHECK (type IN (
                'friend_request','friend_accepted','comment','reaction',
                'follow','channel_post','hub_event','live_started',
                'business_update','mention','space_join')),
  text        TEXT NOT NULL,
  icon        TEXT,
  ref_type    TEXT,
  ref_id      UUID,
  read        BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_notifications_user ON notifications(user_id, created_at DESC);
CREATE INDEX idx_notifications_unread ON notifications(user_id, created_at DESC)
  WHERE read = FALSE;
```

---

### 3.16 `statuses` (Migration 18 — Phase G)

```sql
-- Migration: 018_statuses.sql

CREATE TABLE statuses (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id   UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  text        TEXT,
  media_url   TEXT,
  tone        TEXT DEFAULT 'green',
  live        BOOLEAN DEFAULT FALSE,
  ring        TEXT DEFAULT 'default',
  viewed_by   JSONB DEFAULT '[]'::jsonb,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at  TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '24 hours')
);

CREATE INDEX idx_statuses_active ON statuses(author_id, created_at DESC)
  WHERE expires_at > now();

-- Cleanup: cron job kufuta statuses zilizokwisha
-- SELECT cron.schedule('clean_expired_statuses', '0 * * * *',
--   $$DELETE FROM statuses WHERE expires_at < now()$$);
```

---

### 3.17 `reports` (Migration 19 — Phase G)

```sql
-- Migration: 019_reports.sql

CREATE TABLE reports (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  ref_type    TEXT NOT NULL CHECK (ref_type IN ('post','comment','user','space','message')),
  ref_id      UUID NOT NULL,
  reason      TEXT NOT NULL,
  status      TEXT NOT NULL DEFAULT 'pending'
                CHECK (status IN ('pending','reviewed','resolved','dismissed')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (reporter_id, ref_type, ref_id)  -- report moja kwa kitu kimoja
);
```

---

### 3.18 `hidden_items` (Migration 20 — Phase H)

```sql
-- Migration: 020_hidden_items.sql

CREATE TABLE hidden_items (
  user_id     UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  post_id     UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, post_id)
);
```

---

## 4. STORAGE BUCKETS (Pendekezo — Usitengeneze bado)

| Bucket | Ufikivu | Ukomo | Maelezo |
|---|---|---|---|
| `avatars` | Public | 2 MB/file | Profile pictures |
| `media` | Authenticated | 50 MB/file | Post images/videos |
| `reels` | Public | 100 MB/file | Reel videos |
| `documents` | Authenticated (members only) | 25 MB/file | Chat documents, space resources |
| `statuses` | Public (expires 24h) | 20 MB/file | Status media |

**Storage RLS Policies (pendekezo):**
```sql
-- avatars: yeyote anaweza kupakua, mwandishi pekee anapandisha
-- media: authenticated users wanaweza kupakua, mwandishi anapandisha
-- reels: public download, mwandishi anapandisha
-- documents: conversation/space members pekee
-- statuses: public download, mwandishi anapandisha, zinafutwa baada ya 24h
```

---

## 5. MPANGO WA TESTS ZA RLS

### 5.1 Test Strategy

Kila table itapata tests za RLS zinazothibitisha:

| Test Category | Maelezo |
|---|---|
| **Owner access** | Mtumiaji anaweza CRUD data yake |
| **Non-owner blocked** | Mtumiaji hawezi kubadilisha data ya mtu mwingine |
| **Visibility** | `public`/`followers`/`private` zinafanya kazi sahihi |
| **Soft delete** | Deleted records hazionekani kwa SELECT |
| **Cascade** | Ukifuta user, data yake inafutwa |
| **Unique constraints** | Duplicates zinakataliwa |
| **Edge cases** | Self-follow, self-block, empty text, etc. |

### 5.2 Test Framework

Tutatumia Supabase SQL tests (au `pgTAP`) zikiendeshwa kupitia Supabase CLI:

```bash
supabase db test          # Endesha tests zote
supabase db reset         # Reset database na seed data
```

### 5.3 Test Cases za Awali (Phase A)

```
profiles:
  ✓ User anaona profile yake
  ✓ User anaona profile za wengine
  ✓ User anaweza kubadilisha profile yake
  ✓ User HAWEZI kubadilisha profile ya mtu mwingine
  ✓ Deleted profile haionekani

follows:
  ✓ User anaweza kufuata mtu
  ✓ User anaweza kuacha kufuata
  ✓ User HAWEZI kufuata kwa niaba ya mtu mwingine
  ✓ User HAWEZI kujifuata mwenyewe
  ✓ followers_count inasasishwa

posts:
  ✓ User anaona public posts
  ✓ User anaona followers posts (kwa rafiki/followed)
  ✓ User HAONI private posts za wengine
  ✓ User anaona posts zake zote
  ✓ User anaweza kuunda post
  ✓ User HAWEZI kuunda post kwa niaba ya mtu mwingine
  ✓ User anaweza kubadilisha post yake
  ✓ User HAWEZI kubadilisha post ya mtu mwingine
  ✓ Blocked user HAONI posts za blocker

reactions:
  ✓ User anaweza kupenda post
  ✓ User anaweza kuondoa kupenda
  ✓ User HAWEZI kupenda kwa niaba ya mtu mwingine
  ✓ reactions_count inasasishwa
```

---

## 6. ROLLBACK / RECOVERY PLAN

### 6.1 Kabla ya Migration

1. **Backup:** `supabase db dump -f backup_before_migration.sql`
2. **Branch protection:** Migration zinaendeshwa kwenye `staging` kwanza
3. **Version control:** Kila migration ina namba (`001_`, `002_`, ...) — Supabase inafuatilia

### 6.2 Rollback Procedure

Kila migration ina `-- rollback` comment inayoeleza jinsi ya kurudisha:

```sql
-- Migration: 003_posts.sql
-- Rollback:
--   DROP TABLE IF EXISTS posts CASCADE;
--   DROP FUNCTION IF EXISTS can_see_post CASCADE;
```

Rollback commands:
```bash
supabase migration repair --status reverted 003  # Weka migration kama iliyorejeshwa
# Kisha endesha DROP statements za rollback
```

### 6.3 Data Recovery

- `profiles` zina `deleted_at` (soft delete) — data inaweza kurejeshwa
- `posts` zina `deleted_at` — same
- Hard deletes (CASCADE) hazirejeshwi — backup ndio njia pekee

---

## 7. MASWALI YANAYOHITAJI UFAFANUZII

| # | Swali | Athari | Pendekezo |
|---|---|---|---|
| 1 | Je, `entity_type` ya mtu binafsi ibaki `'person'` hata kama ni rafiki? Au ibadilike kuwa `'friend'`? | Inaathiri query za feed (Friends tab inachuja kwa `entity.type = 'friend'`) | Ibaki `'person'`. Tab ya Friends ichuje kwa `friendships` view badala ya entity_type. |
| 2 | Je, posts za `kind='liveActivity'` (k.m. p11 mock) zinaingiaje kwenye DB? Ni `posts` za kawaida au zinarejelea `live_sessions`? | Inaathiri schema ya posts na uhusiano na live_sessions | Ziwe `posts` za kawaida (kind='text' au 'image') zenye `live_session_id` reference (nullable). Au ziache kama 'text' posts bila reference — ni matangazo ya mtumiaji, si session halisi. |
| 3 | Je, tunataka `shares` table kwa kufuatilia nani alishiriki post? Au `shares_count` pekee? | Inaathiri complexity na data size | Kwa sasa `shares_count` pekee. Table ya `shares` inaweza kuongezwa baadaye. |
| 4 | Je, `poll_options` ibaki JSONB ndani ya `posts` au iwe table tofauti (`poll_options`)? | JSONB ni rahisi lakini haiwezi kuwa na FK | JSONB ndani ya posts (kwa sasa). `poll_votes` table inarejelea `option_id` kama TEXT. |
| 5 | Je, tunataka indexes za full-text search (FTS) kwa posts/chat? | Inaongeza ukubwa wa DB lakini inaboresha utafutaji | Kwa sasa hapana. Tuongeze baadaye (Phase B+) kama mahitaji yanadai. |
| 6 | Je, `spaces.slug` iwe na format gani? Auto-generated au mtumiaji achague? | Inaathiri UX na uniqueness | Auto-generated kutoka `name` + random suffix (k.m. 'dar-tech-hub-x7k'). |

---

## 8. MUHTASARI WA TABLES NA PHASES

| Phase | Migration | Table | Lengo |
|---|---|---|---|
| **A** | 001 | `profiles` | Utambulisho wa watumiaji |
| **A** | 002 | `follows` | Kufuatilia channels/creators |
| **A** | 003 | `posts` | Machapisho ya Home feed (+ reels) |
| **A** | 004 | `reactions` | Kupenda posts |
| **B** | 005 | `comments` | Maoni kwenye posts |
| **B** | 006 | `poll_votes` | Kura za polls |
| **B** | 007 | `bookmarks` | Kuhifadhi posts na entities |
| **C** | 008 | `friendships` | Urafiki wa pande mbili |
| **C** | 009 | `blocks` | Kuzuia watumiaji |
| **D** | 010 | `live_sessions` | Vikao vya moja kwa moja |
| **D** | 011 | `live_participants` | Washiriki wa live |
| **E** | 012 | `conversations` | Mazungumzo (Chat) |
| **E** | 013 | `conversation_members` | Wanachama wa mazungumzo |
| **E** | 014 | `messages` | Jumbe za chat |
| **F** | 015 | `spaces` | Hubs + Communities + Channels |
| **F** | 016 | `space_members` | Wanachama wa spaces |
| **G** | 017 | `notifications` | Taarifa |
| **G** | 018 | `statuses` | Stories (saa 24) |
| **G** | 019 | `reports` | Kuripoti content |
| **H** | 020 | `hidden_items` | Kuficha posts |

---

## 9. GHARAMA NA MIPAKA

| Kipengele | Free Tier | Makadirio ya PASIHAI |
|---|---|---|
| Database | 500 MB | ~50-100 MB (schema + data ya awali) |
| Storage | 1 GB | ~200-500 MB (avatars + media) |
| Auth (MAU) | 50,000 | Chini sana kwa kuanzia |
| Edge Functions | 500K/mwezi | Chini |
| Realtime | 200 connections | Inaweza kutosha kwa kuanzia |

**Supabase Pro ($25/mwezi):** Inahitajika kwa production — inatoa daily backups, hakuna pausing, SLA.

---

*Ripoti hii ni PROPOSAL ILIYOBORESHWA. Hakuna migration wala table yoyote iliyoundwa. Inasubiri idhini yako na majibu ya maswali 6 hapo juu kabla ya hatua inayofuata.*
