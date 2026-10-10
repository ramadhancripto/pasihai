-- ══════════════════════════════════════════════════════════════
-- PASIHAI — RLS Tests: posts (visibility + ownership)
--
-- STATUS: IMEANDALIWA — haijaendeshwa (hakuna Supabase DB ya test)
-- ══════════════════════════════════════════════════════════════

-- ══════════════════════════════════════════════════════════════
-- MAJARIBIO YA VISIBILITY
-- ══════════════════════════════════════════════════════════════

-- T1: Public post — wote wanaona
-- Setup: user_a anaunda post ya public
-- Test: user_b anasoma post → Sawa
-- Test: user_c (asiye rafiki, asiye kufuata) anasoma → Sawa

-- T2: Private post — mwandishi pekee
-- Setup: user_a anaunda post ya private
-- Test: user_a anasoma → Sawa
-- Test: user_b anajaribu kusoma → Imeshindwa (RLS)

-- T3: Followers post — rafiki anaona
-- Setup: user_a na user_b ni marafiki (friendships status='accepted')
-- Setup: user_a anaunda post ya followers
-- Test: user_b anasoma → Sawa
-- Test: user_c (asiye rafiki) anajaribu kusoma → Imeshindwa

-- T4: Followers post — aliyefuata anaona
-- Setup: user_b anafuata user_a (follows table)
-- Setup: user_a anaunda post ya followers
-- Test: user_b anasoma → Sawa
-- Test: user_c (asiye kufuata) anajaribu kusoma → Imeshindwa

-- T5: Followers post — asiye na uhusiano HAONI
-- Setup: user_c hana uhusiano wowote na user_a
-- Test: user_c anajaribu kusoma post ya followers → Imeshindwa

-- ══════════════════════════════════════════════════════════════
-- MAJARIBIO YA OWNERSHIP
-- ══════════════════════════════════════════════════════════════

-- T6: Mmiliki anaweza kuunda post
-- Test: user_a anaunda post (author_id = auth.uid()) → Sawa

-- T7: Mmiliki anaweza kubadilisha post yake
-- Test: user_a anabadilisha text ya post yake → Sawa

-- T8: Mmiliki anaweza kufuta post yake (soft delete)
-- Test: user_a anaweka deleted_at → Sawa

-- T9: Mmiliki HAWEZI kubadilisha author_id
-- Test: user_a anajaribu kubadilisha author_id → Imeshindwa (WITH CHECK)

-- T10: Mtumiaji mwingine HAWEZI kubadilisha post ya mmiliki
-- Test: user_b anajaribu UPDATE post ya user_a → Imeshindwa (RLS)

-- T11: Mtumiaji mwingine HAWEZI kuunda post kwa niaba ya mmiliki
-- Test: user_b anajaribu INSERT na author_id = user_a → Imeshindwa

-- ══════════════════════════════════════════════════════════════
-- MAJARIBIO YA BLOCKS
-- ══════════════════════════════════════════════════════════════

-- T12: Blocked user HAONI posts za blocker
-- Setup: user_a amezuia user_b (blocks table)
-- Test: user_b anajaribu kusoma post ya public ya user_a → Imeshindwa

-- T13: Blocked user HAONI hata private posts
-- (Hii ni ziada — private posts tayari hazionekani, lakini
--  blocks zinazuia hata public posts)

-- ══════════════════════════════════════════════════════════════
-- MAJARIBIO YA CONSTRAINTS
-- ══════════════════════════════════════════════════════════════

-- T14: kind check constraint
-- Test: INSERT na kind='invalid' → Imeshindwa

-- T15: visibility check constraint
-- Test: INSERT na visibility='everyone' → Imeshindwa

-- T16: media_url format check
-- Test: INSERT na media_url='ftp://bad' → Imeshindwa
-- Test: INSERT na media_url='https://good.com/img.jpg' → Sawa

-- T17: Deleted post haionekani kwa SELECT
-- Test: Baada ya soft delete, SELECT hairudishi post

-- T18: Reactions count inasasishwa
-- Setup: user_b anapenda post ya user_a
-- Test: reactions_count ya post inaongezeka

-- T19: Full-text search inafanya kazi
-- Test: to_tsvector('simple', 'Habari dunia') @@ plainto_tsquery('Habari') → true

-- ══════════════════════════════════════════════════════════════
-- MAJARIBIO YA HELPER FUNCTIONS
-- ══════════════════════════════════════════════════════════════

-- T20: can_see_post() ni STABLE (haibadilishi data)
-- Test: SELECT can_see_post(row) haina side effects

-- T21: is_blocked_by() inarudisha TRUE kwa blocked users
-- Test: Baada ya block, is_blocked_by(blocked, blocker) → TRUE

-- T22: is_blocked_by() inarudisha FALSE kwa non-blocked users
-- Test: is_blocked_by(random_user, random_blocker) → FALSE

-- ══════════════════════════════════════════════════════════════
-- MAJARIBIO YA ANONYMOUS ACCESS
-- ══════════════════════════════════════════════════════════════

-- T23: Anonymous user HAWEZI kusoma posts
-- Test: Bila JWT token, SELECT → Imeshindwa (RLS: authenticated role pekee)

-- T24: Anonymous user HAWEZI kuunda posts
-- Test: Bila JWT token, INSERT → Imeshindwa

-- T25: service_role inaweza kusoma zote (kwa admin tasks)
-- Test: Kwa service_role JWT, SELECT → Sawa (hakuna RLS kwa service_role)
-- Note: Hii ni TABIA ya Supabase, si yetu. Inathibitishwa tu.

-- ══════════════════════════════════════════════════════════════
-- SUMMARY
-- ══════════════════════════════════════════════════════════════
-- Tests zote 25 zimeandaliwa.
-- Zitaendeshwa na: supabase db test
-- au manual SQL execution kupitia psql/Supabase SQL Editor.
--
-- Tests ambazo HAZIWEZI kuendeshwa hapa:
-- - Zote (hakuna Supabase database inayopatikana kwenye workspace hii)
--
-- Tests zitakazoendeshwa kweli:
-- - Hakuna (bado — inahitaji Supabase project kuwa tayari)
