# PASIHAI — Supabase Schema Proposal (Hatua ya 2)

**Tarehe:** 2026-10-09
**Status:** PROPOSAL TU — hakuna migration wala table yoyote iliyoundwa bado.
**Inasubiri:** Idhini yako kabla ya kuunda migration yoyote.

---

## 1. Kanuni za Msingi

1. **Kulingana na model iliyopo:** Schema inatokana na data model ya `mock.js`, `feedMapper.js`, na contracts za repositories 8 — si kubuni kutoka sifuri.
2. **Auth = Supabase Auth:** `auth.users` ndio chanzo cha utambulisho. Table ya `profiles` inaunganishwa na `auth.users` kupitia `user_id`.
3. **RLS ndio ulinzi:** Kila table ina RLS policies. Anon key haiwezi kufikia data asiyostahili.
4. **Visibility ni field, si table tofauti:** `visibility` = `'public'` | `'followers'` | `'friends'` | `'private'` — sawa na model iliyopo.
5. **Entity types zote kwenye profiles:** `entity_type` = `'person'` | `'channel'` | `'hub'` | `'community'` | `'business'` | `'creator'` — sawa na `users` kwenye mock.js.
6. **Soft deletes:** `deleted_at` badala ya kufuta kabisa (kwa posts, comments, messages).
7. **Pagination:** Kila query inatumia `created_at DESC` + cursor (`lt: timestamp`).

---

## 2. Tables Zilizopendekezwa

### 2.1 `profiles` (huunganishwa na `auth.users`)

Inalingana na: `mock.users` + `mock.me`

```sql
CREATE TABLE profiles (
  user_id     UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username    TEXT UNIQUE NOT NULL,              -- handle bila '@' (mfano: 'amina.said')
  display_name TEXT NOT NULL,
  entity_type TEXT NOT NULL DEFAULT 'person'
                CHECK (entity_type IN ('person','channel','hub','community','business','creator')),
  avatar_url  TEXT,
  avatar_tone TEXT DEFAULT 'green',             -- tone ya avatar (green/blue/gold/clay/plum/slate/teal)
  bio         TEXT,
  category    TEXT,                             -- kwa channels/hubs (Teknolojia, Elimu, ...)
  verified    BOOLEAN DEFAULT FALSE,
  -- Takwimu (denormalized, zinasasishwa na triggers/periodic jobs)
  friends_count   INT DEFAULT 0,
  followers_count INT DEFAULT 0,
  following_count INT DEFAULT 0,
  posts_count     INT DEFAULT 0,
  -- Timestamps
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at  TIMESTAMPTZ
);
```

**RLS:**
- `SELECT`: Yeyote anaweza kusoma profiles za wazi (WHERE deleted_at IS NULL).
- `INSERT`: Mtumiaji anaweza kuunda profile yake pekee (user_id = auth.uid()).
- `UPDATE`: Mtumiaji anaweza kubadilisha profile yake pekee.

---

### 2.2 `follows` (kufuatilia channels/creators/hubs)

Inalingana na: `entityActions` (Fuata/Unafuatilia) + `mock.users[].relationship`

```sql
CREATE TABLE follows (
  follower_id UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  followee_id UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (follower_id, followee_id)
);
```

**RLS:**
- `SELECT`: Yeyote anaweza kusoma (kwa hesabu za followers/following).
- `INSERT/DELETE`: Mtumiaji anaweza kufuatilia/acha kufuatilia kwa niaba yake pekee.

---

### 2.3 `friendships` (urafiki wa pande mbili)

Inalingana na: `entityActions.friend` (Ongeza rafiki / Omba urafiki) + `ring: 'friend'`

```sql
CREATE TABLE friendships (
  requester_id UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  addressee_id UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  status       TEXT NOT NULL DEFAULT 'pending'
                 CHECK (status IN ('pending','accepted','declined','blocked')),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (requester_id, addressee_id)
);

-- Helper view: urafiki uliokubalika (pande mbili)
CREATE VIEW friends AS
SELECT requester_id AS user_a, addressee_id AS user_b, updated_at AS friends_since
FROM friendships WHERE status = 'accepted'
UNION
SELECT addressee_id AS user_a, requester_id AS user_b, updated_at AS friends_since
FROM friendships WHERE status = 'accepted';
```

**RLS:**
- `SELECT`: Mtumiaji anaona maombi yake na urafiki wake.
- `INSERT`: Mtumiaji anaweza kutuma ombi la urafiki.
- `UPDATE`: Mpokeaji anaweza kukubali/kukataa; mwombaji anaweza kufuta.

