// Runs supabase/migrations/*.sql in lexical order on a FRESH local database.
// Usage: node run-migrations.mjs <repoPath> <dbName>
// Only ever points at the local Postgres on 127.0.0.1:54329 (never a hosted project).
import pg from 'pg';
import fs from 'fs';
import path from 'path';

const [repo, dbName = 'pasihai_fresh'] = process.argv.slice(2);
const PORT = Number(process.env.PG_PORT || 54329);
// Safety: this harness drops and recreates a database. It must never point at a hosted project.
const HOST = process.env.PG_HOST || '127.0.0.1';
if (!['127.0.0.1', 'localhost'].includes(HOST)) {
  throw new Error(`Refusing to run destructive DB harness against non-local host "${HOST}"`);
}

const admin = new pg.Client({ host: HOST, port: PORT, user: 'postgres', database: 'postgres' });
await admin.connect();
await admin.query(`DROP DATABASE IF EXISTS ${dbName} WITH (FORCE)`);
await admin.query(`CREATE DATABASE ${dbName}`);
await admin.end();

const db = new pg.Client({ host: HOST, port: PORT, user: 'postgres', database: dbName });
await db.connect();
await db.query(fs.readFileSync(new URL('./supabase-shim.sql', import.meta.url), 'utf8'));
console.log('shim: OK');

const dir = path.join(repo, 'supabase/migrations');
const files = fs.readdirSync(dir).filter((f) => f.endsWith('.sql')).sort();
let ok = 0;
for (const f of files) {
  try {
    await db.query(fs.readFileSync(path.join(dir, f), 'utf8'));
    ok++;
    console.log(`OK    ${f}`);
  } catch (e) {
    console.log(`FAIL  ${f}: ${e.message}`);
    break;
  }
}
console.log(`migrations applied: ${ok}/${files.length}`);
await db.end();
process.exit(ok === files.length ? 0 : 1);
