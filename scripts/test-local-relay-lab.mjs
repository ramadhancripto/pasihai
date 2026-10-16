#!/usr/bin/env node
import { createLocalRelayLab } from '../src/utils/distribution/localRelayLab.js'

let passed = 0
let failed = 0
function check(name, cond, extra = '') {
  if (cond) {
    passed++
    console.log('  PASS ' + name + (extra ? ' — ' + extra : ''))
  } else {
    failed++
    console.log('  FAIL ' + name + (extra ? ' — ' + extra : ''))
  }
}

console.log('\n═══ Local Relay Lab (simulated devices, real engine) ═══\n')
const lab = createLocalRelayLab()
check('labelled simulation', lab.mode === 'simulation' && lab.devices.every((d) => d.kind === 'simulated'))

const pub = await lab.runScenario('public-transfer')
check('public transfer integrity', pub.ok && pub.integrity && pub.sha256Sender === pub.sha256Receiver)
check('not claimed physical', pub.physicalDevice === false && pub.simulated === true)

const ir = await lab.runScenario('interrupt-resume')
check('interrupt unplayable then resume hash', ir.ok && ir.incompleteWasUnplayable && ir.integrity)

const dup = await lab.runScenario('duplicate')
check('duplicate still complete', dup.ok && dup.duplicate)

const priv = await lab.runScenario('private-deny')
check('private denied', priv.ok && priv.denied)

console.log('\nPhysical Android LAN: NOT RUN')
console.log('\nRESULTS: ' + passed + ' passed, ' + failed + ' failed')
process.exit(failed ? 1 : 0)
