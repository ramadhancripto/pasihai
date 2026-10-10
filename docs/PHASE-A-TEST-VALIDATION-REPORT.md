# Phase A — Test Database Validation Report

**Date:** 2026-10-09  
**PostgreSQL:** 17.11 (local)  
**Test Database:** pasihai_test (localhost:5432)

---

## 1. Summary

| Metric | Result |
|--------|--------|
| **Total Test Cases** | 25 |
| **Passed** | 25 ✅ |
| **Failed** | 0 |
| **Migrations Applied** | 10/10 ✅ |
| **Tables Created** | 8 (profiles, follows, posts, reactions, bookmarks, hidden_items, friendships, blocks) |
| **RLS Policies** | 22 policies across 8 tables |
| **Helper Functions** | 7 (auth.uid, can_see_post, is_blocked_by, set_updated_at, update_reaction_count, update_follow_counts, update_friends_count, protect_post_counts) |

**Verdict: ✅ ALL TESTS PASS — Phase A migrations are validated and ready.**

---

## 2. Test Cases Executed (25/25 Passed)

### Profiles (T01–T06)
| # | Test | Result | Mechanism |
|---|------|--------|-----------|
| T01 | Auth trigger creates profile on user signup | ✅ | `handle_new_user()` AFTER INSERT trigger |
| T02 | Username auto-sanitized to lowercase | ✅ | `regexp_replace` in trigger |
| T03 | User can update own profile bio | ✅ | `profiles_update_own` RLS policy |
| T04 | Cannot change `verified` field | ✅ | RLS WITH CHECK blocks |
| T05 | Cannot change `entity_type` field | ✅ | RLS WITH CHECK blocks |
| T06 | Cannot change `followers_count` | ✅ | RLS WITH CHECK + subquery blocks |

### Posts & Visibility (T07–T11)
| # | Test | Result | Mechanism |
|---|------|--------|-----------|
| T07 | User can create own post | ✅ | `posts_insert_own` RLS |
| T08 | Private post hidden from non-author | ✅ | `can_see_post()` returns FALSE |
| T09 | Public post visible to all | ✅ | `can_see_post()` returns TRUE |
| T10 | Followers post hidden from non-followers | ✅ | `can_see_post()` checks follows table |
| T11 | Followers post visible to followers | ✅ | `can_see_post()` checks follows table |

### Reactions & Blocks (T12–T14)
| # | Test | Result | Mechanism |
|---|------|--------|-----------|
| T12 | Reaction triggers count update | ✅ | `update_reaction_count()` trigger |
| T13 | Blocked user cannot see blocker's posts | ✅ | `is_blocked_by()` in SELECT policy |
| T14 | Cannot self-approve friendship | ✅ | RLS WITH CHECK blocks |

### Friendships & Bookmarks (T15–T18)
| # | Test | Result | Mechanism |
|---|------|--------|-----------|
| T15 | Friendship accepted by addressee | ✅ | `friendships_update_own` RLS |
| T16 | Friends count trigger works | ✅ | `update_friends_count()` trigger |
| T17 | User can create own bookmark | ✅ | `bookmarks_insert_own` RLS |
| T18 | User can create hidden item | ✅ | `hidden_insert_own` RLS |

### Security & Integrity (T19–T25)
| # | Test | Result | Mechanism |
|---|------|--------|-----------|
| T19 | Count tampering blocked | ✅ | `protect_post_counts()` trigger |
| T20 | Self-follow blocked | ✅ | CHECK constraint `follower_id != followee_id` |
| T21 | Duplicate reaction blocked | ✅ | PRIMARY KEY (user_id, post_id) |
| T22 | Duplicate bookmark blocked | ✅ | UNIQUE constraint |
| T23 | Soft-deleted post hidden from others | ✅ | `can_see_post()` checks deleted_at |
| T24 | Follow count trigger works | ✅ | `update_follow_counts()` trigger |
| T25 | Self-block blocked | ✅ | RLS WITH CHECK `blocker_id <> blocked_id` |

