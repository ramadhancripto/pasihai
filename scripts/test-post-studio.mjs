// Tests za Post Studio: content model, renderer-safe sanitizing, drafts, contrast.
import assert from 'node:assert/strict'
import {
  BACKGROUNDS, CONTENT_MARKER, DEFAULT_TEMPLATE, PALETTE, POST_TYPES, TEMPLATES,
  changeType, createContent, parseContent, plainText, sanitizeContent,
  serializeContent, templatesFor, validateContent,
} from '../src/utils/postContent.js'
import { DraftConflictError, getDraft, listDrafts, removeDraft, saveDraft } from '../src/utils/studioDrafts.js'

let pass = 0, fail = 0
function t(name, fn) {
  try { fn(); pass++; console.log(`  ✓ ${name}`) }
  catch (e) { fail++; console.log(`  ✗ ${name}\n    ${e.message}`) }
}
const memStore = () => {
  const m = new Map()
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)) }
}
// WCAG 2.x contrast ratio
function lum(hex) {
  const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4))
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]
}
const ratio = (a, b) => {
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}

console.log('Post content — aina na templates')
t('kila aina ina template chaguo-msingi inayoiunga mkono', () => {
  for (const type of Object.keys(POST_TYPES)) {
    const tpl = DEFAULT_TEMPLATE[type]
    assert.ok(TEMPLATES[tpl], `template ${tpl} haipo kwa ${type}`)
    assert.ok(TEMPLATES[tpl].types.includes(type), `${tpl} haiungi ${type}`)
  }
})
t('templates zina id, version na layout', () => {
  for (const tpl of Object.values(TEMPLATES)) {
    assert.ok(tpl.id && Number.isInteger(tpl.version) && tpl.layout)
  }
})
t('templatesFor(article) ni Makala pekee', () => {
  assert.deepEqual(templatesFor('article').map((x) => x.id), ['article'])
})
t('template isiyoungwa haibadilishi aina (createContent inaanguka kwa default)', () => {
  const c = createContent('article', 'poll')
  assert.equal(c.template.id, 'article')
})
t('aina isiyojulikana → text', () => assert.equal(createContent('bogus').type, 'text'))

console.log('Post content — sanitize na usalama')
t('HTML inabaki kama maandishi (haitekelezwi)', () => {
  const c = sanitizeContent({ type: 'article', body: { text: '<img src=x onerror=alert(1)>' } })
  assert.equal(c.body.text, '<img src=x onerror=alert(1)>')
  // React inaiweka kama text; hapa tunathibitisha kuwa haijabadilishwa kuwa HTML
  assert.equal(typeof c.body.text, 'string')
})
t('ukubwa usiopo kwenye allowlist unarudi default', () => {
  const c = sanitizeContent({ type: 'article', heading: { size: 'huge' }, body: { size: '999' } })
  assert.equal(c.heading.size, 'lg')
  assert.equal(c.body.size, 'md')
})
t('rangi isiyo kwenye palette inarudi default', () => {
  const c = sanitizeContent({ type: 'article', heading: { color: '#ff0000' }, conclusion: { color: 'javascript:x' } })
  assert.equal(c.heading.color, 'ink')
  assert.equal(c.conclusion.color, 'ink')
})
t('background isiyo kwenye allowlist → none', () => {
  assert.equal(sanitizeContent({ background: 'url(evil)' }).background, 'none')
})
t('control characters zinaondolewa', () => {
  const c = sanitizeContent({ type: 'text', body: { text: 'a\u0000b\u0007c' } })
  assert.equal(c.body.text, 'abc')
})
t('urefu wa heading unakatwa hadi 120', () => {
  assert.equal(sanitizeContent({ heading: { text: 'x'.repeat(500) } }).heading.text.length, 120)
})
t('options hazizidi 4', () => {
  assert.equal(sanitizeContent({ options: ['a', 'b', 'c', 'd', 'e', 'f'] }).options.length, 4)
})

console.log('Post content — uthibitishaji')
t('article bila heading → si ok', () => {
  const c = createContent('article'); c.body.text = 'mwili'
  const r = validateContent(c)
  assert.equal(r.ok, false)
  assert.match(r.errors.join(' '), /kichwa/)
})
t('article kamili → ok (conclusion si lazima)', () => {
  const c = createContent('article'); c.heading.text = 'Kichwa'; c.body.text = 'mwili'
  assert.deepEqual(validateContent(c), { ok: true, errors: [] })
})
t('poll yenye chaguo moja → si ok', () => {
  const c = createContent('poll'); c.body.text = 'Swali?'; c.options = ['Ndiyo', '']
  assert.equal(validateContent(c).ok, false)
})
t('poll yenye chaguo zinazorudiwa → si ok', () => {
  const c = createContent('poll'); c.body.text = 'Swali?'; c.options = ['A', 'A']
  assert.match(validateContent(c).errors.join(' '), /rudiwe|rudia/)
})
t('poll sahihi → ok', () => {
  const c = createContent('poll'); c.body.text = 'Swali?'; c.options = ['A', 'B']
  assert.equal(validateContent(c).ok, true)
})
t('text tupu → si ok', () => assert.equal(validateContent(createContent('text')).ok, false))

