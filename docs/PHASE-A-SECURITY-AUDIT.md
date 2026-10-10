# PASIHAI — Phase A Final Security Audit Report

**Date:** 2026-10-09  
**Baseline:** `661fcdb` (main)  
**Status:** ✅ PHASE A READY FOR SUPABASE TESTING

---

## 1. MIGRATION REVIEW RESULTS

| Migration | Table | Constraints | Indexes | Triggers | RLS | Status |
|---|---|---|---|---|---|---|
| 001 | profiles | PK, FK, UNIQUE, CHECK×6 | 3 (username, type, FTS) | 2 (updated_at, auth_trigger) | 2 policies | ✅ Fixed |
| 002 | follows | PK, FK×2, CHECK (self) | 1 (followee) | 1 (counts) | 3 policies | ✅ |
| 003 | posts | PK, FK, CHECK×3 | 4 (feed, author, kind, FTS) | 1 (updated_at) | 3 policies | ✅ Fixed |
| 004 | reactions | PK, FK×2, CHECK (emoji) | 1 (post) | 1 (count) | 3 policies | ✅ |
| 005 | bookmarks | PK, FK, UNIQUE, CHECK (ref_type) | 2 (user, ref) | — | 3 policies | ✅ |
| 006 | hidden_items | PK, FK×2 | — | — | 3 policies | ✅ |
| 007 | friendships | PK, FK×2, UNIQUE, CHECK (status) | 2 (requester, addressee) | 2 (count, updated_at) | 3 policies | ✅ Fixed |
| 007b | (function) | — | — | — | — | ✅ |
| 008 | blocks | PK, FK×2, CHECK (self) | 2 (blocker, blocked) | — | 3 policies | ✅ |
| 008b | (function) | — | — | — | — | ✅ |

---

## 2. SECURITY ISSUES FOUND & FIXED

| # | Issue | Severity | Migration | Fix |
|---|---|---|---|---|
| 1 | **Username sanitization** — `handle_new_user()` accepted raw metadata without validation, could violate CHECK constraint | High | 001 | Added `lower()`, `regexp_replace()`, length checks, truncation |
| 2 | **Privileged field protection** — `profiles_update_own` allowed changing `verified`, `entity_type`, counts | High | 001 | Added WITH CHECK subqueries for 6 protected fields |
| 3 | **Count tampering** — `posts_update_own` allowed changing `reactions_count`, `comments_count`, `shares_count` | High | 003 | Added WITH CHECK subqueries for 3 count fields |
| 4 | **Self-approval** — Friendship requester could set `status = 'accepted'` on their own request | High | 007 | Added WITH CHECK: requester can only set `status = 'declined'` |
| 5 | **WITH CHECK alias clarity** — `friendships.id` in subquery was ambiguous | Low | 007 | Changed to `f.id = NEW.id` with explicit alias |

---

## 3. RLS POLICY MATRIX (FINAL)

| Table | SELECT | INSERT | UPDATE | DELETE |
|---|---|---|---|---|
| **profiles** | Authenticated (not deleted) | ❌ Trigger only | Own + protected fields locked | ❌ None |
| **follows** | Authenticated (all) | Own (follower=uid) | ❌ None | Own (follower=uid) |
| **posts** | Visible + not blocked | Own (author=uid) | Own + counts locked | ❌ Soft delete via UPDATE |
| **reactions** | Authenticated (all) | Own (user=uid) | ❌ None | Own (user=uid) |
| **bookmarks** | Own only | Own (user=uid) | ❌ None | Own (user=uid) |
| **hidden_items** | Own only | Own (user=uid) | ❌ None | Own (user=uid) |
| **friendships** | Own (requester OR addressee) | Own (requester=uid, not self) | Addressee: any status. Requester: 'declined' only | ❌ None |
| **blocks** | Own (blocker=uid) | Own (blocker=uid, not self) | ❌ None | Own (blocker=uid) |

### Protected Fields (Cannot be changed by user)

| Table | Protected Fields | Changed By |
|---|---|---|
| profiles | `verified`, `entity_type`, `friends_count`, `followers_count`, `following_count`, `posts_count` | Triggers + system |
| posts | `reactions_count`, `comments_count`, `shares_count` | Triggers |
| friendships | `requester_id`, `addressee_id` | Immutable after creation |

---

## 4. HELPER FUNCTION SAFETY AUDIT

| Function | SECURITY DEFINER | Risk Assessment |
|---|---|---|
| `handle_new_user()` | ✅ Yes | **Safe** — Only INSERTs one profile for NEW.id. Sanitizes input. Cannot be called by users. |
| `set_updated_at()` | ❌ No | **Safe** — Standard trigger, no privilege escalation. |
| `update_follow_counts()` | ✅ Yes | **Safe** — Only UPDATEs counts for involved users. Scoped to INSERT/DELETE rows. |
| `update_reaction_count()` | ✅ Yes | **Safe** — Only UPDATEs post count. Scoped to INSERT/DELETE rows. |
| `update_friends_count()` | ✅ Yes | **Safe** — Only UPDATEs profile counts. Scoped to UPDATE rows. |
| `can_see_post()` | ✅ Yes | **Safe** — Returns BOOLEAN only. Uses auth.uid(). STABLE (no side effects). Bypasses RLS on follows/friendships/blocks by design (needed for visibility checks). |
| `is_blocked_by()` | ✅ Yes | **Safe** — Returns BOOLEAN only. Bypasses RLS on blocks by design (needed to check if author blocked reader). |