---

### 2.4 `posts` (machapisho — aina zote za feed)

Inalingana na: `mock.posts` + `feedMapper.mapPost()`

```sql
CREATE TABLE posts (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id   UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  kind        TEXT NOT NULL
                CHECK (kind IN ('text','image','video','audio','poll',
                                'announcement','liveActivity','reel','product','event')),
  text        TEXT,
  -- Media (nullable, kwa image/video/audio/reel)
  media_url   TEXT,
  media_meta  JSONB,                           -- { tone, ratio, caption, duration, views, waveform }
  -- Poll (nullable)
  poll        JSONB,                           -- { question, options[], total }
  -- Highlights + CTA (kwa announcements/products/events)
  highlights  JSONB,                           -- [{ text }]
  cta         JSONB,                           -- { label, tone, url }
  label       TEXT,                            -- chip: 'Tangazo', 'Bidhaa', 'Tukio', 'Toleo jipya'
  -- Visibility
  visibility  TEXT NOT NULL DEFAULT 'public'
                CHECK (visibility IN ('public','followers','friends','private')),
  -- Engagement (denormalized, zinasasishwa na triggers)
  reactions_count INT DEFAULT 0,
  comments_count  INT DEFAULT 0,
  shares_count    INT DEFAULT 0,
  -- Timestamps
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at  TIMESTAMPTZ
);

-- Index kwa feed queries
CREATE INDEX idx_posts_author    ON posts(author_id, created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_posts_kind      ON posts(kind, created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_posts_feed      ON posts(created_at DESC) WHERE deleted_at IS NULL AND visibility = 'public';
```

**RLS:**
- `SELECT` (feed): Mtumiaji anaona posts ambazo:
  - `visibility = 'public'`, AU
  - `visibility = 'followers'` na yuko kwenye `follows` yake, AU
  - `visibility = 'friends'` na yuko kwenye `friends` view, AU
  - `author_id = auth.uid()` (zake mwenyewe).
- `INSERT`: Mtumiaji anaweza kuunda posts kwa niaba yake pekee.
- `UPDATE/DELETE`: Mwandishi pekee.

---

### 2.5 `poll_votes`

Inalingana na: `mock.posts[].poll.options[].votes` + `poll.myVote`

```sql
CREATE TABLE poll_votes (
  post_id     UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  option_id   TEXT NOT NULL,                   -- option id ndani ya poll JSONB
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (post_id, user_id)               -- kura moja kwa kila mtumiaji
);
```

**RLS:**
- `SELECT`: Yeyote anaweza kusoma (kwa hesabu za kura).
- `INSERT`: Mtumiaji anaweza kupiga kura yake pekee.
- `UPDATE`: Mtumiaji anaweza kubadilisha kura yake.

---

### 2.6 `reactions` (kupenda/kuitikia posts)

Inalingana na: `mock.posts[].reactions` + `feedService.toggleLike()`

```sql
CREATE TABLE reactions (
  user_id     UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  post_id     UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  emoji       TEXT NOT NULL DEFAULT 'like',    -- 'like' | 'heart' | 'clap' | ...
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, post_id)               -- reaction moja kwa kila post
);
```

**RLS:**
- `SELECT`: Yeyote anaweza kusoma.
- `INSERT/DELETE`: Mtumiaji anaweza kuongeza/kuondoa reaction yake pekee.

---

### 2.7 `comments`

Inalingana na: `mock.postComments` + `feedService.addComment()`

```sql
CREATE TABLE comments (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id     UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  author_id   UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  parent_id   UUID REFERENCES comments(id),    -- reply (threaded)
  text        TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at  TIMESTAMPTZ
);

CREATE INDEX idx_comments_post ON comments(post_id, created_at ASC) WHERE deleted_at IS NULL;
```

**RLS:**
- `SELECT`: Yeyote anayeweza kuona post anaweza kuona comments.
- `INSERT`: Mtumiaji aliyeingia anaweza kuandika comment.
- `UPDATE/DELETE`: Mwandishi au mwandishi wa post.

---

### 2.8 `conversations` + `conversation_members` (Chat)

Inalingana na: `mock.chatConversations` + `chatService`

```sql
CREATE TABLE conversations (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type        TEXT NOT NULL CHECK (type IN ('direct','group')),
  title       TEXT,                            -- kwa group; null kwa direct
  icon_tone   TEXT DEFAULT 'green',
  group_icon  TEXT,                            -- 'group' | 'hub' (kwa group)
  -- Parent context (community/hub metadata — SI aina ya conversation)
  parent_type TEXT,                            -- 'community' | 'hub' | null
  parent_id   UUID,
  parent_label TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE conversation_members (
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  role            TEXT DEFAULT 'member' CHECK (role IN ('owner','admin','moderator','member')),
  joined_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_read_at    TIMESTAMPTZ,
  archived        BOOLEAN DEFAULT FALSE,
  PRIMARY KEY (conversation_id, user_id)
);
```

