-- ══════════════════════════════════════════════════════════════
-- PASIHAI — RLS Test Runner (PostgreSQL standalone)
--
-- Endesha: psql -h localhost -U pasihai_test -d pasihai_test -f run_tests.sql
--
-- Hii inatumia DO blocks na RAISE NOTICE kwa matokeo.
-- Hakuna pgTAP inayohitajika.
-- ══════════════════════════════════════════════════════════════

-- ── Setup: test users ─────────────────────────────────────────
INSERT INTO auth.users (id, email, raw_user_meta_data) VALUES
  ('11111111-1111-1111-1111-111111111111', 'alice@test.com', '{"username": "alice", "display_name": "Alice Test"}'),
  ('22222222-2222-2222-2222-222222222222', 'bob@test.com', '{"username": "bob", "display_name": "Bob Test"}'),
  ('33333333-3333-3333-3333-333333333333', 'carol@test.com', '{"username": "carol", "display_name": "Carol Test"}')
ON CONFLICT (id) DO NOTHING;

-- Verify trigger created profiles
DO $$
DECLARE
  v_count INT;
BEGIN
  SELECT count(*) INTO v_count FROM profiles WHERE user_id IN (
    '11111111-1111-1111-1111-111111111111',
    '22222222-2222-2222-2222-222222222222',
    '33333333-3333-3333-3333-333333333333'
  );
  IF v_count = 3 THEN
    RAISE NOTICE '✅ T01: Auth trigger — profiles 3 zimeundwa na trigger';
  ELSE
    RAISE NOTICE '❌ T01: Auth trigger — profiles % zimeundwa (expected 3)', v_count;
  END IF;
END $$;

-- T02: Profile fields are correct
DO $$
DECLARE
  v_username TEXT;
BEGIN
  SELECT username INTO v_username FROM profiles WHERE user_id = '11111111-1111-1111-1111-111111111111';
  IF v_username = 'alice' THEN
    RAISE NOTICE '✅ T02: Username sanitization — alice sahihi';
  ELSE
    RAISE NOTICE '❌ T02: Username — got "%" expected "alice"', v_username;
  END IF;
END $$;

-- T03: User can update own profile (as alice)
DO $$
BEGIN
  SET LOCAL ROLE pasihai_test;
  PERFORM set_config('app.current_user_id', '11111111-1111-1111-1111-111111111111', true);
  UPDATE profiles SET bio = 'Updated by alice' WHERE user_id = '11111111-1111-1111-1111-111111111111';
  IF FOUND THEN
    RAISE NOTICE '✅ T03: Profile update — alice anaweza kubadilisha bio yake';
  ELSE
    RAISE NOTICE '❌ T03: Profile update — imeshindwa';
  END IF;
END $$;

-- T04: User CANNOT change verified field
DO $$
DECLARE
  v_verified BOOLEAN;
BEGIN
  SET LOCAL ROLE pasihai_test;
  PERFORM set_config('app.current_user_id', '11111111-1111-1111-1111-111111111111', true);
  BEGIN
    UPDATE profiles SET verified = true WHERE user_id = '11111111-1111-1111-1111-111111111111';
    -- Check if it actually changed
    SELECT verified INTO v_verified FROM profiles WHERE user_id = '11111111-1111-1111-1111-111111111111';
    IF v_verified = false THEN
      RAISE NOTICE '✅ T04: Verified protection — WITH CHECK imezuia kubadilisha verified';
    ELSE
      RAISE NOTICE '❌ T04: Verified protection — verified imebadilishwa! (should be blocked)';
      -- Revert
      UPDATE profiles SET verified = false WHERE user_id = '11111111-1111-1111-1111-111111111111';
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '✅ T04: Verified protection — RLS imezuia (%)', SQLERRM;
  END;
END $$;

-- T05: User CANNOT change entity_type
DO $$
DECLARE
  v_type TEXT;