### Recursion Analysis
- **No recursive triggers detected.** No trigger chain can loop:
  - `follows INSERT` → `profiles UPDATE` (count) → `set_updated_at` (no further trigger)
  - `reactions INSERT` → `posts UPDATE` (count) → `set_updated_at` (no further trigger)
  - `friendships UPDATE` → `profiles UPDATE` (count) → `set_updated_at` (no further trigger)

### Privilege Escalation Analysis
- **No escalation paths found.** All SECURITY DEFINER functions:
  - Use `auth.uid()` for user identification
  - Perform only specific, limited operations
  - Cannot be called directly by users (triggered or used in RLS only)

---

## 5. TEST RESULTS

### Tests Executed

| Test Type | Count | Result |
|---|---|---|
| Smoke tests (UI) | 461 | ✅ **461/461 passed** |
| Build | 1 | ✅ **Success** (2.75s) |

### Tests Prepared (Not Executed — Supabase DB Required)

| Test File | Cases | Coverage |
|---|---|---|
| `tests/001_profiles.sql` | 10 | Profile CRUD, constraints, trigger |
| `tests/002_posts.sql` | 25 | Visibility, ownership, constraints, blocks, anonymous |
| `tests/003_interactions.sql` | 55 | Follows, reactions, bookmarks, hidden, friendships, blocks |
| `tests/004_security_audit.sql` | **34** | Privileged fields, self-approval, count tampering, username sanitization, anonymous access |
| **Total** | **124** | **0 executed, 124 prepared** |

### How to Execute Tests

```bash
# Option 1: Supabase CLI (recommended)
npm install -g supabase
supabase init
supabase start          # Starts local PostgreSQL + Auth + API
supabase db reset       # Applies all migrations + seed
supabase db test        # Runs pgTAP tests

# Option 2: Supabase Dashboard
# 1. Go to SQL Editor
# 2. Copy each test file content
# 3. Execute and review results

# Option 3: Docker + psql
docker run -d --name pasihai-db -e POSTGRES_PASSWORD=postgres -p 5432:5432 supabase/postgres
psql postgres://postgres:postgres@localhost:5432/postgres -f supabase/migrations/001_profiles.sql
# ... apply all migrations ...
psql postgres://postgres:postgres@localhost:5432/postgres -f supabase/tests/001_profiles.sql
```

---

## 6. BUILD & SMOKE TEST RESULTS

```
$ npm run build
✓ 116 modules transformed
✓ built in 2.75s
  dist/assets/index.js   629.99 kB (gzip: 178.28 kB)
  dist/assets/index.css  190.26 kB (gzip:  30.21 kB)

$ npm run smoke
✓ 461/461 zimepita
```

**No regressions.** All existing UI functionality preserved.

---

## 7. COMPLIANCE CHECKLIST

| Requirement | Status | Evidence |
|---|---|---|
| Migrations ordered by dependencies | ✅ | 001→002→003→004→005→006→007→007b→008→008b |
| All 8 tables have RLS enabled | ✅ | `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` in each |
| No anonymous access | ✅ | All policies require `authenticated` role |
| Owner-only CRUD | ✅ | `auth.uid()` checks in all INSERT/UPDATE/DELETE policies |
| Followers visibility enforced | ✅ | `can_see_post()` checks follows + friendships |
| Private posts restricted | ✅ | `can_see_post()` returns FALSE for non-authors |
| Blocks prevent access | ✅ | `is_blocked_by()` in posts SELECT policy |
| Self-follow/friend/block prevented | ✅ | CHECK constraints: `id != id` |
| Duplicate records prevented | ✅ | PRIMARY KEY + UNIQUE constraints |
| User spoofing prevented | ✅ | All INSERT policies check `auth.uid()` |
| Author_id immutable | ✅ | WITH CHECK: `author_id = auth.uid()` |
| Counts immutable by users | ✅ | WITH CHECK subqueries lock count fields |
| Verified/entity_type immutable | ✅ | WITH CHECK subqueries lock privileged fields |
| Self-approval prevented | ✅ | WITH CHECK: requester can only decline |
| No service_role in browser | ✅ | Only anon key in supabaseClient.js |
| Mock mode preserved | ✅ | VITE_SUPABASE_MODE=mock (default) |
| No UI changes | ✅ | Zero changes to src/ UI files |
| No commit/push/deployment | ✅ | Local file changes only |
| Tests distinguish executed vs prepared | ✅ | 461 executed, 124 prepared (clearly marked) |

---

## 8. FILES CHANGED IN THIS AUDIT

| File | Change | Reason |
|---|---|---|
| `supabase/migrations/001_profiles.sql` | ✏️ Fixed | Username sanitization + privileged field protection |
| `supabase/migrations/003_posts.sql` | ✏️ Fixed | Count tampering protection |
| `supabase/migrations/007_friendships.sql` | ✏️ Fixed | Self-approval prevention + alias clarity |
| `supabase/tests/004_security_audit.sql` | 🆕 New | 34 security-focused test cases |
| `docs/PHASE-A-SECURITY-AUDIT.md` | 🆕 New | This report |

---

## 9. VERDICT

### ✅ Phase A is READY for Supabase testing.

**Migrations:** 10 files, all reviewed and security-hardened.  
**RLS:** 23 policies across 8 tables, all verified.  
**Tests:** 124 cases prepared (0 executed — requires Supabase DB).  
**Security:** 5 issues found and fixed. No remaining vulnerabilities identified.  
**UI:** Unchanged. All 461 smoke tests pass.

### Next Steps

1. Apply migrations to Supabase project: `supabase db push`
2. Run RLS tests: `supabase db test`
3. Review test results and fix any issues
4. Create Supabase repository implementations
5. Swap at composition root (one-line change)

---

*Security audit complete. No commit, push, deployment, or database changes made.*
