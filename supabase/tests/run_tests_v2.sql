-- PASIHAI — RLS Test Runner v2 (with FORCE RLS)
-- Endesha: psql -h localhost -U pasihai_test -d pasihai_test -f run_tests_v2.sql

-- ── Clean slate ───────────────────────────────────────────────
DELETE FROM reactions;
DELETE FROM hidden_items;
DELETE FROM bookmarks;
DELETE FROM blocks;
DELETE FROM friendships;
DELETE FROM follows;
DELETE FROM posts;
DELETE FROM profiles;
DELETE FROM auth.users WHERE email LIKE '%@test.com';

-- ── Setup: test users ─────────────────────────────────────────
INSERT INTO auth.users (id, email, raw_user_meta_data) VALUES
  ('11111111-1111-1111-1111-111111111111', 'alice@test.com', '{"username": "alice", "display_name": "Alice Test"}'),
  ('22222222-2222-2222-2222-222222222222', 'bob@test.com', '{"username": "bob", "display_name": "Bob Test"}'),
  ('33333333-3333-3333-3333-333333333333', 'carol@test.com', '{"username": "carol", "display_name": "Carol Test"}');

DO $$
DECLARE passed INT := 0; failed INT := 0; total INT := 0;
  v_count INT; v_bool BOOLEAN; v_id UUID; v_text TEXT; v_post UUID;
