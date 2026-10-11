// Behaviour + RLS tests against LOCAL Postgres 17 + Supabase shim (fresh migrated DB).
// Usage: node behavior-test.mjs <dbName>
import pg from 'pg';

const dbName = process.argv[2] || 'pasihai_fresh';
const PORT = Number(process.env.PG_PORT || 54329);
// Safety: these tests insert and delete rows. Local databases only.
const HOST = process.env.PG_HOST || '127.0.0.1';
if (!['127.0.0.1', 'localhost'].includes(HOST)) {
  throw new Error(`Refusing to run destructive DB tests against non-local host "${HOST}"`);
}
const results = [];
const check = (name, ok, detail = '') => {
  results.push({ name, ok: !!ok, detail: String(detail).slice(0, 300) });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  — ' + String(detail).slice(0, 160) : ''}`);
};

const db = new pg.Client({ host: HOST, port: PORT, user: 'postgres', database: dbName });
await db.connect();

const A = '11111111-1111-1111-1111-111111111111';
const B = '22222222-2222-2222-2222-222222222222';
const C = '33333333-3333-3333-3333-333333333333';

// Setup as superuser (same role migrations were run as)
await db.query('TRUNCATE auth.users CASCADE');
for (const [id, name] of [[A, 'alice'], [B, 'bob'], [C, 'carol']]) {
  await db.query(
    `INSERT INTO auth.users (id, email, raw_user_meta_data) VALUES ($1, $2, $3)`,
    [id, `${name}@local.test`, JSON.stringify({ username: name, display_name: name })],
  );
}
const prof = await db.query('SELECT user_id, username FROM profiles ORDER BY username');
check('auth trigger creates profiles for each auth user', prof.rowCount === 3, prof.rows.map((r) => r.username).join(','));

const post = await db.query(
  `INSERT INTO posts (author_id, kind, text) VALUES ($1, 'text', 'hello') RETURNING id`, [A]);
const postId = post.rows[0].id;

// Act as an authenticated user
async function asUser(uid, fn) {
  await db.query('BEGIN');
  try {
    await db.query('SET LOCAL ROLE authenticated');
    await db.query(`SELECT set_config('request.jwt.claim.sub', $1, true)`, [uid]);
    const r = await fn();
    await db.query('COMMIT');
    return r;
  } catch (e) {
    await db.query('ROLLBACK');
    throw e;
  }
}

// ── Counts ────────────────────────────────────────────────────
try {
  await asUser(B, () => db.query(`INSERT INTO reactions (user_id, post_id, emoji) VALUES ($1, $2, 'like')`, [B, postId]));
  const c = await db.query('SELECT reactions_count FROM posts WHERE id = $1', [postId]);
  check('reaction insert increments posts.reactions_count', c.rows[0].reactions_count === 1,
    `reactions_count=${c.rows[0].reactions_count} (expected 1)`);
} catch (e) {
  check('reaction insert increments posts.reactions_count', false, e.message);
}

// ── RLS: own-data only ───────────────────────────────────────
try {
  await asUser(B, () => db.query(`INSERT INTO bookmarks (user_id, ref_type, ref_id) VALUES ($1, 'post', $2)`, [B, postId]));
  check('user can bookmark as self', true);
} catch (e) {
  check('user can bookmark as self', false, e.message);
}
try {
  await asUser(C, () => db.query(`INSERT INTO bookmarks (user_id, ref_type, ref_id) VALUES ($1, 'post', $2)`, [B, postId]));
  check('user cannot bookmark on behalf of another user', false, 'insert succeeded');
} catch (e) {
  check('user cannot bookmark on behalf of another user', /row-level security|violates/i.test(e.message), e.message);
}
try {
  const r = await asUser(C, () => db.query(`SELECT user_id FROM bookmarks`));
  check('user C sees no bookmarks owned by B', r.rowCount === 0, `rows=${r.rowCount}`);
} catch (e) {
  check('user C sees no bookmarks owned by B', false, e.message);
}

// ── Profiles: no self-escalation of counts ───────────────────
try {
  await asUser(A, () => db.query(`UPDATE profiles SET followers_count = 999 WHERE user_id = $1`, [A]));
  const p = await db.query('SELECT followers_count FROM profiles WHERE user_id = $1', [A]);
  check('user cannot set own followers_count', p.rows[0].followers_count !== 999, `followers_count=${p.rows[0].followers_count}`);
} catch (e) {
  check('user cannot set own followers_count', true, 'update rejected: ' + e.message.slice(0, 80));
}

// ── Direct tamper of counts by the post author must be reverted ─
try {
  await asUser(A, () => db.query(`UPDATE posts SET reactions_count = 999 WHERE id = $1`, [postId]));
  const t = await db.query('SELECT reactions_count FROM posts WHERE id = $1', [postId]);
  check('author cannot tamper posts.reactions_count directly', t.rows[0].reactions_count !== 999, `reactions_count=${t.rows[0].reactions_count}`);
} catch (e) {
  check('author cannot tamper posts.reactions_count directly', true, 'rejected: ' + e.message.slice(0, 80));
}

// ── Anonymous role has no access to private tables ──────────
try {
  await db.query('BEGIN');
  await db.query('SET LOCAL ROLE anon');
  const r = await db.query('SELECT count(*)::int AS n FROM bookmarks');
  await db.query('COMMIT');
  check('anon role cannot read bookmarks', r.rows[0].n === 0 || r.rows[0].n === undefined, `n=${r.rows[0].n}`);
} catch (e) {
  await db.query('ROLLBACK').catch(() => {});
  check('anon role cannot read bookmarks', /permission denied/i.test(e.message), e.message);
}

const pass = results.filter((r) => r.ok).length;
console.log(`\nRESULTS: ${pass}/${results.length} passed`);
await db.end();
process.exit(pass === results.length ? 0 : 1);