**RLS:**
- `SELECT`: Mwanachama pekee anaweza kuona conversation.
- `INSERT` (conversation + members): Mtumiaji anaweza kuunda.
- `UPDATE`: Admin/owner pekee.

---

### 2.9 `messages`

Inalingana na: `mock.chatMessages` + `chatService.sendMessage()`

```sql
CREATE TABLE messages (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  author_id       UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  kind            TEXT NOT NULL CHECK (kind IN (
                    'text','audio','image','video','poll','location','shared','announcement','document')),
  text            TEXT,
  -- Reply (quoted message)
  reply_to_id     UUID REFERENCES messages(id),
  -- Content (JSONB kwa aina mbalimbali)
  content         JSONB,                       -- audio{}, image{}, poll{}, location{}, shared{}, doc{}
  -- Reactions
  reactions       JSONB DEFAULT '{}',          -- { heart: 1, like: 14, clap: 6 }
  -- Delivery state (kwa UI)
  state           TEXT DEFAULT 'synced',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at      TIMESTAMPTZ
);

CREATE INDEX idx_messages_conversation ON messages(conversation_id, created_at ASC) WHERE deleted_at IS NULL;
```

**RLS:**
- `SELECT`: Mwanachama wa conversation pekee.
- `INSERT`: Mwanachama wa conversation pekee.
- `DELETE`: Mwandishi pekee (soft delete).

---

### 2.10 `spaces` (Hubs + Communities + Channels)

Inalingana na: `mock.spacesMeta` + `mock.spacesMembers`

```sql
CREATE TABLE spaces (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug        TEXT UNIQUE NOT NULL,             -- URL-friendly id
  name        TEXT NOT NULL,
  type        TEXT NOT NULL CHECK (type IN ('hub','community','channel')),
  description TEXT,
  avatar_url  TEXT,
  avatar_tone TEXT DEFAULT 'green',
  category    TEXT,
  -- Visibility (hali, SI aina ya kitu — kulingana na N2 audit)
  visibility  TEXT NOT NULL DEFAULT 'public'
                CHECK (visibility IN ('public','listed','hidden')),
  -- Purpose na rules
  purpose     TEXT,
  rules       JSONB,                            -- [{ text }]
  -- Takwimu (denormalized)
  members_count INT DEFAULT 0,
  posts_count   INT DEFAULT 0,
  -- Timestamps
  created_by  UUID NOT NULL REFERENCES profiles(user_id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at  TIMESTAMPTZ
);
```

---

### 2.11 `space_members`

```sql
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

**RLS (spaces + space_members):**
- `SELECT` (public spaces): Yeyote.
- `SELECT` (listed spaces): Yeyote (lakini kujiunga = ombi).
- `SELECT` (hidden spaces): Mwanachama pekee.
- `INSERT` (space): Mtumiaji aliyeingia.
- `UPDATE` (space): Owner/admin pekee.
- `INSERT` (space_members): Kulingana na visibility — public = moja kwa moja, listed = ombi.

---

### 2.12 `notifications`

Inalingana na: `mock.notifications` + `notificationService`

```sql
CREATE TABLE notifications (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  actor_id    UUID REFERENCES profiles(user_id),  -- nani aliyefanya kitendo
  type        TEXT NOT NULL CHECK (type IN (
                'friend','comment','reaction','channel','hub','live','business','mention')),
  text        TEXT NOT NULL,
  icon        TEXT,
  -- Reference (link kwenda post/conversation/space)
  ref_type    TEXT,                              -- 'post' | 'conversation' | 'space'
  ref_id      UUID,
  read        BOOLEAN DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_notifications_user ON notifications(user_id, created_at DESC) WHERE read = FALSE;
```

**RLS:**
- `SELECT/UPDATE`: Mtumiaji anaona na kusoma notifications zake pekee.

---

### 2.13 `statuses` (Stories — saa 24)

Inalingana na: `mock.statuses` + `homeService.getStatusStrip()`

```sql
CREATE TABLE statuses (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id   UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  text        TEXT,
  media_url   TEXT,
  tone        TEXT DEFAULT 'green',
  live        BOOLEAN DEFAULT FALSE,
  ring        TEXT DEFAULT 'default',           -- 'default' | 'friend' | 'creator'
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at  TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '24 hours')
);

