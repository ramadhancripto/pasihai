-- ══════════════════════════════════════════════════════════════
-- PASIHAI — RLS Tests: Security Audit (Hatua ya Mwisho)
--
-- Tests hizi zinafunika makosa yaliyogunduliwa katika ukaguzi wa mwisho:
--   1. Privileged field protection (verified, entity_type, counts)
--   2. Self-approval prevention (friendships)
--   3. Count tampering prevention (posts)
--   4. Username sanitization (profiles trigger)
--
-- STATUS: IMEANDALIWA — haijaendeshwa (hakuna Supabase DB ya test)
-- ══════════════════════════════════════════════════════════════

-- ══════════════════════════════════════════════════════════════
-- 1. PRIVILEGED FIELD PROTECTION (profiles)
-- ══════════════════════════════════════════════════════════════

-- S1: Mtumiaji HAWEZI kubadilisha verified kwenye profile yake
-- Setup: user_a ana profile na verified = false
-- Test: UPDATE profiles SET verified = true WHERE user_id = auth.uid()
-- Expected: RLS violation (WITH CHECK inashindwa)

-- S2: Mtumiaji HAWEZI kubadilisha entity_type kwenye profile yake
-- Setup: user_a ana entity_type = 'person'
-- Test: UPDATE profiles SET entity_type = 'channel' WHERE user_id = auth.uid()
-- Expected: RLS violation

-- S3: Mtumiaji HAWEZI kubadilisha friends_count kwenye profile yake
-- Setup: user_a ana friends_count = 5
-- Test: UPDATE profiles SET friends_count = 999 WHERE user_id = auth.uid()
-- Expected: RLS violation

-- S4: Mtumiaji HAWEZI kubadilisha followers_count kwenye profile yake
-- Expected: RLS violation

-- S5: Mtumiaji HAWEZI kubadilisha following_count kwenye profile yake
-- Expected: RLS violation

-- S6: Mtumiaji HAWEZI kubadilisha posts_count kwenye profile yake
-- Expected: RLS violation

-- S7: Mtumiaji ANAWEZA kubadilisha bio kwenye profile yake
-- Test: UPDATE profiles SET bio = 'Updated' WHERE user_id = auth.uid()
-- Expected: Sawa (RLS inaruhusu)

-- S8: Mtumiaji ANAWEZA kubadilisha display_name kwenye profile yake
-- Test: UPDATE profiles SET display_name = 'New Name' WHERE user_id = auth.uid()
-- Expected: Sawa

-- S9: Mtumiaji ANAWEZA kubadilisha avatar_tone kwenye profile yake
-- Test: UPDATE profiles SET avatar_tone = 'blue' WHERE user_id = auth.uid()
-- Expected: Sawa

-- S10: Mtumiaji ANAWEZA kubadilisha prefs kwenye profile yake
-- Test: UPDATE profiles SET prefs = '{"interests": ["tech"]}' WHERE user_id = auth.uid()
-- Expected: Sawa

-- ══════════════════════════════════════════════════════════════
-- 2. SELF-APPROVAL PREVENTION (friendships)
-- ══════════════════════════════════════════════════════════════

-- S11: Mwombaji HAWEZI kujikubalia ombi lake mwenyewe
-- Setup: user_a ametuma ombi kwa user_b (status = 'pending')
-- Test (as user_a): UPDATE friendships SET status = 'accepted' WHERE requester_id = user_a
-- Expected: RLS violation (WITH CHECK: mwombaji anaweza tu 'declined')

-- S12: Mwombaji ANAWEZA kufuta ombi lake (status = 'declined')
-- Setup: user_a ametuma ombi kwa user_b (status = 'pending')
-- Test (as user_a): UPDATE friendships SET status = 'declined' WHERE requester_id = user_a
-- Expected: Sawa

-- S13: Mpokeaji ANAWEZA kukubali ombi (status = 'accepted')
-- Setup: user_a ametuma ombi kwa user_b (status = 'pending')
-- Test (as user_b): UPDATE friendships SET status = 'accepted' WHERE addressee_id = user_b
-- Expected: Sawa

-- S14: Mpokeaji ANAWEZA kukataa ombi (status = 'declined')
-- Test (as user_b): UPDATE friendships SET status = 'declined' WHERE addressee_id = user_b
-- Expected: Sawa

-- S15: Mpokeaji HAWEZI kubadilisha requester_id
-- Test (as user_b): UPDATE friendships SET requester_id = other_user WHERE addressee_id = user_b
-- Expected: RLS violation (WITH CHECK)

-- S16: Mpokeaji HAWEZI kubadilisha addressee_id
-- Test (as user_b): UPDATE friendships SET addressee_id = other_user WHERE addressee_id = user_b
-- Expected: RLS violation (WITH CHECK)

-- ══════════════════════════════════════════════════════════════
-- 3. COUNT TAMPERING PREVENTION (posts)
-- ══════════════════════════════════════════════════════════════