---

## 3. Fixes Applied During Testing

### 3.1 Migration 007 — WITH CHECK `NEW` alias fix
**Problem:** `WITH CHECK` clause used `NEW.id` and `NEW.status`, causing PostgreSQL error "missing FROM-clause entry for table 'new'".  
**Fix:** Changed to use table name alias (`friendships.id`, `friendships.status`). Inside WITH CHECK, bare column names refer to the NEW row automatically.

### 3.2 RLS Test Environment — Table Ownership
**Problem:** Test user `pasihai_test` owned the tables, so RLS policies didn't apply (PostgreSQL bypasses RLS for table owners).  
**Initial Fix:** `FORCE ROW LEVEL SECURITY` — made RLS apply to owner, but broke SECURITY DEFINER triggers.  
**Final Fix:** Transferred table ownership to `supabase_admin` (superuser, like Supabase production). `pasihai_test` is no longer table owner, so RLS applies naturally. SECURITY DEFINER functions owned by superuser bypass RLS correctly.

### 3.3 `can_see_post()` — Author must see soft-deleted posts
**Problem:** Original logic checked `deleted_at IS NOT NULL → FALSE` BEFORE checking `author_id = v_user`. This meant authors couldn't soft-delete their own posts (UPDATE needs SELECT to find the row).  
**Fix:** Reordered: check `author_id = v_user` FIRST (returns TRUE for author), THEN check `deleted_at`.

### 3.4 `protect_post_counts()` — New trigger for count protection
**Problem:** Original `posts_update_own` WITH CHECK used subqueries to prevent count tampering, but subqueries failed during soft-delete (SELECT policy blocks soft-deleted posts).  
**Fix:** Simplified WITH CHECK to `author_id = auth.uid()` only. Added `protect_post_counts()` BEFORE UPDATE trigger that silently reverts any unauthorized changes to `reactions_count`, `comments_count`, `shares_count`.

### 3.5 Count triggers — `app.allow_count_update` flag
**Problem:** `protect_post_counts()` blocked ALL count changes, including legitimate trigger-based updates.  
**Fix:** Count triggers (`update_reaction_count`, `update_follow_counts`, `update_friends_count`) now set `app.allow_count_update = 'true'` before UPDATE and reset to `'false'` after. `protect_post_counts()` checks this flag.

### 3.6 `handle_new_user()` — Must be owned by superuser
**Problem:** Trigger function owned by test user caused RLS violation on profile INSERT.  
**Fix:** Function owned by `postgres` (superuser), so SECURITY DEFINER bypasses RLS correctly.

---

## 4. Test Database Setup Commands

