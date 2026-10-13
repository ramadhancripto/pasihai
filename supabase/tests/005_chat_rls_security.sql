-- ══════════════════════════════════════════════════════════════
-- PASIHAI — CHAT RLS SECURITY TESTS (005)
-- Inahitaji: Supabase SQL Editor. Haina madhara (ROLLBACK).
-- ══════════════════════════════════════════════════════════════

BEGIN;

CREATE OR REPLACE FUNCTION test.set_auth(uid UUID) RETURNS void AS $$
  SELECT set_config('role', 'authenticated', true),
         set_config('request.jwt.claims', json_build_object('sub', uid)::text, true);
$$ LANGUAGE sql;

CREATE OR REPLACE FUNCTION test.clear_auth() RETURNS void AS $$
  SELECT set_config('role', 'postgres', true),
         set_config('request.jwt.claims', '{}', true);
$$ LANGUAGE sql;

-- TEST 01: Creator can INSERT conversation
DO $$
DECLARE c UUID := gen_random_uuid(); v UUID;
BEGIN PERFORM test.set_auth(c);
  INSERT INTO chat_conversations (type, created_by) VALUES ('direct', c) RETURNING id INTO v;
  IF v IS NOT NULL THEN RAISE NOTICE 'TEST 01: PASS — creator can INSERT conversation';
  ELSE RAISE WARNING 'TEST 01: FAIL'; END IF;
  PERFORM test.clear_auth(); DELETE FROM chat_conversations WHERE id = v;
END; $$;

-- TEST 02: Non-creator CANNOT INSERT conversation
DO $$
DECLARE a UUID := gen_random_uuid(); o UUID := gen_random_uuid(); ok BOOLEAN := false;
BEGIN PERFORM test.set_auth(a);
  BEGIN INSERT INTO chat_conversations (type, created_by) VALUES ('direct', o); ok := true;
  EXCEPTION WHEN OTHERS THEN ok := false; END;
  IF NOT ok THEN RAISE NOTICE 'TEST 02: PASS — non-creator blocked';
  ELSE RAISE WARNING 'TEST 02: FAIL — non-creator succeeded'; END IF;
  PERFORM test.clear_auth();
END; $$;

-- TEST 03: Creator can SELECT own conversation (before participant)
DO $$
DECLARE c UUID := gen_random_uuid(); v UUID; f BOOLEAN;
BEGIN PERFORM test.clear_auth();
  INSERT INTO chat_conversations (type, created_by) VALUES ('direct', c) RETURNING id INTO v;
  PERFORM test.set_auth(c);
  SELECT EXISTS(SELECT 1 FROM chat_conversations WHERE id = v) INTO f;
  IF f THEN RAISE NOTICE 'TEST 03: PASS — creator can SELECT own conversation';
  ELSE RAISE WARNING 'TEST 03: FAIL — creator cannot SELECT'; END IF;
  PERFORM test.clear_auth(); DELETE FROM chat_conversations WHERE id = v;
END; $$;

-- TEST 04: Creator can add self as first participant
DO $$
DECLARE c UUID := gen_random_uuid(); v UUID; ok BOOLEAN := false;
BEGIN PERFORM test.clear_auth();
  INSERT INTO chat_conversations (type, created_by) VALUES ('direct', c) RETURNING id INTO v;
  PERFORM test.set_auth(c);
  BEGIN INSERT INTO chat_participants (conversation_id, user_id) VALUES (v, c); ok := true;
  EXCEPTION WHEN OTHERS THEN ok := false; END;
  IF ok THEN RAISE NOTICE 'TEST 04: PASS — creator can add self';
  ELSE RAISE WARNING 'TEST 04: FAIL — creator blocked from adding self'; END IF;
  PERFORM test.clear_auth(); DELETE FROM chat_conversations WHERE id = v CASCADE;
END; $$;