console.log('Post content — uhifadhi (serialize/parse)')
t('text ya kawaida inabaki plain (hakuna envelope)', () => {
  const c = createContent('text'); c.body.text = 'Habari'
  assert.equal(serializeContent(c), 'Habari')
  assert.equal(parseContent('Habari'), null)
})
t('article inahifadhiwa kama envelope na inasomeka tena', () => {
  const c = createContent('article'); c.heading.text = 'H'; c.body.text = 'B'; c.conclusion.text = 'C'
  c.heading.size = 'xl'; c.heading.color = 'plum'; c.conclusion.size = 'lg'
  const s = serializeContent(c)
  assert.ok(s.startsWith(CONTENT_MARKER))
  const back = parseContent(s)
  assert.equal(back.type, 'article')
  assert.equal(back.heading.size, 'xl')
  assert.equal(back.heading.color, 'plum')
  assert.equal(back.conclusion.text, 'C')
})
t('envelope iliyoharibika → null (hakuna crash)', () => {
  assert.equal(parseContent(CONTENT_MARKER + '{bad json'), null)
})
t('envelope yenye aina isiyojulikana → null', () => {
  assert.equal(parseContent(CONTENT_MARKER + '{"type":"hack"}'), null)
})
t('plainText ya envelope inarudisha maandishi yote bila JSON', () => {
  const c = createContent('article'); c.heading.text = 'Kichwa'; c.body.text = 'Mwili'
  const out = plainText(serializeContent(c))
  assert.equal(out, 'Kichwa\n\nMwili')
  assert.ok(!out.includes('{'))
})
t('plainText ya maandishi ya kawaida ni yenyewe', () => assert.equal(plainText('Habari'), 'Habari'))

console.log('Post content — kubadilisha aina')
t('kubadilisha Article→Text na content ipo → needsConfirm', () => {
  const c = createContent('article'); c.heading.text = 'Kichwa'
  const r = changeType(c, 'text')
  assert.equal(r.needsConfirm, true)
  assert.deepEqual(r.dropped, ['kichwa'])
  assert.equal(r.content.type, 'article', 'hakuna mabadiliko bila uthibitisho')
})
t('kubadilisha na uthibitisho → aina mpya, template default', () => {
  const c = createContent('article'); c.heading.text = 'Kichwa'
  const r = changeType(c, 'text', { confirmed: true })
  assert.equal(r.content.type, 'text')
  assert.equal(r.content.template.id, 'simple')
})
t('kubadilisha bila maudhui yanayopotea → hakuna confirm', () => {
  const r = changeType(createContent('text'), 'article')
  assert.equal(r.needsConfirm, false)
  assert.equal(r.content.type, 'article')
})

console.log('Muundo — contrast (WCAG AA ≥ 4.5 kwa maandishi)')
t('kila rangi ya palette inasomeka kwenye nyeupe', () => {
  for (const [k, v] of Object.entries(PALETTE)) {
    assert.ok(ratio(v.hex, '#ffffff') >= 4.5, `${k} ${ratio(v.hex, '#ffffff').toFixed(2)}`)
  }
})
t('kila rangi ya palette inasomeka kwenye kila background', () => {
  for (const [bk, bv] of Object.entries(BACKGROUNDS)) {
    if (!bv.hex) continue
    for (const [k, v] of Object.entries(PALETTE)) {
      assert.ok(ratio(v.hex, bv.hex) >= 4.5, `${k} kwenye ${bk} = ${ratio(v.hex, bv.hex).toFixed(2)}`)
    }
  }
})

console.log('Rasimu za kifaa (local, revision, owner)')
t('save → list → get → rasimu ipo na revision 1', () => {
  const st = memStore()
  const d = saveDraft('u1', { content: createContent('article') }, st)
  assert.equal(d.revision, 1)
  assert.equal(d.syncStatus, 'local')
  assert.equal(listDrafts('u1', st).length, 1)
  assert.equal(getDraft('u1', d.id, st).id, d.id)
})
t('kuhifadhi tena kwa revision sahihi → revision 2, id ileile', () => {
  const st = memStore()
  const d1 = saveDraft('u1', { content: createContent('text') }, st)
  const d2 = saveDraft('u1', { id: d1.id, revision: 1, content: createContent('text') }, st)
  assert.equal(d2.id, d1.id)
  assert.equal(d2.revision, 2)
  assert.equal(listDrafts('u1', st).length, 1, 'hakuna duplicate')
})
t('revision isiyolingana → DraftConflictError (hakuna overwrite)', () => {
  const st = memStore()
  const d1 = saveDraft('u1', { content: createContent('text') }, st)
  saveDraft('u1', { id: d1.id, revision: 1, content: createContent('text') }, st)
  assert.throws(() => saveDraft('u1', { id: d1.id, revision: 1, content: createContent('text') }, st), DraftConflictError)
})
t('rasimu ya mtumiaji mmoja haionekani kwa mwingine', () => {
  const st = memStore()
  const d = saveDraft('u1', { content: createContent('text') }, st)
  assert.equal(listDrafts('u2', st).length, 0)
  assert.equal(getDraft('u2', d.id, st), null)
})
t('bila user ID → kosa wazi, si kuhifadhi', () => {
  assert.throws(() => saveDraft(null, { content: createContent('text') }, memStore()), /Ingia/)
})
t('removeDraft inafuta rasimu ya mmiliki tu', () => {
  const st = memStore()
  const d = saveDraft('u1', { content: createContent('text') }, st)
  assert.equal(removeDraft('u2', d.id, st), false)
  assert.equal(removeDraft('u1', d.id, st), true)
  assert.equal(listDrafts('u1', st).length, 0)
})
t('storage inayoshindwa → kosa linarushwa (si success ya uongo)', () => {
  const bad = { getItem: () => null, setItem: () => { throw new Error('quota') } }
  assert.throws(() => saveDraft('u1', { content: createContent('text') }, bad), /quota/)
})

console.log(`\nPost Studio tests: ${pass} PASS, ${fail} FAIL`)
if (fail) process.exit(1)
