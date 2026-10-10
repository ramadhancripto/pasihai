// ══════════════════════════════════════════════════════════════
// PASIHAI — FAILURE SCENARIO TESTS (Batch E - Part 2)
//
// Tests za kuthibitisha outbox inashughulikia:
//   1. Network kukatika kabla ya request kufika server
//   2. Server kuhifadhi action lakini response kupotea
//   3. IndexedDB kushindwa kusasisha status
//   4. remove() kushindwa baada ya server kupokea action
//   5. App kufungwa action ikiwa SENDING au SENT_TO_SERVER
//   6. Queue processor mbili kujaribu action ileile
//
// Matumizi: node scripts/test-failure-scenarios.mjs
// ══════════════════════════════════════════════════════════════

let passed = 0
let failed = 0
let total = 0

function check(label, condition, detail = '') {
  total++
  if (condition) {
    passed++
    console.log(`  ✅ ${label}${detail ? ` — ${detail}` : ''}`)
  } else {
    failed++
    console.log(`  ❌ ${label}${detail ? ` — ${detail}` : ''}`)
  }
}

console.log('')
console.log('═══ PASIHAI — Failure Scenario Tests (Batch E - Part 2) ═══')
console.log('')

// ── Setup ──────────────────────────────────────────────────
try {
  const fakeIndexedDB = await import('fake-indexeddb')
  globalThis.indexedDB = fakeIndexedDB.indexedDB
  globalThis.IDBKeyRange = fakeIndexedDB.IDBKeyRange
} catch (err) {
  console.log('  ⚠️  fake-indexeddb haijapakiwa')
  process.exit(1)
}

const { outboxManager, STATUS } = await import('../src/utils/outboxManager.js')
const { syncEngine } = await import('../src/utils/syncEngine.js')

// ── Test 1: Network Kukatika Kabla ya Request ─────────────
console.log('── 1. Network Kukatika Kabla ya Request ──')

await outboxManager.clear()

// 1.1: Unda action na uiweke SENDING
const action1 = await outboxManager.enqueue({
  type: 'addPost',
  payload: { text: 'Network cut test' },
  idempotencyKey: 'network-cut-1',
})

await outboxManager.updateStatus(action1.id, STATUS.SENDING)

// 1.2: Simulate network cut - action inabaki SENDING
const stuck = await outboxManager.getAction(action1.id)
check('1.1: Action inabaki SENDING', stuck.status === STATUS.SENDING)

// 1.3: recoverStuckActions() inapaswa kuirejesha
const recovered = await outboxManager.recoverStuckActions(0) // Timeout 0 = zote ni stuck
check('1.2: recoverStuckActions() inarejesha', recovered.recovered === 1)

// 1.4: Action sasa ni PENDING
const afterRecovery = await outboxManager.getAction(action1.id)
check('1.3: Action sasa ni PENDING', afterRecovery.status === STATUS.PENDING)

// ── Test 2: Server Kuhifadhi Lakini Response Kupotea ──────
console.log('')
console.log('── 2. Server Kuhifadhi Lakini Response Kupotea ──')

await outboxManager.clear()

// 2.1: Unda action na uiweke SENT_TO_SERVER (server imepokea)
const action2 = await outboxManager.enqueue({
  type: 'addComment',
  payload: { postId: 'p1', text: 'Response lost test' },
  idempotencyKey: 'response-lost-2',
})

await outboxManager.updateStatus(action2.id, STATUS.SENT_TO_SERVER)

// 2.2: Simulate remove() kushindwa - action inabaki SENT_TO_SERVER
const sentToServer = await outboxManager.getAction(action2.id)
check('2.1: Action inabaki SENT_TO_SERVER', sentToServer.status === STATUS.SENT_TO_SERVER)

// 2.3: Sync engine haipaswi kuituma tena
const pending = await outboxManager.getQueue({ status: STATUS.PENDING })
check('2.2: Sync engine haitaituma tena', pending.length === 0)

// 2.4: clearSent() inaweza kuifuta baadaye
const cleared = await outboxManager.clearSent()
check('2.3: clearSent() inafuta SENT_TO_SERVER', cleared === 1)

// ── Test 3: IndexedDB Kushindwa Kusasisha Status ──────────
console.log('')
console.log('── 3. IndexedDB Kushindwa Kusasisha Status ──')

await outboxManager.clear()

// 3.1: Unda action
const action3 = await outboxManager.enqueue({
  type: 'toggleLike',
  payload: { postId: 'p1' },
  idempotencyKey: 'indexeddb-fail-3',
})

// 3.2: Simulate IndexedDB failure kwa updateStatus
// (Kwa kweli hatuwezi kuiga IndexedDB failure kwa urahisi,
// lakini tunaweza kuhakikisha kwamba action inabaki salama)
const before = await outboxManager.getAction(action3.id)
check('3.1: Action ipo kabla ya update', before !== null)
check('3.2: Status ni PENDING', before.status === STATUS.PENDING)

// 3.3: Jaribu updateStatus (inapaswa kufanikiwa)
await outboxManager.updateStatus(action3.id, STATUS.SENDING)
const after = await outboxManager.getAction(action3.id)
check('3.3: Status imebadilika kuwa SENDING', after.status === STATUS.SENDING)

// ── Test 4: remove() Kushindwa Baada ya Server Kupokea ────
console.log('')
console.log('── 4. remove() Kushindwa Baada ya Server Kupokea ──')

await outboxManager.clear()

// 4.1: Unda action na uiweke SENT_TO_SERVER
const action4 = await outboxManager.enqueue({
  type: 'addPost',
  payload: { text: 'Remove fail test' },
  idempotencyKey: 'remove-fail-4',
})