-- TEST 05: Creator can add second participant
DO $$
DECLARE c UUID := gen_random_uuid(); f UUID := gen_random_uuid(); v UUID; ok BOOLEAN := false;
BEGIN PERFORM test.clear_auth();
  INSERT INTO chat_conversations (type, created_by) VALUES ('direct', c) RETURNING id INTO v;
  INSERT INTO chat_participants (conversation_id, user_id) VALUES (v, c);
  PERFORM test.set_auth(c);
  BEGIN INSERT INTO chat_participants (conversation_id, user_id) VALUES (v, f); ok := true;
  EXCEPTION WHEN OTHERS THEN ok := false; END;
  IF ok THEN RAISE NOTICE 'TEST 05: PASS — creator can add second participant';
  ELSE RAISE WARNING 'TEST 05: FAIL'; END IF;
  PERFORM test.clear_auth(); DELETE FROM chat_conversations WHERE id = v CASCADE;
END; $$;

-- TEST 06: Non-participant CANNOT self-join
DO $$
DECLARE c UUID := gen_random_uuid(); a UUID := gen_random_uuid(); v UUID; ok BOOLEAN := false;
BEGIN PERFORM test.clear_auth();
  INSERT INTO chat_conversations (type, created_by) VALUES ('direct', c) RETURNING id INTO v;
  INSERT INTO chat_participants (conversation_id, user_id) VALUES (v, c);
  PERFORM test.set_auth(a);
  BEGIN INSERT INTO chat_participants (conversation_id, user_id) VALUES (v, a); ok := true;
  EXCEPTION WHEN OTHERS THEN ok := false; END;
  IF NOT ok THEN RAISE NOTICE 'TEST 06: PASS — self-join blocked';
  ELSE RAISE WARNING 'TEST 06: FAIL — self-join succeeded (vulnerability!)'; END IF;
  PERFORM test.clear_auth(); DELETE FROM chat_conversations WHERE id = v CASCADE;
END; $$;

-- TEST 07: Participant can send message
DO $$
DECLARE c UUID := gen_random_uuid(); v UUID; ok BOOLEAN := false;
BEGIN PERFORM test.clear_auth();
  INSERT INTO chat_conversations (type, created_by) VALUES ('direct', c) RETURNING id INTO v;
  INSERT INTO chat_participants (conversation_id, user_id) VALUES (v, c);
  PERFORM test.set_auth(c);
  BEGIN INSERT INTO chat_messages (conversation_id, sender_id, text) VALUES (v, c, 'Hello'); ok := true;
  EXCEPTION WHEN OTHERS THEN ok := false; END;
  IF ok THEN RAISE NOTICE 'TEST 07: PASS — participant can send message';
  ELSE RAISE WARNING 'TEST 07: FAIL'; END IF;
  PERFORM test.clear_auth(); DELETE FROM chat_conversations WHERE id = v CASCADE;
END; $$;

-- TEST 08: Non-participant CANNOT read messages
DO $$
DECLARE c UUID := gen_random_uuid(); a UUID := gen_random_uuid(); v UUID; n INTEGER;
BEGIN PERFORM test.clear_auth();
  INSERT INTO chat_conversations (type, created_by) VALUES ('direct', c) RETURNING id INTO v;
  INSERT INTO chat_participants (conversation_id, user_id) VALUES (v, c);
  INSERT INTO chat_messages (conversation_id, sender_id, text) VALUES (v, c, 'Secret');
  PERFORM test.set_auth(a);
  SELECT count(*) INTO n FROM chat_messages WHERE conversation_id = v;
  IF n = 0 THEN RAISE NOTICE 'TEST 08: PASS — non-participant cannot read messages';
  ELSE RAISE WARNING 'TEST 08: FAIL — read % messages', n; END IF;
  PERFORM test.clear_auth(); DELETE FROM chat_conversations WHERE id = v CASCADE;
END; $$;

-- TEST 09: Non-participant CANNOT send message
DO $$
DECLARE c UUID := gen_random_uuid(); a UUID := gen_random_uuid(); v UUID; ok BOOLEAN := false;
BEGIN PERFORM test.clear_auth();
  INSERT INTO chat_conversations (type, created_by) VALUES ('direct', c) RETURNING id INTO v;
  INSERT INTO chat_participants (conversation_id, user_id) VALUES (v, c);
  PERFORM test.set_auth(a);
  BEGIN INSERT INTO chat_messages (conversation_id, sender_id, text) VALUES (v, a, 'Hack'); ok := true;
  EXCEPTION WHEN OTHERS THEN ok := false; END;
  IF NOT ok THEN RAISE NOTICE 'TEST 09: PASS — non-participant blocked from sending';
  ELSE RAISE WARNING 'TEST 09: FAIL — non-participant sent message'; END IF;
  PERFORM test.clear_auth(); DELETE FROM chat_conversations WHERE id = v CASCADE;
