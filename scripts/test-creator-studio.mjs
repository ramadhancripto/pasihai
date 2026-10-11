// Tests za Creator Studio model: sehemu, hali, mpango, catalog, utafutaji, na kutokuwepo kwa bei bandia.
import assert from 'node:assert/strict'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  CREATE_CATALOG, FEATURES, PLANS, SECTIONS, SECTION_GROUPS, STATUS,
  catalogItemsByCategory, featureAccess, getCurrentPlan, searchSections, sectionById,
  STUDIO_NAV, STUDIO_NAV_GROUPS, searchNav,
} from '../src/studio/studioModel.js'
import { POST_TYPES } from '../src/utils/postContent.js'
import { draftTypeLabel, interactionTotal, mediaOf, postStats } from '../src/studio/studioData.js'

const here = dirname(fileURLToPath(import.meta.url))
const root = join(here, '..')

let pass = 0, fail = 0
function t(name, fn) {
  try { fn(); pass++; console.log(`  ✓ ${name}`) }
  catch (e) { fail++; console.log(`  ✗ ${name}\n    ${e.message}`) }
}

const REQUIRED = [
  'home', 'create', 'content', 'media', 'projects', 'templates', 'brand',
  'ads', 'analytics', 'audience', 'monetization', 'collab', 'premium', 'settings',
]
const VALID_STATUS = new Set(Object.keys(STATUS))

console.log('Creator Studio — model')

t('hali sita zinalingana na lebo zilizoombwa', () => {
  assert.deepEqual(
    Object.values(STATUS).map((s) => s.label),
    ['Inapatikana', 'Sehemu tu', 'Inakuja', 'Inahitaji mpango', 'Inahitaji ustahiki', 'Haijaunganishwa'],
  )
})

t('sehemu zote 14 zinazohitajika zipo', () => {
  const ids = SECTIONS.map((s) => s.id)
  for (const id of REQUIRED) assert.ok(ids.includes(id), `sehemu haipo: ${id}`)
  assert.equal(SECTIONS.length, REQUIRED.length)
})

t('ids za sehemu ni za kipekee', () => {
  const ids = SECTIONS.map((s) => s.id)
  assert.equal(new Set(ids).size, ids.length)
})

t('kila sehemu ina lebo, hali halali na kikundi halali', () => {
  for (const s of SECTIONS) {
    assert.ok(s.label && s.label.trim(), `lebo tupu: ${s.id}`)
    assert.ok(VALID_STATUS.has(s.status), `hali batili kwa ${s.id}: ${s.status}`)
    if (s.group !== null) assert.ok(SECTION_GROUPS.includes(s.group), `kikundi batili kwa ${s.id}`)
  }
})

t('sehemu ya nyumbani ipo nje ya vikundi; vikundi vyote vina sehemu', () => {
  assert.equal(sectionById('home').group, null)
  for (const g of SECTION_GROUPS) {
    assert.ok(SECTIONS.some((s) => s.group === g), `kikundi bila sehemu: ${g}`)
  }
})

t('sectionById inarudisha null kwa id isiyopo', () => {
  assert.equal(sectionById('nope'), null)
})

t('mpango wa sasa ni free', () => {
  assert.equal(getCurrentPlan(), 'free')
})

t('monetization haiwezi kufunguliwa kwenye mpango wa free', () => {
  const a = featureAccess('monetization', 'free')
  assert.equal(a.allowed, false)
  assert.equal(FEATURES.monetization.status, 'requires_eligibility')
})

t('vipengele vya premium havifunguki kwenye mpango wa free', () => {
  for (const [id, f] of Object.entries(FEATURES)) {
    if (f.tier !== 'free') assert.equal(featureAccess(id, 'free').allowed, false, `premium inafunguka bila mpango: ${id}`)
  }
})

t('vipengele vilivyopangwa / visivyounganishwa haviwezi kufunguliwa', () => {
  for (const [id, f] of Object.entries(FEATURES)) {
    if (!['available', 'partial'].includes(f.status)) {
      assert.equal(featureAccess(id, 'creator').allowed, false, `hali ${f.status} inafunguka: ${id}`)
    }
  }
})

t('kipengele cha bure kinachopatikana kinafunguka', () => {
  assert.equal(featureAccess('publish_posts', 'free').allowed, true)
  assert.equal(featureAccess('local_drafts', 'free').allowed, true)
})

t('kipengele kisichojulikana hakifunguki', () => {
  assert.equal(featureAccess('does_not_exist').allowed, false)
})

t('mpango wa creator hauna malipo: hali yake ni Haijaunganishwa', () => {
  assert.equal(PLANS.creator.status, 'not_connected')
  assert.equal(STATUS[PLANS.creator.status].label, 'Haijaunganishwa')
})

t('catalog: ids za kipekee na hali halali', () => {
  const ids = CREATE_CATALOG.map((c) => c.id)
  assert.equal(new Set(ids).size, ids.length)
  for (const c of CREATE_CATALOG) assert.ok(VALID_STATUS.has(c.status), `hali batili: ${c.id}`)
})

t('catalog: action halali; studio inatumia aina zilizopo kwenye POST_TYPES', () => {
  const actions = new Set(['studio', 'status', 'live', 'planned'])
  for (const c of CREATE_CATALOG) {
    assert.ok(actions.has(c.action), `action batili: ${c.id}`)
    if (c.action === 'studio') assert.ok(POST_TYPES[c.type], `aina haipo kwenye POST_TYPES: ${c.type}`)
    if (c.action === 'planned') assert.equal(c.status, 'planned', `iliyopangwa lakini hali ni ${c.status}: ${c.id}`)
  }
})