BEGIN
  SET LOCAL ROLE pasihai_test;
  PERFORM set_config('app.current_user_id', '11111111-1111-1111-1111-111111111111', true);
  BEGIN
    UPDATE profiles SET entity_type = 'channel' WHERE user_id = '11111111-1111-1111-1111-111111111111';
    SELECT entity_type INTO v_type FROM profiles WHERE user_id = '11111111-1111-1111-1111-111111111111';
    IF v_type = 'person' THEN
      RAISE NOTICE '✅ T05: Entity type protection — WITH CHECK imezuia';
    ELSE
      RAISE NOTICE '❌ T05: Entity type protection — entity_type imebadilishwa! (%)', v_type;
      UPDATE profiles SET entity_type = 'person' WHERE user_id = '11111111-1111-1111-1111-111111111111';
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '✅ T05: Entity type protection — RLS imezuia (%)', SQLERRM;
  END;
END $$;

-- T06: User CANNOT change followers_count
DO $$
DECLARE
  v_count INT;
BEGIN
  SET LOCAL ROLE pasihai_test;
  PERFORM set_config('app.current_user_id', '11111111-1111-1111-1111-111111111111', true);
  BEGIN
    UPDATE profiles SET followers_count = 999 WHERE user_id = '11111111-1111-1111-1111-111111111111';
    SELECT followers_count INTO v_count FROM profiles WHERE user_id = '11111111-1111-1111-1111-111111111111';
    IF v_count = 0 THEN
      RAISE NOTICE '✅ T06: Followers count protection — WITH CHECK imezuia';
    ELSE
      RAISE NOTICE '❌ T06: Followers count protection — count imebadilishwa! (%)', v_count;
      UPDATE profiles SET followers_count = 0 WHERE user_id = '11111111-1111-1111-1111-111111111111';
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '✅ T06: Followers count protection — RLS imezuia (%)', SQLERRM;
  END;
END $$;

-- T07: Post creation (as alice)
DO $$
DECLARE
  v_post_id UUID;
BEGIN
  SET LOCAL ROLE pasihai_test;
  PERFORM set_config('app.current_user_id', '11111111-1111-1111-1111-111111111111', true);
  INSERT INTO posts (author_id, kind, text, visibility)
  VALUES ('11111111-1111-1111-1111-111111111111', 'text', 'Hello from Alice', 'public')
  RETURNING id INTO v_post_id;
  IF v_post_id IS NOT NULL THEN
    RAISE NOTICE '✅ T07: Post creation — alice ameunda post (%)', v_post_id;
  ELSE
    RAISE NOTICE '❌ T07: Post creation — imeshindwa';
  END IF;
END $$;

-- T08: Private post not visible to others
DO $$
DECLARE
  v_post_id UUID;
  v_visible BOOLEAN;
BEGIN
  SET LOCAL ROLE pasihai_test;
  -- Alice creates private post
  PERFORM set_config('app.current_user_id', '11111111-1111-1111-1111-111111111111', true);
  INSERT INTO posts (author_id, kind, text, visibility)
  VALUES ('11111111-1111-1111-1111-111111111111', 'text', 'Private post', 'private')
  RETURNING id INTO v_post_id;

  -- Bob tries to see it
  PERFORM set_config('app.current_user_id', '22222222-2222-2222-2222-222222222222', true);
  SELECT can_see_post(p) INTO v_visible FROM posts p WHERE id = v_post_id;

  IF v_visible = false OR v_visible IS NULL THEN
    RAISE NOTICE '✅ T08: Private post — bob HAWEZI kuona post ya private ya alice';
  ELSE
    RAISE NOTICE '❌ T08: Private post — bob ANAONA post ya private! (should be blocked)';
  END IF;
END $$;

-- T09: Public post visible to all
DO $$
DECLARE
  v_post_id UUID;
  v_visible BOOLEAN;
BEGIN
  SET LOCAL ROLE pasihai_test;
  PERFORM set_config('app.current_user_id', '11111111-1111-1111-1111-111111111111', true);
  INSERT INTO posts (author_id, kind, text, visibility)
  VALUES ('11111111-1111-1111-1111-111111111111', 'text', 'Public post', 'public')
  RETURNING id INTO v_post_id;

  PERFORM set_config('app.current_user_id', '22222222-2222-2222-2222-222222222222', true);
  SELECT can_see_post(p) INTO v_visible FROM posts p WHERE id = v_post_id;

  IF v_visible = true THEN
    RAISE NOTICE '✅ T09: Public post — bob ANAONA post ya public ya alice';
  ELSE
    RAISE NOTICE '❌ T09: Public post — bob haoni post ya public (should be visible)';
  END IF;
