// ═══════════════════════════════════════════════════════════
// Test: Simulate exact Supabase HTTP responses from production
// to verify error parsing is correct — not guessing.
// ═══════════════════════════════════════════════════════════

import { parseSupabaseError } from '../src/utils/errors.js';

let pass = 0, fail = 0;
function assert(label, actual, expectedCode) {
  if (actual.code === expectedCode) {
    console.log(`  ✅ ${label} → ${actual.code}`);
    pass++;
  } else {
    console.log(`  ❌ ${label} → ${actual.code} (expected ${expectedCode})`);
    console.log(`     message: ${actual.message}`);
    fail++;
  }
}

console.log('═══ Simulating exact Supabase production errors ═══\n');

// ── CASE 1: statuses INSERT → 409 when table doesn't exist ──
console.log('--- statuses INSERT (table doesn\'t exist) ---');

assert('409 + PGRST205', parseSupabaseError({
  code: 'PGRST205',
  message: "Could not find the table 'public.statuses' in the schema cache",
  details: null, hint: null, status: 409
}, 'addStatus'), 'SCHEMA_ERROR');

assert('409 + 42P01', parseSupabaseError({
  code: '42P01',
  message: 'relation "public.statuses" does not exist',
  details: null, hint: null, status: 409
}, 'addStatus'), 'SCHEMA_ERROR');

// Some PostgREST returns 409 + no code + "permission denied for table"
assert('409 + no code + permission denied for table', parseSupabaseError({
  code: undefined,
  message: 'permission denied for table statuses',
  details: null, hint: null, status: 409
}, 'addStatus'), 'SCHEMA_ERROR');

// Real RLS — table EXISTS but policy blocks INSERT — MUST stay RLS_ERROR
assert('403 + 42501 (real RLS)', parseSupabaseError({
  code: '42501',
  message: 'new row violates row-level security policy for table "statuses"',
  details: null, hint: null, status: 403
}, 'addStatus'), 'RLS_ERROR');

// ── CASE 2: profiles SELECT → 406 from .single() returning 0 rows ──
console.log('\n--- profiles SELECT (.single() 0 rows) ---');

assert('406 .single() no rows', parseSupabaseError({
  code: undefined,
  message: 'JSON object requested, multiple (or no) rows returned',
  details: null, hint: null, status: 406
}, 'getCurrentUser'), 'SCHEMA_ERROR');

// ── CASE 3: profiles table doesn't exist ──
console.log('\n--- profiles table doesn\'t exist ---');

assert('404 + PGRST205 profiles', parseSupabaseError({
  code: 'PGRST205',
  message: "Could not find the table 'public.profiles' in the schema cache",
  details: null, hint: null, status: 404
}, 'getCurrentUser'), 'SCHEMA_ERROR');

// ── CASE 4: Real constraint violations — MUST be VALIDATION_ERROR ──
console.log('\n--- Real constraint violations ---');

assert('23514 check violation', parseSupabaseError({
  code: '23514',
  message: 'new row for relation "statuses" violates check constraint "statuses_content_check"',
  details: 'Failing row contains (..., null, null, null, ...).',
  hint: null, status: 400
}, 'addStatus'), 'VALIDATION_ERROR');

assert('23503 FK violation', parseSupabaseError({
  code: '23503',
  message: 'insert or update on table "statuses" violates foreign key constraint "statuses_user_id_fkey"',
  details: 'Key (user_id)=(xxx) is not present in table "profiles".',
  hint: null, status: 400
}, 'addStatus'), 'VALIDATION_ERROR');

assert('23502 not-null violation', parseSupabaseError({
  code: '23502',
  message: 'null value in column "media_url" violates not-null constraint',
  details: 'Failing row contains (..., null, ...).',
  hint: null, status: 400
}, 'addStatus'), 'VALIDATION_ERROR');

assert('23505 unique violation', parseSupabaseError({
  code: '23505',
  message: 'duplicate key value violates unique constraint "profiles_username_key"',
  details: 'Key (username)=(testuser) already exists.',
  hint: null, status: 400
}, 'addStatus'), 'VALIDATION_ERROR');

// ── CASE 5: Confusion tests — real 409 conflict (NOT table-missing) ──
console.log('\n--- Real 409 conflict (e.g., idempotency key duplicate) ---');
// Should remain ConflictError if no schema-related indicators
assert('409 + no schema indicators', parseSupabaseError({
  code: '23505',
  message: 'duplicate key value violates unique constraint',
  details: null, hint: null, status: 409
}, 'addStatus'), 'VALIDATION_ERROR');

console.log(`\n═══ Results: ${pass} passed, ${fail} failed ═══`);
process.exit(fail > 0 ? 1 : 0);