BEGIN
  -- T01: Auth trigger
  total := total + 1;
  SELECT count(*) INTO v_count FROM profiles WHERE user_id IN ('11111111-1111-1111-1111-111111111111','22222222-2222-2222-2222-222222222222','33333333-3333-3333-3333-333333333333');
  IF v_count = 3 THEN RAISE NOTICE '✅ T01: Auth trigger — profiles 3'; passed := passed + 1;
  ELSE RAISE NOTICE '❌ T01: Auth trigger — got %', v_count; failed := failed + 1; END IF;

  -- T02: Username
  total := total + 1;
  SELECT username INTO v_text FROM profiles WHERE user_id = '11111111-1111-1111-1111-111111111111';
  IF v_text = 'alice' THEN RAISE NOTICE '✅ T02: Username = alice'; passed := passed + 1;
  ELSE RAISE NOTICE '❌ T02: Username = %', v_text; failed := failed + 1; END IF;

  -- T03: Update own bio
  total := total + 1;
  SET LOCAL ROLE pasihai_test;
  PERFORM set_config('app.current_user_id', '11111111-1111-1111-1111-111111111111', true);
  UPDATE profiles SET bio = 'Hello' WHERE user_id = '11111111-1111-1111-1111-111111111111';
  IF FOUND THEN RAISE NOTICE '✅ T03: Update own bio'; passed := passed + 1;
  ELSE RAISE NOTICE '❌ T03: Update own bio failed'; failed := failed + 1; END IF;

  -- T04: Cannot change verified
  total := total + 1;
  BEGIN
    UPDATE profiles SET verified = true WHERE user_id = '11111111-1111-1111-1111-111111111111';
    SELECT verified INTO v_bool FROM profiles WHERE user_id = '11111111-1111-1111-1111-111111111111';
    IF v_bool = false THEN RAISE NOTICE '✅ T04: Verified locked (WITH CHECK silently rejected)'; passed := passed + 1;
    ELSE RAISE NOTICE '❌ T04: Verified CHANGED to true!'; failed := failed + 1;
      UPDATE profiles SET verified = false WHERE user_id = '11111111-1111-1111-1111-111111111111';
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '✅ T04: Verified locked (RLS error: %)', SQLERRM; passed := passed + 1;
  END;

  -- T05: Cannot change entity_type
  total := total + 1;
  BEGIN
    UPDATE profiles SET entity_type = 'channel' WHERE user_id = '11111111-1111-1111-1111-111111111111';
    SELECT entity_type INTO v_text FROM profiles WHERE user_id = '11111111-1111-1111-1111-111111111111';
    IF v_text = 'person' THEN RAISE NOTICE '✅ T05: Entity type locked'; passed := passed + 1;
    ELSE RAISE NOTICE '❌ T05: Entity type CHANGED to %!', v_text; failed := failed + 1;
      UPDATE profiles SET entity_type = 'person' WHERE user_id = '11111111-1111-1111-1111-111111111111';
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '✅ T05: Entity type locked (RLS error)'; passed := passed + 1;
  END;

  -- T06: Cannot change followers_count
  total := total + 1;
  BEGIN
    UPDATE profiles SET followers_count = 999 WHERE user_id = '11111111-1111-1111-1111-111111111111';
    SELECT followers_count INTO v_count FROM profiles WHERE user_id = '11111111-1111-1111-1111-111111111111';
    IF v_count = 0 THEN RAISE NOTICE '✅ T06: Followers count locked'; passed := passed + 1;
    ELSE RAISE NOTICE '❌ T06: Followers count CHANGED to %!', v_count; failed := failed + 1;
      UPDATE profiles SET followers_count = 0 WHERE user_id = '11111111-1111-1111-1111-111111111111';
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '✅ T06: Followers count locked (RLS error)'; passed := passed + 1;
  END;

  -- T07: Create post
  total := total + 1;
  INSERT INTO posts (author_id, kind, text, visibility) VALUES ('11111111-1111-1111-1111-111111111111', 'text', 'Public post', 'public') RETURNING id INTO v_post;
  IF v_post IS NOT NULL THEN RAISE NOTICE '✅ T07: Post created'; passed := passed + 1;
  ELSE RAISE NOTICE '❌ T07: Post creation failed'; failed := failed + 1; END IF;

  -- T08: Private post hidden
  total := total + 1;
  INSERT INTO posts (author_id, kind, text, visibility) VALUES ('11111111-1111-1111-1111-111111111111', 'text', 'Private', 'private') RETURNING id INTO v_id;
  PERFORM set_config('app.current_user_id', '22222222-2222-2222-2222-222222222222', true);
  SELECT can_see_post(p) INTO v_bool FROM posts p WHERE id = v_id;
  IF v_bool IS NOT TRUE THEN RAISE NOTICE '✅ T08: Private post hidden from bob'; passed := passed + 1;
  ELSE RAISE NOTICE '❌ T08: Private post VISIBLE to bob!'; failed := failed + 1; END IF;

  -- T09: Public post visible
  total := total + 1;
  PERFORM set_config('app.current_user_id', '22222222-2222-2222-2222-222222222222', true);
  SELECT can_see_post(p) INTO v_bool FROM posts p WHERE id = v_post;
  IF v_bool = true THEN RAISE NOTICE '✅ T09: Public post visible to bob'; passed := passed + 1;
  ELSE RAISE NOTICE '❌ T09: Public post NOT visible to bob'; failed := failed + 1; END IF;

  -- T10: Followers post hidden without follow
  total := total + 1;
  PERFORM set_config('app.current_user_id', '11111111-1111-1111-1111-111111111111', true);
  INSERT INTO posts (author_id, kind, text, visibility) VALUES ('11111111-1111-1111-1111-111111111111', 'text', 'Followers', 'followers') RETURNING id INTO v_id;
  PERFORM set_config('app.current_user_id', '33333333-3333-3333-3333-333333333333', true);
  SELECT can_see_post(p) INTO v_bool FROM posts p WHERE id = v_id;
  IF v_bool IS NOT TRUE THEN RAISE NOTICE '✅ T10: Followers post hidden from carol'; passed := passed + 1;
  ELSE RAISE NOTICE '❌ T10: Followers post VISIBLE to carol!'; failed := failed + 1; END IF;

  -- T11: Followers post visible after follow
  total := total + 1;
  PERFORM set_config('app.current_user_id', '22222222-2222-2222-2222-222222222222', true);
  INSERT INTO follows (follower_id, followee_id) VALUES ('22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111') ON CONFLICT DO NOTHING;
  SELECT can_see_post(p) INTO v_bool FROM posts p WHERE id = v_id;
  IF v_bool = true THEN RAISE NOTICE '✅ T11: Followers post visible to bob (following)'; passed := passed + 1;
  ELSE RAISE NOTICE '❌ T11: Followers post NOT visible to bob (following)'; failed := failed + 1; END IF;

  -- T12: Reaction + count
  total := total + 1;
  INSERT INTO reactions (user_id, post_id, emoji) VALUES ('22222222-2222-2222-2222-222222222222', v_post, 'heart');
  SELECT reactions_count INTO v_count FROM posts WHERE id = v_post;
  IF v_count = 1 THEN RAISE NOTICE '✅ T12: Reaction count = 1'; passed := passed + 1;
  ELSE RAISE NOTICE '❌ T12: Reaction count = % (expected 1)', v_count; failed := failed + 1; END IF;

  -- T13: Block prevents visibility
  total := total + 1;
  PERFORM set_config('app.current_user_id', '11111111-1111-1111-1111-111111111111', true);
  INSERT INTO blocks (blocker_id, blocked_id) VALUES ('11111111-1111-1111-1111-111111111111', '33333333-3333-3333-3333-333333333333') ON CONFLICT DO NOTHING;
  PERFORM set_config('app.current_user_id', '33333333-3333-3333-3333-333333333333', true);
  SELECT can_see_post(p) INTO v_bool FROM posts p WHERE id = v_post;
  IF v_bool IS NOT TRUE THEN RAISE NOTICE '✅ T13: Block — carol cannot see alice post'; passed := passed + 1;
  ELSE RAISE NOTICE '❌ T13: Block — carol CAN see alice post!'; failed := failed + 1; END IF;

  -- T14: Self-approval prevention
  total := total + 1;
  PERFORM set_config('app.current_user_id', '11111111-1111-1111-1111-111111111111', true);
  INSERT INTO friendships (requester_id, addressee_id, status) VALUES ('11111111-1111-1111-1111-111111111111', '33333333-3333-3333-3333-333333333333', 'pending') RETURNING id INTO v_id;
  BEGIN
    UPDATE friendships SET status = 'accepted' WHERE id = v_id;
    SELECT status INTO v_text FROM friendships WHERE id = v_id;
    IF v_text = 'pending' THEN RAISE NOTICE '✅ T14: Self-approval blocked (WITH CHECK)'; passed := passed + 1;
    ELSE RAISE NOTICE '❌ T14: Self-approval SUCCEEDED! status = %', v_text; failed := failed + 1;
      UPDATE friendships SET status = 'pending' WHERE id = v_id;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '✅ T14: Self-approval blocked (RLS error)'; passed := passed + 1;
  END;

  -- T15: Friendship acceptance
  total := total + 1;
  PERFORM set_config('app.current_user_id', '33333333-3333-3333-3333-333333333333', true);
  UPDATE friendships SET status = 'accepted' WHERE id = v_id;
  SELECT status INTO v_text FROM friendships WHERE id = v_id;
  IF v_text = 'accepted' THEN RAISE NOTICE '✅ T15: Friendship accepted by carol'; passed := passed + 1;
  ELSE RAISE NOTICE '❌ T15: Friendship status = % (expected accepted)', v_text; failed := failed + 1; END IF;

  -- T16: Friends count
  total := total + 1;
  SELECT friends_count INTO v_count FROM profiles WHERE user_id = '11111111-1111-1111-1111-111111111111';
  IF v_count = 1 THEN RAISE NOTICE '✅ T16: Friends count = 1'; passed := passed + 1;
  ELSE RAISE NOTICE '❌ T16: Friends count = % (expected 1)', v_count; failed := failed + 1; END IF;

  -- T17: Bookmark
  total := total + 1;
  PERFORM set_config('app.current_user_id', '11111111-1111-1111-1111-111111111111', true);
  INSERT INTO bookmarks (user_id, ref_type, ref_id) VALUES ('11111111-1111-1111-1111-111111111111', 'post', v_post);
  IF FOUND THEN RAISE NOTICE '✅ T17: Bookmark created'; passed := passed + 1;
  ELSE RAISE NOTICE '❌ T17: Bookmark failed'; failed := failed + 1; END IF;

  -- T18: Hidden item
  total := total + 1;
  PERFORM set_config('app.current_user_id', '22222222-2222-2222-2222-222222222222', true);
  INSERT INTO hidden_items (user_id, post_id) VALUES ('22222222-2222-2222-2222-222222222222', v_post);
  IF FOUND THEN RAISE NOTICE '✅ T18: Hidden item created'; passed := passed + 1;
  ELSE RAISE NOTICE '❌ T18: Hidden item failed'; failed := failed + 1; END IF;

  -- T19: Post count tampering
  total := total + 1;
  PERFORM set_config('app.current_user_id', '11111111-1111-1111-1111-111111111111', true);
  BEGIN
    UPDATE posts SET reactions_count = 999 WHERE id = v_post;
    SELECT reactions_count INTO v_count FROM posts WHERE id = v_post;
    IF v_count = 999 THEN RAISE NOTICE '❌ T19: Count tampered to 999!'; failed := failed + 1;
      UPDATE posts SET reactions_count = 1 WHERE id = v_post;
    ELSE RAISE NOTICE '✅ T19: Count tampering blocked (WITH CHECK)'; passed := passed + 1;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '✅ T19: Count tampering blocked (RLS error)'; passed := passed + 1;
  END;

  -- T20: Self-follow
  total := total + 1;
  BEGIN
    INSERT INTO follows (follower_id, followee_id) VALUES ('11111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111');
    RAISE NOTICE '❌ T20: Self-follow allowed!'; failed := failed + 1;
    DELETE FROM follows WHERE follower_id = followee_id;
  EXCEPTION WHEN check_violation THEN
    RAISE NOTICE '✅ T20: Self-follow blocked by CHECK'; passed := passed + 1;
  END;

  -- T21: Duplicate reaction
  total := total + 1;
  PERFORM set_config('app.current_user_id', '22222222-2222-2222-2222-222222222222', true);
  BEGIN
    INSERT INTO reactions (user_id, post_id, emoji) VALUES ('22222222-2222-2222-2222-222222222222', v_post, 'like');
    RAISE NOTICE '❌ T21: Duplicate reaction allowed!'; failed := failed + 1;
  EXCEPTION WHEN unique_violation THEN
    RAISE NOTICE '✅ T21: Duplicate reaction blocked by PK'; passed := passed + 1;
  END;

  -- T22: Duplicate bookmark
  total := total + 1;
  PERFORM set_config('app.current_user_id', '11111111-1111-1111-1111-111111111111', true);
  BEGIN
    INSERT INTO bookmarks (user_id, ref_type, ref_id) VALUES ('11111111-1111-1111-1111-111111111111', 'post', v_post);
    RAISE NOTICE '❌ T22: Duplicate bookmark allowed!'; failed := failed + 1;
  EXCEPTION WHEN unique_violation THEN
    RAISE NOTICE '✅ T22: Duplicate bookmark blocked by UNIQUE'; passed := passed + 1;
  END;

  -- T23: Soft delete (as alice who owns the post)
  total := total + 1;
  PERFORM set_config('app.current_user_id', '11111111-1111-1111-1111-111111111111', true);
  UPDATE posts SET deleted_at = now() WHERE id = v_post;
  -- Now check as bob: soft-deleted post should not be visible
  PERFORM set_config('app.current_user_id', '22222222-2222-2222-2222-222222222222', true);
  SELECT EXISTS(SELECT 1 FROM posts WHERE id = v_post) INTO v_bool;
  IF v_bool IS NOT TRUE THEN RAISE NOTICE '✅ T23: Soft-deleted post hidden from others'; passed := passed + 1;
  ELSE RAISE NOTICE '❌ T23: Soft-deleted post VISIBLE!'; failed := failed + 1; END IF;

  -- T24: Follow count trigger
  total := total + 1;
  SELECT followers_count INTO v_count FROM profiles WHERE user_id = '11111111-1111-1111-1111-111111111111';
  IF v_count >= 1 THEN RAISE NOTICE '✅ T24: Follow count trigger works (followers=%)', v_count; passed := passed + 1;
  ELSE RAISE NOTICE '❌ T24: Follow count = % (expected >= 1)', v_count; failed := failed + 1; END IF;

  -- T25: Self-block
  total := total + 1;
  PERFORM set_config('app.current_user_id', '11111111-1111-1111-1111-111111111111', true);
  BEGIN
    INSERT INTO blocks (blocker_id, blocked_id) VALUES ('11111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111');
    RAISE NOTICE '❌ T25: Self-block allowed!'; failed := failed + 1;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '✅ T25: Self-block blocked (%)', SQLERRM; passed := passed + 1;
  END;

  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════';
  RAISE NOTICE 'RESULTS: % passed, % failed, % total', passed, failed, total;
  RAISE NOTICE '═══════════════════════════════════════════════════════';
END $$;