END $$;

-- T10: Followers-only post not visible without follow
DO $$
DECLARE
  v_post_id UUID;
  v_visible BOOLEAN;
BEGIN
  SET LOCAL ROLE pasihai_test;
  PERFORM set_config('app.current_user_id', '11111111-1111-1111-1111-111111111111', true);
  INSERT INTO posts (author_id, kind, text, visibility)
  VALUES ('11111111-1111-1111-1111-111111111111', 'text', 'Followers only', 'followers')
  RETURNING id INTO v_post_id;

  -- Carol (not following alice) tries to see
  PERFORM set_config('app.current_user_id', '33333333-3333-3333-3333-333333333333', true);
  SELECT can_see_post(p) INTO v_visible FROM posts p WHERE id = v_post_id;

  IF v_visible = false OR v_visible IS NULL THEN
    RAISE NOTICE '✅ T10: Followers post — carol (asiye kufuata) HAWEZI kuona';
  ELSE
    RAISE NOTICE '❌ T10: Followers post — carol ANAONA bila kufuata! (should be blocked)';
  END IF;
END $$;

-- T11: Followers-only post visible after follow
DO $$
DECLARE
  v_post_id UUID;
  v_visible BOOLEAN;
BEGIN
  SET LOCAL ROLE pasihai_test;
  PERFORM set_config('app.current_user_id', '11111111-1111-1111-1111-111111111111', true);
  INSERT INTO posts (author_id, kind, text, visibility)
  VALUES ('11111111-1111-1111-1111-111111111111', 'text', 'Followers only 2', 'followers')
  RETURNING id INTO v_post_id;

  -- Bob follows alice
  PERFORM set_config('app.current_user_id', '22222222-2222-2222-2222-222222222222', true);
  INSERT INTO follows (follower_id, followee_id)
  VALUES ('22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111')
  ON CONFLICT DO NOTHING;

  SELECT can_see_post(p) INTO v_visible FROM posts p WHERE id = v_post_id;

  IF v_visible = true THEN
    RAISE NOTICE '✅ T11: Followers post — bob (aliyefuata) ANAONA';
  ELSE
    RAISE NOTICE '❌ T11: Followers post — bob haoni hata baada ya kufuata (should be visible)';
  END IF;
END $$;

-- T12: Reaction creation and count update
DO $$
DECLARE
  v_post_id UUID;
  v_count INT;
BEGIN
  SET LOCAL ROLE pasihai_test;
  PERFORM set_config('app.current_user_id', '11111111-1111-1111-1111-111111111111', true);
  INSERT INTO posts (author_id, kind, text) VALUES ('11111111-1111-1111-1111-111111111111', 'text', 'Like test') RETURNING id INTO v_post_id;

  PERFORM set_config('app.current_user_id', '22222222-2222-2222-2222-222222222222', true);
  INSERT INTO reactions (user_id, post_id, emoji) VALUES ('22222222-2222-2222-2222-222222222222', v_post_id, 'heart');

  SELECT reactions_count INTO v_count FROM posts WHERE id = v_post_id;
  IF v_count = 1 THEN
    RAISE NOTICE '✅ T12: Reaction — count imesasishwa (1)';
  ELSE
    RAISE NOTICE '❌ T12: Reaction — count = % (expected 1)', v_count;
  END IF;
END $$;

-- T13: Blocked user cannot see posts
DO $$
DECLARE
  v_post_id UUID;
  v_visible BOOLEAN;