END; $$;

-- TEST 10: Non-participant CANNOT add participant to other's conversation
DO $$
DECLARE c UUID := gen_random_uuid(); a UUID := gen_random_uuid(); f UUID := gen_random_uuid(); v UUID; ok BOOLEAN := false;
BEGIN PERFORM test.clear_auth();
  INSERT INTO chat_conversations (type, created_by) VALUES ('direct', c) RETURNING id INTO v;
  INSERT INTO chat_participants (conversation_id, user_id) VALUES (v, c);
  PERFORM test.set_auth(a);
  BEGIN INSERT INTO chat_participants (conversation_id, user_id) VALUES (v, f); ok := true;
  EXCEPTION WHEN OTHERS THEN ok := false; END;
  IF NOT ok THEN RAISE NOTICE 'TEST 10: PASS — non-participant blocked from adding others';
  ELSE RAISE WARNING 'TEST 10: FAIL'; END IF;
  PERFORM test.clear_auth(); DELETE FROM chat_conversations WHERE id = v CASCADE;
END; $$;

-- TEST 11: Participant can read conversation
DO $$
DECLARE c UUID := gen_random_uuid(); f UUID := gen_random_uuid(); v UUID; found BOOLEAN;
BEGIN PERFORM test.clear_auth();
  INSERT INTO chat_conversations (type, created_by) VALUES ('direct', c) RETURNING id INTO v;
  INSERT INTO chat_participants (conversation_id, user_id) VALUES (v, c);
  INSERT INTO chat_participants (conversation_id, user_id) VALUES (v, f);
  PERFORM test.set_auth(f);
  SELECT EXISTS(SELECT 1 FROM chat_conversations WHERE id = v) INTO found;
  IF found THEN RAISE NOTICE 'TEST 11: PASS — participant can read conversation';
  ELSE RAISE WARNING 'TEST 11: FAIL'; END IF;
  PERFORM test.clear_auth(); DELETE FROM chat_conversations WHERE id = v CASCADE;
END; $$;

-- TEST 12: Non-participant CANNOT read conversation
DO $$
DECLARE c UUID := gen_random_uuid(); a UUID := gen_random_uuid(); v UUID; found BOOLEAN;
BEGIN PERFORM test.clear_auth();
  INSERT INTO chat_conversations (type, created_by) VALUES ('direct', c) RETURNING id INTO v;
  INSERT INTO chat_participants (conversation_id, user_id) VALUES (v, c);
  PERFORM test.set_auth(a);
  SELECT EXISTS(SELECT 1 FROM chat_conversations WHERE id = v) INTO found;
  IF NOT found THEN RAISE NOTICE 'TEST 12: PASS — non-participant cannot read conversation';
  ELSE RAISE WARNING 'TEST 12: FAIL'; END IF;
  PERFORM test.clear_auth(); DELETE FROM chat_conversations WHERE id = v CASCADE;
END; $$;

-- TEST 13: Participant can read messages
DO $$
DECLARE c UUID := gen_random_uuid(); f UUID := gen_random_uuid(); v UUID; n INTEGER;
BEGIN PERFORM test.clear_auth();
  INSERT INTO chat_conversations (type, created_by) VALUES ('direct', c) RETURNING id INTO v;
  INSERT INTO chat_participants (conversation_id, user_id) VALUES (v, c);
  INSERT INTO chat_participants (conversation_id, user_id) VALUES (v, f);
  INSERT INTO chat_messages (conversation_id, sender_id, text) VALUES (v, c, 'Hi');
  PERFORM test.set_auth(f);
  SELECT count(*) INTO n FROM chat_messages WHERE conversation_id = v;
  IF n = 1 THEN RAISE NOTICE 'TEST 13: PASS — participant can read messages';
  ELSE RAISE WARNING 'TEST 13: FAIL — read % expected 1', n; END IF;
  PERFORM test.clear_auth(); DELETE FROM chat_conversations WHERE id = v CASCADE;
