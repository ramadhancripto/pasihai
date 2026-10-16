#!/usr/bin/env node
import { readFileSync } from 'node:fs'
const src = readFileSync(new URL('../src/data/repositories/supabaseSystemRepository.js', import.meta.url), 'utf8')
const block = src.slice(src.indexOf('async setRelayDailyLimit'), src.indexOf('async getRelayMessages'))
let passed = 0
let failed = 0
function check(name, cond) {
  if (cond) { passed++; console.log('  PASS ' + name) }
  else { failed++; console.log('  FAIL ' + name) }
}
console.log('\n═══ setRelayDailyLimit fallback ═══\n')
check('no upsert after rpc error', !/if \(error\)[\s\S]*upsert/.test(block))
check('rpc_missing distinct from reject', block.includes('rpc_missing') && block.includes('rpc_rejected'))
check('offline is local_only not silent server success', block.includes('local_only'))
console.log('\nRESULTS: ' + passed + ' passed, ' + failed + ' failed')
process.exit(failed ? 1 : 0)
