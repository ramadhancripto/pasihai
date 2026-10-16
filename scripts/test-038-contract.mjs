#!/usr/bin/env node
import { readFileSync } from 'node:fs'

let passed = 0
let failed = 0
function check(name, cond, extra = '') {
  if (cond) { passed++; console.log('  PASS ' + name + (extra ? ' — ' + extra : '')) }
  else { failed++; console.log('  FAIL ' + name + (extra ? ' — ' + extra : '')) }
}

console.log('\n═══ 038 SQL contract (file only; NOT applied hosted) ═══\n')
const sql = readFileSync(new URL('../supabase/migrations/038_relay_quota_commission_hai.sql', import.meta.url), 'utf8')
check('not auto-applied', sql.includes('PROPOSED. Not applied'))
check('commission 0.02', sql.includes('SET DEFAULT 0.02') && sql.includes('SELECT 0.02'))
check('does not keep 10% as new default', !/ALTER COLUMN commission_rate SET DEFAULT 0\.10/.test(sql))
check('3 MB bytes default', sql.includes('3145728'))
check('set_relay_daily_limit 3 or 5', sql.includes('p_mb IS DISTINCT FROM 3') && sql.includes('p_mb IS DISTINCT FROM 5'))
check('spend_hai_points consent', sql.includes('no_consent') && sql.includes('1 point = 5 MB'))
check('duplicate spend key', sql.includes('already_charged'))
check('fragment groups table', sql.includes('relay_fragment_groups'))

const sql028 = readFileSync(new URL('../supabase/migrations/028_relay_system_hardened.sql', import.meta.url), 'utf8')
check('028 still has 0.10 default (historical)', sql028.includes('DEFAULT 0.10'))
check('028 quota table still 5MB default until 038', sql028.includes('5242880'))
check('settle only if delivered', sql.includes('not_delivered') && sql.includes('settle_relay_usage'))
check('duplicate settlement blocked', sql.includes('duplicate_settlement'))
check('commission constraint 2pct', sql.includes('relay_providers_commission_2pct'))
check('fragment check 20480', sql.includes('relay_check_fragment') && sql.includes('split_evasion'))

console.log('\n038 NOT applied. Hosted SKIPPED.')
console.log('\nRESULTS: ' + passed + ' passed, ' + failed + ' failed')
process.exit(failed ? 1 : 0)