END; $$;

-- TEST 14: Sender can soft-delete own message
DO $$
DECLARE c UUID := gen_random_uuid(); v UUID; m UUID; ok BOOLEAN := false;
BEGIN PERFORM test.clear_auth();
  INSERT INTO chat_conversations (type, created_by) VALUES ('direct', c) RETURNING id INTO v;
  INSERT INTO chat_participants (conversation_id, user_id) VALUES (v, c);
  INSERT INTO chat_messages (conversation_id, sender_id, text) VALUES (v, c, 'Delete me') RETURNING id INTO m;
  PERFORM test.set_auth(c);
  BEGIN UPDATE chat_messages SET deleted_at = now() WHERE id = m; ok := true;
  EXCEPTION WHEN OTHERS THEN ok := false; END;
  IF ok THEN RAISE NOTICE 'TEST 14: PASS — sender can soft-delete';
  ELSE RAISE WARNING 'TEST 14: FAIL'; END IF;
  PERFORM test.clear_auth(); DELETE FROM chat_conversations WHERE id = v CASCADE;
END; $$;

-- TEST 15: Non-sender CANNOT delete other's message
DO $$
DECLARE s UUID := gen_random_uuid(); o UUID := gen_random_uuid(); v UUID; m UUID; ok BOOLEAN := false;
BEGIN PERFORM test.clear_auth();
  INSERT INTO chat_conversations (type, created_by) VALUES ('direct', s) RETURNING id INTO v;
  INSERT INTO chat_participants (conversation_id, user_id) VALUES (v, s);
  INSERT INTO chat_participants (conversation_id, user_id) VALUES (v, o);
  INSERT INTO chat_messages (conversation_id, sender_id, text) VALUES (v, s, 'My msg') RETURNING id INTO m;
  PERFORM test.set_auth(o);
  BEGIN UPDATE chat_messages SET deleted_at = now() WHERE id = m;
    IF FOUND THEN ok := true; END IF;
  EXCEPTION WHEN OTHERS THEN ok := false; END;
  IF NOT ok THEN RAISE NOTICE 'TEST 15: PASS — non-sender blocked from deleting';
  ELSE RAISE WARNING 'TEST 15: FAIL'; END IF;
  PERFORM test.clear_auth(); DELETE FROM chat_conversations WHERE id = v CASCADE;
END; $$;

-- TEST 16: is_chat_member is SECURITY DEFINER
DO $$
DECLARE d BOOLEAN;
BEGIN
  SELECT prosecdef INTO d FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public' AND p.proname = 'is_chat_member' AND p.pronargs = 2;
  IF d THEN RAISE NOTICE 'TEST 16: PASS — is_chat_member is SECURITY DEFINER';
  ELSE RAISE WARNING 'TEST 16: FAIL'; END IF;
END; $$;

-- TEST 17: is_chat_member has hardened search_path
DO $$
DECLARE sp TEXT[];
BEGIN
  SELECT proconfig INTO sp FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public' AND p.proname = 'is_chat_member' AND p.pronargs = 2;
  IF sp IS NOT NULL AND array_to_string(sp, ',') LIKE '%search_path%' THEN
    RAISE NOTICE 'TEST 17: PASS — search_path = %', sp;
  ELSE RAISE WARNING 'TEST 17: FAIL — search_path not hardened: %', sp; END IF;
END; $$;

-- TEST 18: Anonymous cannot execute is_chat_member
DO $$
DECLARE x BOOLEAN;
BEGIN
  SELECT EXISTS(SELECT 1 FROM information_schema.routine_privileges
    WHERE routine_name = 'is_chat_member' AND routine_schema = 'public' AND grantee = 'anon') INTO x;
  IF NOT x THEN RAISE NOTICE 'TEST 18: PASS — anon cannot execute';
  ELSE RAISE WARNING 'TEST 18: FAIL — anon CAN execute'; END IF;
END; $$;

SELECT test.clear_auth();
DROP FUNCTION IF EXISTS test.set_auth(UUID);
DROP FUNCTION IF EXISTS test.clear_auth();
SELECT '=== ALL 18 TESTS COMPLETE — CHECK NOTICES ABOVE ===' as result;
ROLLBACK;