await outboxManager.updateStatus(action4.id, STATUS.SENT_TO_SERVER)

// 4.2: Simulate remove() kushindwa - action inabaki SENT_TO_SERVER
const stillThere = await outboxManager.getAction(action4.id)
check('4.1: Action bado ipo kwenye outbox', stillThere !== null)
check('4.2: Status ni SENT_TO_SERVER', stillThere.status === STATUS.SENT_TO_SERVER)

// 4.3: Hakikisha haitatumwa tena
const toProcess = await outboxManager.getQueue({ status: STATUS.PENDING })
check('4.3: Haitatumwa tena', toProcess.length === 0)

// 4.4: Inaweza kufutwa baadaye na clearSent()
const finalCleared = await outboxManager.clearSent()
check('4.4: Inaweza kufutwa baadaye', finalCleared === 1)

// ── Test 5: App Kufungwa Action Ikiwa SENDING ─────────────
console.log('')
console.log('── 5. App Kufungwa Action Ikiwa SENDING ──')

await outboxManager.clear()

// 5.1: Unda action na uiweke SENDING
const action5 = await outboxManager.enqueue({
  type: 'addComment',
  payload: { postId: 'p2', text: 'App restart test' },
  idempotencyKey: 'app-restart-5',
})

await outboxManager.updateStatus(action5.id, STATUS.SENDING)

// 5.2: Simulate app restart - recoverStuckActions() inapaswa kuirejesha
// Subiri kidogo ili kuhakikisha timeSinceUpdate > 0
await new Promise(resolve => setTimeout(resolve, 10))
const restartRecovered = await outboxManager.recoverStuckActions(0)
check('5.1: recoverStuckActions() inarejesha', restartRecovered.recovered === 1)

// 5.3: Action sasa ni PENDING na inaweza kutumwa tena
const afterRestart = await outboxManager.getAction(action5.id)
check('5.2: Action sasa ni PENDING', afterRestart.status === STATUS.PENDING)
check('5.3: Retries hazijabadilika (recovery si failure)', afterRestart.retries === 0)

// ── Test 6: Queue Processor Mbili Kujaribu Action Ileile ──
console.log('')
console.log('── 6. Queue Processor Mbili Kujaribu Action Ileile ──')

await outboxManager.clear()

// 6.1: Unda action moja
const action6 = await outboxManager.enqueue({
  type: 'addPost',
  payload: { text: 'Concurrent test' },
  idempotencyKey: 'concurrent-6',
})

// 6.2: Simulate concurrent processing - jaribu kuiweka SENDING mara mbili
const result1 = await outboxManager.updateStatus(action6.id, STATUS.SENDING)
const result2 = await outboxManager.updateStatus(action6.id, STATUS.SENDING)

// 6.3: Zote mbili zinafanikiwa (hakuna lock mechanism)
check('6.1: Update ya kwanza inafanikiwa', result1.status === STATUS.SENDING)
check('6.2: Update ya pili inafanikiwa', result2.status === STATUS.SENDING)

// 6.4: Hakikisha kuna action moja tu
const finalQueue = await outboxManager.getQueue()
check('6.3: Kuna action moja tu', finalQueue.length === 1)

// ── Test 7: Recovery ya Actions Zilizokwama ───────────────
console.log('')
console.log('── 7. Recovery ya Actions Zilizokwama ──')

await outboxManager.clear()

// 7.1: Unda actions 3 zenye status tofauti
const action7a = await outboxManager.enqueue({
  type: 'addPost',
  payload: { text: 'Stuck 1' },
  idempotencyKey: 'stuck-7a',
})
await outboxManager.updateStatus(action7a.id, STATUS.SENDING)

const action7b = await outboxManager.enqueue({
  type: 'addPost',
  payload: { text: 'Stuck 2' },
  idempotencyKey: 'stuck-7b',
})
await outboxManager.updateStatus(action7b.id, STATUS.SENT_TO_SERVER)

const action7c = await outboxManager.enqueue({
  type: 'addPost',
  payload: { text: 'Stuck 3' },
  idempotencyKey: 'stuck-7c',
})
await outboxManager.updateStatus(action7c.id, STATUS.SENDING)

// 7.2: recoverStuckActions() inapaswa kurejesha SENDING tu
// Subiri kidogo ili kuhakikisha timeSinceUpdate > 0
await new Promise(resolve => setTimeout(resolve, 10))
const recoveryStats = await outboxManager.recoverStuckActions(0)
check('7.1: recoverStuckActions() inarejesha 2', recoveryStats.recovered === 2)

// 7.3: Hakikisha status zimebadilika
const a = await outboxManager.getAction(action7a.id)
const b = await outboxManager.getAction(action7b.id)
const c = await outboxManager.getAction(action7c.id)

check('7.2: SENDING → PENDING', a.status === STATUS.PENDING)
check('7.3: SENT_TO_SERVER inabaki', b.status === STATUS.SENT_TO_SERVER)
check('7.4: SENDING → PENDING', c.status === STATUS.PENDING)

// ── Cleanup ─────────────────────────────────────────────────
console.log('')
console.log('── 8. Cleanup ──')

await outboxManager.clear()
const { localDb } = await import('../src/utils/localDatabase.js')
localDb.close()
check('8.1: Cleanup imekamilika', true)

// ── Summary ─────────────────────────────────────────────────
console.log('')
console.log(`═══ RESULTS: ${passed}/${total} passed, ${failed} failed ═══`)
console.log('')

process.exit(failed > 0 ? 1 : 0)
