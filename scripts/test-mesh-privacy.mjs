#!/usr/bin/env node
import {
  DEFAULT_MESH_PRIVACY,
  loadMeshPrivacy,
  saveMeshPrivacy,
  canDiscover,
  canAcceptPeer,
  canShareManifest,
  shouldAutoStartMesh,
} from '../src/utils/distribution/meshPrivacy.js'

let passed = 0
let failed = 0
function check(name, cond, extra = '') {
  if (cond) { passed++; console.log('  PASS ' + name + (extra ? ' — ' + extra : '')) }
  else { failed++; console.log('  FAIL ' + name + (extra ? ' — ' + extra : '')) }
}

console.log('\n═══ Mesh privacy / auto-start (not device radios) ═══\n')
const mem = { data: {} }
const storage = {
  get: (k) => mem.data[k],
  set: (k, v) => { mem.data[k] = v },
}

let p = loadMeshPrivacy(storage)
check('default discoverable', canDiscover(p) === true)
p = saveMeshPrivacy(storage, { discoverable: false })
check('opt-out discoverability', canDiscover(p) === false)
check('auto-start respects opt-out', shouldAutoStartMesh({ privacy: p, appVisible: true, pluginAvailable: true }) === false)
p = saveMeshPrivacy(storage, { discoverable: true, allowUnknownSenders: false, approvedPeerIds: ['alice'] })
check('unknown sender blocked', canAcceptPeer(p, 'bob') === false)
check('approved peer allowed', canAcceptPeer(p, 'alice') === true)
check('private never shared', canShareManifest(p, { visibility: 'private' }) === false)
check('public shareable', canShareManifest(p, { visibility: 'public' }) === true)
check('auto-start needs plugin', shouldAutoStartMesh({ privacy: p, appVisible: true, pluginAvailable: false }) === false)
check('auto-start when plugin+visible+on', shouldAutoStartMesh({ privacy: loadMeshPrivacy(storage), appVisible: true, pluginAvailable: true }) === true)
check('not always-on when hidden', shouldAutoStartMesh({ privacy: p, appVisible: false, pluginAvailable: true }) === false)

console.log('\nDevice auto-discovery: NOT RUN')
console.log('\nRESULTS: ' + passed + ' passed, ' + failed + ' failed')
process.exit(failed ? 1 : 0)