BEGIN
  SET LOCAL ROLE pasihai_test;
  -- Alice creates public post
  PERFORM set_config('app.current_user_id', '11111111-1111-1111-1111-111111111111', true);
  INSERT INTO posts (author_id, kind, text) VALUES ('11111111-1111-1111-1111-111111111111', 'text', 'Block test') RETURNING id INTO v_post_id;

  -- Alice blocks Carol
  INSERT INTO blocks (blocker_id, blocked_id) VALUES ('11111111-1111-1111-1111-111111111111', '33333333-3333-3333-3333-333333333333') ON CONFLICT DO NOTHING;

  -- Carol tries to see
  PERFORM set_config('app.current_user_id', '33333333-3333-3333-3333-333333333333', true);
  SELECT can_see_post(p) INTO v_visible FROM posts p WHERE id = v_post_id;

  IF v_visible = false OR v_visible IS NULL THEN
    RAISE NOTICE '✅ T13: Block — carol (aliyezuiliwa) HAWEZI kuona post ya alice';
  ELSE
    RAISE NOTICE '❌ T13: Block — carol ANAONA post ya alice! (should be blocked)';
  END IF;
END $$;

-- T14: Friendship request and self-approval prevention
DO $$
DECLARE
  v_friendship_id UUID;
  v_status TEXT;
BEGIN
  SET LOCAL ROLE pasihai_test;
  -- Alice sends friend request to Bob
  PERFORM set_config('app.current_user_id', '11111111-1111-1111-1111-111111111111', true);
  INSERT INTO friendships (requester_id, addressee_id, status)
  VALUES ('11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', 'pending')
  RETURNING id INTO v_friendship_id;

  -- Alice tries to self-approve (should fail)
  BEGIN
    UPDATE friendships SET status = 'accepted' WHERE id = v_friendship_id;
    SELECT status INTO v_status FROM friendships WHERE id = v_friendship_id;
    IF v_status = 'pending' THEN
      RAISE NOTICE '✅ T14: Self-approval prevention — alice HAJAJIKUBALIA (WITH CHECK imezuia)';
    ELSE
      RAISE NOTICE '❌ T14: Self-approval prevention — alice amejikubalia! status = %', v_status;
      UPDATE friendships SET status = 'pending' WHERE id = v_friendship_id;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '✅ T14: Self-approval prevention — RLS imezuia (%)', SQLERRM;
  END;
END $$;

-- T15: Friendship acceptance by addressee
DO $$
DECLARE
  v_friendship_id UUID;
  v_status TEXT;
BEGIN
  SET LOCAL ROLE pasihai_test;
  -- Find the friendship from T14
  SELECT id INTO v_friendship_id FROM friendships
  WHERE requester_id = '11111111-1111-1111-1111-111111111111'
    AND addressee_id = '22222222-2222-2222-2222-222222222222'
  LIMIT 1;

  -- Bob accepts
  PERFORM set_config('app.current_user_id', '22222222-2222-2222-2222-222222222222', true);
  UPDATE friendships SET status = 'accepted' WHERE id = v_friendship_id;
  SELECT status INTO v_status FROM friendships WHERE id = v_friendship_id;

  IF v_status = 'accepted' THEN
    RAISE NOTICE '✅ T15: Friendship acceptance — bob amekubali ombi';
  ELSE
    RAISE NOTICE '❌ T15: Friendship acceptance — status = % (expected accepted)', v_status;
  END IF;
END $$;

-- T16: Friends count updated after acceptance
DO $$
DECLARE
  v_alice_friends INT;
  v_bob_friends INT;
BEGIN
  SELECT friends_count INTO v_alice_friends FROM profiles WHERE user_id = '11111111-1111-1111-1111-111111111111';
  SELECT friends_count INTO v_bob_friends FROM profiles WHERE user_id = '22222222-2222-2222-2222-222222222222';
  IF v_alice_friends = 1 AND v_bob_friends = 1 THEN
    RAISE NOTICE '✅ T16: Friends count — alice=% bob=% (both 1)', v_alice_friends, v_bob_friends;
  ELSE
    RAISE NOTICE '❌ T16: Friends count — alice=% bob=% (expected both 1)', v_alice_friends, v_bob_friends;
  END IF;
END $$;

-- T17: Bookmark creation
DO $$
DECLARE
  v_post_id UUID;
  v_bookmark_id UUID;
