-- ══════════════════════════════════════════════════════════════
-- PASIHAI — Seed: profiles za majaribio
--
-- MATUMIZI: supabase db seed (staging/testing PEKEE)
-- KUMBUKA: Profiles halisi zinaundwa na trigger on_auth_user_created.
--          Seed hii inatumia raw SQL kwa majaribio — inapita trigger.
--
-- Hakuna data ya mock itakayoingia production.
-- ══════════════════════════════════════════════════════════════

-- Kumbuka: Kwa majaribio, tunahitaji kwanza kuunda auth.users
-- kisha profiles zinafuata. Supabase CLI inaweza kutumia
-- `supabase db seed` au `supabase db reset` kuendesha hii.

-- Kwa sababu tunafanya test za RLS, tutatumia auth.uid() za
-- majaribio. Hizi zinatengenezwa na test framework.

-- Mfano wa seed data (itaendeshwa na test framework):
-- INSERT INTO auth.users (id, email, raw_user_meta_data) VALUES
--   ('11111111-1111-1111-1111-111111111111', 'amina@test.com', '{"username": "amina", "display_name": "Amina Said"}'),
--   ('22222222-2222-2222-2222-222222222222', 'juma@test.com', '{"username": "juma", "display_name": "Juma Mwakyusa"}');
-- Profiles zitaundwa na trigger moja kwa moja.