CREATE INDEX idx_statuses_active ON statuses(created_at DESC) WHERE expires_at > now();
```

**RLS:**
- `SELECT`: Yeyote anaweza kuona statuses ambazo hazijaisha.
- `INSERT`: Mtumiaji anaweza kuunda status yake pekee.
- `DELETE`: Mwandishi pekee.

---

## 3. Storage Buckets

```
avatars/     — Profile pictures (public, 2MB max)
media/       — Posts images/videos (public au private kwa visibility)
documents/   — Chat documents, resources (private kwa conversation members)
reels/       — Video za reels (public)
statuses/    — Media za status (public, zinafutwa baada ya 24h)
```

---

## 4. Uhusiano na Model Iliyopo

| Mock Model Field | Supabase Column | Maelezo |
|---|---|---|
| `users[].id` | `profiles.user_id` | UUID badala ya string slug |
| `users[].handle` | `profiles.username` | Bila `@` prefix |
| `users[].type` | `profiles.entity_type` | Sawa sawa |
| `users[].avatarTone` | `profiles.avatar_tone` | Sawa sawa |
| `users[].relationship` | Inahesabiwa (follows + friendships) | Si field iliyohifadhiwa |
| `posts[].kind` | `posts.kind` | Sawa sawa |
| `posts[].media` | `posts.media_url` + `posts.media_meta` | URL tofauti na metadata |
| `posts[].poll` | `posts.poll` (JSONB) + `poll_votes` | Kura katika table tofauti |
| `posts[].userId` | `posts.author_id` | UUID reference |
| `posts[].inHomeTabs` | Inahesabiwa (feedService) | Si field iliyohifadhiwa (sawa na sasa) |
| `posts[].filterTypes` | Inahesabiwa kutoka `kind` | Si field iliyohifadhiwa |
| `chatConversations[].type` | `conversations.type` | direct | group |
| `chatMessages[].state` | `messages.state` | synced/sent/waiting/local/relayed/vault |
| `liveSessions` | `posts WHERE kind = 'liveActivity'` au table ya pekee | Inahitaji majadiliano |

---

## 5. Maswali Yanayohitaji Majibu Kabla ya Migration

1. **Live sessions:** Je, ziwe kwenye `posts` table (kind = 'liveActivity') au table ya pekee (`live_sessions`)? Mock inaweka ndani ya posts, lakini live sessions zina complexity ya ziada (speakers, waveform, viewers).
2. **Reels:** Je, ziwe kwenye `posts` (kind = 'reel') au table ya pekee? Sasa mock inazitenganisha lakini feedMapper inaziunganisha.
3. **Saved/Bookmarked:** Je, tuunde table ya `bookmarks` kwa posts zinazohifadhiwa?
4. **Blocks:** Je, tuunde table ya `blocks` kwa kuzuia watumiaji?
5. **Phone contacts:** Je, tuhifadhi `phone_contacts` au iache kuwa ya kifaa (device)?

---

## 6. Gharama za Supabase (Free Tier)

| Kipengele | Free Tier Limit | Matumizi ya PASIHAI (makadirio ya awali) |
|---|---|---|
| Database | 500 MB | ~50 MB (data ndogo ya kuanzia) |
| Storage | 1 GB | ~200 MB (avatars + media za awali) |
| Bandwidth | 2 GB/mwezi | Inategemea matumizi |
| Auth (MAU) | 50,000 | Chini sana kwa kuanzia |
| Realtime | 200 connections | Chini kwa kuanzia |
| Edge Functions | 500K invocations | Chini kwa kuanzia |

**Hatari:** Free project inasitishwa baada ya wiki bila shughuli. Supabase Pro ($25/mwezi) inahitajika kwa production.

---

## 7. Hatua Zinazofuata (Zinasubiri Idhini)

1. ✅ Client imewekwa (`src/lib/supabaseClient.js`)
2. ✅ `.env.example` imeandaliwa
3. ✅ `.gitignore` imesasishwa
4. ⏳ **Idhini yako** ya schema hii
5. ⏳ Majibu ya maswali 5 hapo juu
6. ⏳ Kuunda migrations (SQL files kwenye `supabase/migrations/`)
7. ⏳ Kuunda RLS policies
8. ⏳ Kubadilisha repository moja (mfano: `contentRepository`) kama jaribio
9. ⏳ Kuendesha smoke tests

---

*Ripoti hii ni PROPOSAL. Hakuna migration wala table yoyote iliyoundwa.*