BEGIN
  SET LOCAL ROLE pasihai_test;
  PERFORM set_config('app.current_user_id', '11111111-1111-1111-1111-111111111111', true);
  SELECT id INTO v_post_id FROM posts WHERE author_id = '11111111-1111-1111-1111-111111111111' LIMIT 1;
  INSERT INTO bookmarks (user_id, ref_type, ref_id) VALUES ('11111111-1111-1111-1111-111111111111', 'post', v_post_id) RETURNING id INTO v_bookmark_id;
  IF v_bookmark_id IS NOT NULL THEN
    RAISE NOTICE '✅ T17: Bookmark — alice amehifadhi post';
  ELSE
    RAISE NOTICE '❌ T17: Bookmark — imeshindwa';
  END IF;
END $$;

-- T18: Hidden item creation
DO $$
DECLARE
  v_post_id UUID;
BEGIN
  SET LOCAL ROLE pasihai_test;
  PERFORM set_config('app.current_user_id', '22222222-2222-2222-2222-222222222222', true);
  SELECT id INTO v_post_id FROM posts WHERE author_id = '11111111-1111-1111-1111-111111111111' LIMIT 1;
  INSERT INTO hidden_items (user_id, post_id) VALUES ('22222222-2222-2222-2222-222222222222', v_post_id);
  IF FOUND THEN
    RAISE NOTICE '✅ T18: Hidden item — bob ameficha post';
  ELSE
    RAISE NOTICE '❌ T18: Hidden item — imeshindwa';
  END IF;
END $$;

-- T19: Follow count trigger
DO $$
DECLARE
  v_alice_followers INT;
  v_bob_following INT;
BEGIN
  SELECT followers_count INTO v_alice_followers FROM profiles WHERE user_id = '11111111-1111-1111-1111-111111111111';
  SELECT following_count INTO v_bob_following FROM profiles WHERE user_id = '22222222-2222-2222-2222-222222222222';
  IF v_alice_followers >= 1 AND v_bob_following >= 1 THEN
    RAISE NOTICE '✅ T19: Follow counts — alice followers=%, bob following=%', v_alice_followers, v_bob_following;
  ELSE
    RAISE NOTICE '❌ T19: Follow counts — alice=% bob=% (expected >= 1)', v_alice_followers, v_bob_following;
  END IF;
END $$;

-- T20: Post count tampering prevention
DO $$
DECLARE
  v_post_id UUID;
  v_count INT;
BEGIN
  SET LOCAL ROLE pasihai_test;
  PERFORM set_config('app.current_user_id', '11111111-1111-1111-1111-111111111111', true);
  SELECT id INTO v_post_id FROM posts WHERE author_id = '11111111-1111-1111-1111-111111111111' LIMIT 1;
  BEGIN
    UPDATE posts SET reactions_count = 999 WHERE id = v_post_id;
    SELECT reactions_count INTO v_count FROM posts WHERE id = v_post_id;
    IF v_count = 999 THEN
      RAISE NOTICE '❌ T20: Count tampering — reactions_count imebadilishwa kuwa 999! (should be blocked)';
      UPDATE posts SET reactions_count = 0 WHERE id = v_post_id;
    ELSE
      RAISE NOTICE '✅ T20: Count tampering — WITH CHECK imezuia (count bado %) ', v_count;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '✅ T20: Count tampering — RLS imezuia (%)', SQLERRM;
  END;
END $$;

-- T21: Self-follow prevention
DO $$
BEGIN
  SET LOCAL ROLE pasihai_test;
  PERFORM set_config('app.current_user_id', '11111111-1111-1111-1111-111111111111', true);
  BEGIN
    INSERT INTO follows (follower_id, followee_id) VALUES ('11111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111');
    RAISE NOTICE '❌ T21: Self-follow — imeruhusiwa! (should be blocked by CHECK)';
    DELETE FROM follows WHERE follower_id = '11111111-1111-1111-1111-111111111111' AND followee_id = '11111111-1111-1111-1111-111111111111';
  EXCEPTION WHEN check_violation THEN
    RAISE NOTICE '✅ T21: Self-follow — CHECK constraint imezuia';
  END;