t('catalog: vitu vilivyopangwa ni angalau 3 na hali yake ni Inakuja', () => {
  const planned = CREATE_CATALOG.filter((c) => c.action === 'planned').map((c) => c.id)
  assert.ok(planned.length >= 3)
})

t('catalogItemsByCategory bila neno inarudisha vitu vyote', () => {
  const groups = catalogItemsByCategory('')
  const total = Object.values(groups).reduce((n, arr) => n + arr.length, 0)
  assert.equal(total, CREATE_CATALOG.length)
})

t('catalogItemsByCategory inachuja kwa neno', () => {
  const groups = catalogItemsByCategory('video')
  const labels = Object.values(groups).flat().map((c) => c.id)
  assert.ok(labels.includes('video'))
  assert.ok(!labels.includes('quote'))
  assert.deepEqual(catalogItemsByCategory('hakunaneno'), {})
})

t('searchSections: tupu kwa swali tupu, na inapata sehemu kwa lebo', () => {
  assert.deepEqual(searchSections(''), [])
  assert.equal(searchSections('analytics')[0].id, 'analytics')
  assert.equal(searchSections('monet')[0].id, 'monetization')
  assert.equal(searchSections('zzzz').length, 0)
})

t('urambazaji: sehemu 10 kwa mpangilio wa MASTER, kila kundi lina sehemu', () => {
  assert.deepEqual(STUDIO_NAV.map((x) => x.id), [
    'home', 'create', 'content', 'media', 'projects', 'templates', 'ads', 'analytics', 'business', 'settings',
  ])
  assert.deepEqual(STUDIO_NAV_GROUPS.flatMap((g) => g.items), STUDIO_NAV.map((x) => x.id))
})

t('urambazaji: kila lengo la sehemu lipo kwenye SECTIONS na sub-item zenye intent ni Create', () => {
  const ids = new Set(SECTIONS.map((x) => x.id))
  for (const top of STUDIO_NAV) {
    if (top.section) assert.ok(ids.has(top.section), `sehemu haipo: ${top.id}`)
    for (const c of top.children) {
      if (c.section) assert.ok(ids.has(c.section), `sehemu ya sub-item haipo: ${c.id}`)
      if (c.intent) assert.equal(c.section, 'create', `intent bila create: ${c.id}`)
      if (!c.section && !c.action) assert.equal(c.status, 'planned', `sub-item bila lengo lazima iwe planned: ${c.id}`)
    }
  }
})

t('urambazaji: utafutaji wa sub-items unafanya kazi na zisizo tayari hazifunguki', () => {
  assert.equal(searchNav('')?.length ?? 0, 0)
  assert.ok(searchNav('story').some((x) => x.intent === 'story'))
  assert.equal(searchNav('zzzz').length, 0)
})
t('hakuna bei au sarafu bandia kwenye msimbo wa Studio', () => {
  const dirs = [join(root, 'src/studio'), join(root, 'src/components/studio/sections'), join(root, 'src/pages')]
  const files = []
  const walk = (d) => {
    for (const name of readdirSync(d)) {
      const p = join(d, name)
      if (statSync(p).isDirectory()) walk(p)
      else if (/\.(jsx?|css)$/.test(name) && (p.includes('studio') || p.includes('Studio'))) files.push(p)
    }
  }
  for (const d of dirs) walk(d)
  assert.ok(files.length > 0)
  const price = /(TZS|TSh|USD|€|£|\$)\s?\d|\d[\d,.]*\s?(TZS|TSh|USD)\b|\/\s?mwezi|per month|\/month/i
  for (const f of files) {
    const src = readFileSync(f, 'utf8')
    assert.ok(!price.test(src), `bei/sarafu bandia kwenye ${f.replace(root + '/', '')}`)
  }
})

console.log('\nCreator Studio — helper za data')

t('postStats: thamani zisizo sahihi zinakuwa 0', () => {
  assert.deepEqual(postStats({ stats: { reactions: 3, comments: 'x', shares: null } }), { reactions: 3, comments: 0, shares: 0 })
  assert.deepEqual(postStats(null), { reactions: 0, comments: 0, shares: 0 })
})

t('interactionTotal ni jumla ya reactions, maoni na shares', () => {
  assert.equal(interactionTotal({ stats: { reactions: 2, comments: 3, shares: 4 } }), 9)
  assert.equal(interactionTotal({}), 0)
})

t('mediaOf: chapisho lisilo na media linarudisha null; picha na video zinatambulika', () => {
  assert.equal(mediaOf({ text: 'x' }), null)
  assert.equal(mediaOf({ kind: 'photo', media: { url: 'https://x/y.jpg', mediaType: 'image' } }).kind, 'image')
  assert.equal(mediaOf({ kind: 'reel', media: { url: 'https://x/y.mp4', mediaType: 'video' } }).kind, 'video')
})

t('draftTypeLabel: aina zote za POST_TYPES zina lebo ya Kiswahili; aina isiyojulikana ina chaguo-msingi', () => {
  for (const k of Object.keys(POST_TYPES)) assert.equal(draftTypeLabel(k), POST_TYPES[k].label)
  assert.equal(draftTypeLabel('article'), 'Makala')
  assert.equal(draftTypeLabel('nope'), 'Rasimu')
})

console.log(`\n${pass} PASS, ${fail} FAIL`)
if (fail) process.exit(1)