```bash
# Install PostgreSQL
sudo apt-get install postgresql postgresql-contrib

# Start service
sudo pg_ctlcluster 17 main start

# Create test database and auth schema
sudo -u postgres psql <<'EOF'
CREATE DATABASE pasihai_test;
CREATE USER pasihai_test WITH PASSWORD 'test_password_123';

-- Auth schema (Supabase-compatible)
CREATE SCHEMA auth;
CREATE TABLE auth.users (
  id UUID PRIMARY KEY,
  email TEXT UNIQUE,
  raw_user_meta_data JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE OR REPLACE FUNCTION auth.uid()
RETURNS UUID AS $$
  SELECT COALESCE(
    current_setting('request.jwt.claims', true)::jsonb->>'sub',
    current_setting('app.current_user_id', true)
  )::UUID;
$$ LANGUAGE sql VOLATILE;

-- Supabase roles
CREATE ROLE anon NOLOGIN NOINHERIT;
CREATE ROLE authenticated NOLOGIN NOINHERIT;
CREATE ROLE service_role NOLOGIN NOINHERIT BYPASSRLS;
CREATE ROLE supabase_admin LOGIN SUPERUSER;

GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO pasihai_test;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO pasihai_test;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO pasihai_test;
GRANT ALL ON TABLE auth.users TO pasihai_test;
EOF

# Apply migrations
for f in supabase/migrations/001_profiles.sql \
         supabase/migrations/002_follows.sql \
         supabase/migrations/003_posts.sql \
         supabase/migrations/004_reactions.sql \
         supabase/migrations/005_bookmarks.sql \
         supabase/migrations/006_hidden_items.sql \
         supabase/migrations/007_friendships.sql \
         supabase/migrations/007b_update_can_see_post.sql \
         supabase/migrations/008_blocks.sql \
         supabase/migrations/008b_update_is_blocked_by.sql; do
  PGPASSWORD='test_password_123' psql -h localhost -U pasihai_test -d pasihai_test -f "$f"
done

# Transfer table ownership to supabase_admin (like Supabase production)
sudo -u postgres psql -d pasihai_test -c "
  ALTER TABLE profiles OWNER TO supabase_admin;
  ALTER TABLE follows OWNER TO supabase_admin;
  ALTER TABLE posts OWNER TO supabase_admin;
  ALTER TABLE reactions OWNER TO supabase_admin;
  ALTER TABLE bookmarks OWNER TO supabase_admin;
  ALTER TABLE hidden_items OWNER TO supabase_admin;
  ALTER TABLE friendships OWNER TO supabase_admin;
  ALTER TABLE blocks OWNER TO supabase_admin;
  ALTER TABLE auth.users OWNER TO supabase_admin;
"

# Run tests
PGPASSWORD='test_password_123' psql -h localhost -U pasihai_test -d pasihai_test \
  -f supabase/tests/run_tests_v2.sql
```

---

## 5. Migration Files Modified

| File | Changes |
|------|---------|
| `002_follows.sql` | `update_follow_counts()` — added `app.allow_count_update` flag |
| `003_posts.sql` | `can_see_post()` — author sees deleted posts first; `posts_update_own` — simplified WITH CHECK; added `protect_post_counts()` trigger |
| `004_reactions.sql` | `update_reaction_count()` — added `app.allow_count_update` flag |
| `007_friendships.sql` | `update_friends_count()` — added flag + split batch UPDATE to individual |
| `007b_update_can_see_post.sql` | `can_see_post()` — author sees deleted posts first |

---

## 6. What Was NOT Tested (Clearly Stated)

| Area | Reason |
|------|--------|
| **Full Supabase environment** | Test DB is local PostgreSQL, not hosted Supabase. No PostgREST, no auth endpoints, no storage. |
| **Real-time subscriptions** | Requires Supabase Realtime server |
| **Edge functions** | Not part of Phase A migrations |
| **Full-text search ranking** | FTS column exists but ranking/relevance not tested |
| **Concurrent writes** | No parallel transaction tests |
| **Migration idempotency** | Migrations use `CREATE` not `CREATE IF NOT EXISTS` (run once) |
| **124 detailed test cases** (supabase/tests/001-004) | These were PREPARED but NOT executed in this run. Only the 25-case v2 runner was executed. |

---

## 7. Readiness Verdict

| Criterion | Status |
|-----------|--------|
| All migrations apply without errors | ✅ |
| RLS policies enforce correct access | ✅ |
| Triggers maintain data integrity | ✅ |
| Count tampering prevented | ✅ |
| Self-referential operations blocked | ✅ |
| Visibility system matches `isVisible()` | ✅ |
| Soft delete works correctly | ✅ |
| Block enforcement works | ✅ |
| Migration files consistent with test DB | ✅ |

### **🟢 PHASE A MIGRATIONS ARE READY**

The migrations are validated and can be committed. When ready to switch from mock mode to production:
1. Apply migrations to hosted Supabase project (`lbcpacijbiukqcpkfktp`)
2. Update repository switch point (`data/repositories/index.js`)
3. Do NOT use `service_role` key in browser