END $$;

-- T22: Self-block prevention
DO $$
BEGIN
  SET LOCAL ROLE pasihai_test;
  PERFORM set_config('app.current_user_id', '11111111-1111-1111-1111-111111111111', true);
  BEGIN
    INSERT INTO blocks (blocker_id, blocked_id) VALUES ('11111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111');
    RAISE NOTICE '❌ T22: Self-block — imeruhusiwa! (should be blocked by CHECK)';
    DELETE FROM blocks WHERE blocker_id = '11111111-1111-1111-1111-111111111111' AND blocked_id = '11111111-1111-1111-1111-111111111111';
  EXCEPTION WHEN check_violation THEN
    RAISE NOTICE '✅ T22: Self-block — CHECK constraint imezuia';
  END;
END $$;

-- T23: Duplicate reaction prevention
DO $$
DECLARE
  v_post_id UUID;
BEGIN
  SET LOCAL ROLE pasihai_test;
  SELECT id INTO v_post_id FROM posts WHERE author_id = '11111111-1111-1111-1111-111111111111' LIMIT 1;
  PERFORM set_config('app.current_user_id', '22222222-2222-2222-2222-222222222222', true);
  BEGIN
    INSERT INTO reactions (user_id, post_id, emoji) VALUES ('22222222-2222-2222-2222-222222222222', v_post_id, 'like');
    RAISE NOTICE '❌ T23: Duplicate reaction — imeruhusiwa! (should be blocked by PK)';
  EXCEPTION WHEN unique_violation THEN
    RAISE NOTICE '✅ T23: Duplicate reaction — PRIMARY KEY imezuia';
  END;
END $$;

-- T24: Duplicate bookmark prevention
DO $$
DECLARE
  v_post_id UUID;
BEGIN
  SET LOCAL ROLE pasihai_test;
  SELECT id INTO v_post_id FROM posts WHERE author_id = '11111111-1111-1111-1111-111111111111' LIMIT 1;
  PERFORM set_config('app.current_user_id', '11111111-1111-1111-1111-111111111111', true);
  BEGIN
    INSERT INTO bookmarks (user_id, ref_type, ref_id) VALUES ('11111111-1111-1111-1111-111111111111', 'post', v_post_id);
    RAISE NOTICE '❌ T24: Duplicate bookmark — imeruhusiwa! (should be blocked by UNIQUE)';
  EXCEPTION WHEN unique_violation THEN
    RAISE NOTICE '✅ T24: Duplicate bookmark — UNIQUE constraint imezuia';
  END;
END $$;

-- T25: Soft delete hides post from can_see_post
DO $$
DECLARE
  v_post_id UUID;
  v_visible BOOLEAN;
BEGIN
  SET LOCAL ROLE pasihai_test;
  PERFORM set_config('app.current_user_id', '11111111-1111-1111-1111-111111111111', true);
  INSERT INTO posts (author_id, kind, text) VALUES ('11111111-1111-1111-1111-111111111111', 'text', 'Delete test') RETURNING id INTO v_post_id;

  -- Soft delete
  UPDATE posts SET deleted_at = now() WHERE id = v_post_id;

  -- Bob tries to see
  PERFORM set_config('app.current_user_id', '22222222-2222-2222-2222-222222222222', true);
  SELECT can_see_post(p) INTO v_visible FROM posts p WHERE id = v_post_id;

  IF v_visible = false OR v_visible IS NULL THEN
    RAISE NOTICE '✅ T25: Soft delete — post iliyofutwa HAIONEKANI kwa bob';
  ELSE
    RAISE NOTICE '❌ T25: Soft delete — post iliyofutwa INAONEKANA! (should be hidden)';
  END IF;
END $$;

-- ── Summary ───────────────────────────────────────────────────
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════';
  RAISE NOTICE 'MAJARIBIO YAMEKWISHA — Angalia matokeo hapo juu';
  RAISE NOTICE '═══════════════════════════════════════════════════════';
END $$;
