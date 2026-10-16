#!/usr/bin/env node
const url = process.env.PASIHAI_STAGING_URL
const key = process.env.PASIHAI_STAGING_ANON_KEY
const a = process.env.PASIHAI_TEST_EMAIL_A
if (!url || !key || !a) {
  console.log('hosted relay: SKIPPED (need PASIHAI_STAGING_URL, PASIHAI_STAGING_ANON_KEY, PASIHAI_TEST_EMAIL_A/B)')
  console.log('037_relay_recipient_ack.sql is NOT applied from this environment.')
  process.exit(2)
}
console.log('hosted relay: credentials present but this harness does not run destructive RPCs without owner confirmation.')
process.exit(2)
