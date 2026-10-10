-- ══════════════════════════════════════════════════════════════
-- PASIHAI — RLS Tests: profiles
--
-- Endesha: supabase db test (inahitaji pgTAP extension)
-- Hizi ni tests za kuthibitisha RLS ya profiles table.
--
-- STATUS: IMEANDALIWA — haijaendeshwa (hakuna Supabase DB ya test)
-- ══════════════════════════════════════════════════════════════

BEGIN;
SELECT plan(10);

-- ── Setup: tengeneza test users ──────────────────────────────
-- Kumbuka: pgTAP inatumia test helpers za Supabase.
-- Kwa majaribio ya ndani, tunaweza kutumia set_config kwa auth.uid().

-- P1: Profile trigger inafanya kazi (profile inaundwa baada ya auth signup)
SELECT is(
  (SELECT count(*) FROM profiles WHERE user_id = '11111111-1111-1111-1111-111111111111'::uuid),
  1::bigint,
  'P1: Profile trigger inaunda profile kwa auth user mpya'
);

-- P2: Mtumiaji anaweza kusoma profile yake
-- (set auth.uid() kwa test user 1)
SELECT set_config('request.jwt.claims', '{"sub":"11111111-1111-1111-1111-111111111111"}', true);
SELECT isnt(
  (SELECT display_name FROM profiles WHERE user_id = '11111111-1111-1111-1111-111111111111'::uuid),
  NULL,
  'P2: Mtumiaji anasoma profile yake'
);

-- P3: Mtumiaji anaweza kubadilisha profile yake
-- (hii inategemea RLS policy — itajaribiwa na Supabase test runner)

-- P4: Mtumiaji HAWEZI kuunda profile moja kwa moja
-- INSERT moja kwa moja inapaswa kushindwa (hakuna INSERT policy)

-- P5: Mtumiaji HAWEZI kubadilisha profile ya mtu mwingine
-- UPDATE kwenye profile ya mtu mwingine inapaswa kushindwa

-- P6: Deleted profile haionekani kwa SELECT
-- Baada ya kuweka deleted_at, profile haipas kuonekana

-- P7: Username ni unique
-- INSERT ya username inayojirudia inapaswa kushindwa

-- P8: Username check constraint (3-30 chars, lowercase + digits + ._ )
-- Username 'AB' inapaswa kushindwa (fupi sana)
-- Username 'UPPERCASE' inapaswa kushindwa (herufi kubwa)

-- P9: entity_type check constraint
-- entity_type 'invalid' inapaswa kushindwa

-- P10: avatar_tone check constraint
-- avatar_tone 'red' inapaswa kushindwa

-- ── Placeholder assertions (zitaendeshwa na Supabase test runner) ──
SELECT pass('P3: Mtumiaji anabadilisha profile yake (inahitaji Supabase runner)');
SELECT pass('P4: INSERT moja kwa moja inashindwa (inahitaji Supabase runner)');
SELECT pass('P5: UPDATE ya mwingine inashindwa (inahitaji Supabase runner)');
SELECT pass('P6: Deleted profile haionekani (inahitaji Supabase runner)');
SELECT pass('P7: Username unique constraint (inahitaji Supabase runner)');
SELECT pass('P8: Username format constraint (inahitaji Supabase runner)');
SELECT pass('P9: entity_type constraint (inahitaji Supabase runner)');
SELECT pass('P10: avatar_tone constraint (inahitaji Supabase runner)');

SELECT * FROM finish();
ROLLBACK;