-- S17: Mwandishi HAWEZI kubadilisha reactions_count kwenye post yake
-- Setup: user_a ana post na reactions_count = 5
-- Test: UPDATE posts SET reactions_count = 999 WHERE author_id = auth.uid()
-- Expected: RLS violation (WITH CHECK)

-- S18: Mwandishi HAWEZI kubadilisha comments_count kwenye post yake
-- Expected: RLS violation

-- S19: Mwandishi HAWEZI kubadilisha shares_count kwenye post yake
-- Expected: RLS violation

-- S20: Mwandishi ANAWEZA kubadilisha text kwenye post yake
-- Test: UPDATE posts SET text = 'Updated' WHERE author_id = auth.uid()
-- Expected: Sawa

-- S21: Mwandishi ANAWEZA kufuta post yake (soft delete)
-- Test: UPDATE posts SET deleted_at = now() WHERE author_id = auth.uid()
-- Expected: Sawa

-- S22: Mwandishi ANAWEZA kubadilisha visibility kwenye post yake
-- Test: UPDATE posts SET visibility = 'private' WHERE author_id = auth.uid()
-- Expected: Sawa

-- S23: Mwandishi HAWEZI kubadilisha author_id kwenye post yake
-- Test: UPDATE posts SET author_id = other_user WHERE author_id = auth.uid()
-- Expected: RLS violation (WITH CHECK: author_id = auth.uid())

-- ══════════════════════════════════════════════════════════════
-- 4. USERNAME SANITIZATION (profiles trigger)
-- ══════════════════════════════════════════════════════════════

-- S24: Username na herufi kubwa inasanitizwa kuwa ndogo
-- Setup: auth signup na metadata {"username": "UPPERCASE"}
-- Test: SELECT username FROM profiles WHERE user_id = new_user
-- Expected: 'uppercase' (lowercase)

-- S25: Username fupi sana inarekebishwa
-- Setup: auth signup na metadata {"username": "AB"}
-- Test: SELECT username FROM profiles WHERE user_id = new_user
-- Expected: urefu >= 3 (imeongezwa na user_id suffix)

-- S26: Username na characters zisizoruhusiwa zinaondolewa
-- Setup: auth signup na metadata {"username": "user@name!"}
-- Test: SELECT username FROM profiles WHERE user_id = new_user
-- Expected: 'username' (special chars zimeondolewa)

-- S27: Username ndefu sana inakatwa
-- Setup: auth signup na metadata {"username": "very_long_username_that_exceeds_thirty_characters_limit"}
-- Test: SELECT username FROM profiles WHERE user_id = new_user
-- Expected: urefu <= 30

-- ══════════════════════════════════════════════════════════════
-- 5. BLOCKS + VISIBILITY INTEGRATION
-- ══════════════════════════════════════════════════════════════

-- S28: Blocked user HAONI public posts za blocker
-- Setup: user_a amezuia user_b; user_a ana public post
-- Test (as user_b): SELECT * FROM posts WHERE author_id = user_a
-- Expected: 0 rows (is_blocked_by inarudisha TRUE)

-- S29: Blocked user HAONI followers posts za blocker
-- Setup: user_a amezuia user_b; user_a ana followers post; user_b anamfuata user_a
-- Test (as user_b): SELECT * FROM posts WHERE author_id = user_a
-- Expected: 0 rows (is_blocked_by inazuia hata kwa followers)

-- S30: Non-blocked user anaona public posts kama kawaida
-- Setup: user_c hajazuiliwa na user_a; user_a ana public post
-- Test (as user_c): SELECT * FROM posts WHERE author_id = user_a
-- Expected: 1 row

-- ══════════════════════════════════════════════════════════════
-- 6. ANONYMOUS ACCESS PREVENTION
-- ══════════════════════════════════════════════════════════════

-- S31: Anonymous user HAWEZI kusoma profiles
-- Test (no JWT): SELECT * FROM profiles
-- Expected: RLS violation (authenticated role pekee)

-- S32: Anonymous user HAWEZI kusoma posts
-- Test (no JWT): SELECT * FROM posts
-- Expected: RLS violation

-- S33: Anonymous user HAWEZI kuunda posts
-- Test (no JWT): INSERT INTO posts ...
-- Expected: RLS violation

-- S34: Anonymous user HAWEZI kusoma follows
-- Test (no JWT): SELECT * FROM follows
-- Expected: RLS violation

-- ══════════════════════════════════════════════════════════════
-- SUMMARY
-- ══════════════════════════════════════════════════════════════
-- Jumla ya test cases mpya: 34
-- Zilizotayarishwa: 34
-- Zilizotekelezwa: 0 (inahitaji Supabase DB ya test)
--
-- Jumla ya test cases zote (001 + 002 + 003 + 004):
--   10 + 25 + 55 + 34 = 124 test cases
