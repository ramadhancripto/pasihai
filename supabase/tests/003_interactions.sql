-- ══════════════════════════════════════════════════════════════
-- PASIHAI — RLS Tests: follows, reactions, bookmarks, friendships, blocks
--
-- STATUS: IMEANDALIWA — haijaendeshwa (hakuna Supabase DB ya test)
-- ══════════════════════════════════════════════════════════════

-- ══════════════════════════════════════════════════════════════
-- FOLLOWS
-- ══════════════════════════════════════════════════════════════

-- F1: Mtumiaji anaweza kufuata mtu mwingine
-- F2: Mtumiaji HAWEZI kujifuata mwenyewe (CHECK constraint)
-- F3: Mtumiaji HAWEZI kufuata kwa niaba ya mtu mwingine (RLS)
-- F4: Duplicate follow inashindwa (PRIMARY KEY)
-- F5: Mtumiaji anaweza kuacha kufuata (DELETE own)
-- F6: Mtumiaji HAWEZI kuacha kufuata kwa niaba ya mwingine (RLS)
-- F7: followers_count inasasishwa (trigger)
-- F8: following_count inasasishwa (trigger)
-- F9: Yeyote anaweza kusoma follows (SELECT policy = true)

-- ══════════════════════════════════════════════════════════════
-- REACTIONS
-- ══════════════════════════════════════════════════════════════

-- R1: Mtumiaji anaweza kupenda post
-- R2: Mtumiaji HAWEZI kupenda kwa niaba ya mwingine (RLS)
-- R3: Duplicate reaction inashindwa (PRIMARY KEY)
-- R4: Mtumiaji anaweza kuondoa reaction yake (DELETE own)
-- R5: Mtumiaji HAWEZI kuondoa reaction ya mwingine (RLS)
-- R6: reactions_count inasasishwa (trigger)
-- R7: Yeyote anaweza kusoma reactions (SELECT policy = true)
-- R8: emoji check constraint inafanya kazi

-- ══════════════════════════════════════════════════════════════
-- BOOKMARKS
-- ══════════════════════════════════════════════════════════════

-- B1: Mtumiaji anaweza kuhifadhi post
-- B2: Mtumiaji HAWEZI kuhifadhi kwa niaba ya mwingine (RLS)
-- B3: Duplicate bookmark inashindwa (UNIQUE constraint)
-- B4: Mtumiaji anaweza kuondoa bookmark yake (DELETE own)
-- B5: Mtumiaji HAWEZI kusoma bookmarks za mwingine (RLS)
-- B6: ref_type check constraint (post au entity pekee)

-- ══════════════════════════════════════════════════════════════
-- HIDDEN ITEMS
-- ══════════════════════════════════════════════════════════════

-- H1: Mtumiaji anaweza kuficha post
-- H2: Mtumiaji HAWEZI kuficha kwa niaba ya mwingine (RLS)
-- H3: Duplicate hide inashindwa (PRIMARY KEY)
-- H4: Mtumiaji anaweza kuondoa hidden item (DELETE own)
-- H5: Mtumiaji HAWEZI kusoma hidden items za mwingine (RLS)

-- ══════════════════════════════════════════════════════════════
-- FRIENDSHIPS
-- ══════════════════════════════════════════════════════════════

-- FR1: Mtumiaji anaweza kutuma ombi la urafiki
-- FR2: Mtumiaji HAWEZI kujitumia ombi mwenyewe (CHECK)
-- FR3: Mtumiaji HAWEZI kutuma ombi kwa niaba ya mwingine (RLS)
-- FR4: Duplicate request inashindwa (UNIQUE)
-- FR5: Mpokeaji anaweza kukubali ombi (UPDATE policy)
-- FR6: Mpokeaji anaweza kukataa ombi (UPDATE policy)
-- FR7: Mwombaji anaweza kufuta ombi lake (UPDATE policy)
-- FR8: Mtumiaji HAWEZI kubadilisha ombi la mwingine (RLS)
-- FR9: friends view inarudisha urafiki wa pande mbili
-- FR10: friends_count inasasishwa (trigger)
-- FR11: Mtumiaji anaona maombi yake tu (SELECT policy)

-- ══════════════════════════════════════════════════════════════
-- BLOCKS
-- ══════════════════════════════════════════════════════════════

-- BL1: Mtumiaji anaweza kuzuia mtu mwingine
-- BL2: Mtumiaji HAWEZI kujizuia mwenyewe (CHECK)
-- BL3: Mtumiaji HAWEZI kuzuia kwa niaba ya mwingine (RLS)
-- BL4: Duplicate block inashindwa (PRIMARY KEY)
-- BL5: Mtumiaji anaweza kufungua block (DELETE own)
-- BL6: Mtumiaji HAWEZI kusoma blocks za mwingine (RLS)
-- BL7: Mtumiaji aliyezuiliwa HAONI posts za blocker (can_see_post + is_blocked_by)
-- BL8: Mtumiaji aliyezuiliwa HAWEZI kutuma maombi ya urafiki (application logic)
-- BL9: is_blocked_by() inarudisha TRUE kwa blocked pair
-- BL10: is_blocked_by() inarudisha FALSE kwa non-blocked pair

-- ══════════════════════════════════════════════════════════════
-- SUMMARY
-- ══════════════════════════════════════════════════════════════
-- Jumla ya test cases: 55
-- Zilizotayarishwa: 55
-- Zilizotekelezwa: 0 (inahitaji Supabase DB ya test)
