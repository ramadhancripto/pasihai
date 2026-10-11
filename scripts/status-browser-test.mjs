// Status-only browser regression test. Uses controlled Playwright file inputs
// (not a native OS chooser) and a temporary in-page fixture for Story viewer UI.
// It never posts fake Status data or contacts Supabase.
import { chromium } from 'playwright'

const BASE = process.env.BASE || 'http://127.0.0.1:5173'
const videoFixturePath = '/tmp/pasihai-flower.webm'
const browser = await chromium.launch({ headless: true })
const context = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: 'sw-TZ' })
const page = await context.newPage()
const failures = []
const checks = []

function check(condition, label, detail = '') {
  checks.push({ condition: Boolean(condition), label, detail })
  if (!condition) failures.push(`${label}${detail ? ` — ${detail}` : ''}`)
}

try {
  await page.goto(BASE, { waitUntil: 'domcontentloaded' })
  await page.locator('.psh-status__row').waitFor({ state: 'visible', timeout: 15000 })
  await page.locator('.psh-status__empty-note').waitFor({ state: 'visible', timeout: 10000 })

  let ownCount = await page.locator('.psh-status__item[data-status-own="true"]').count()
  check(ownCount === 1, 'Home ina own Status entry moja tu', `${ownCount}`)
  check((await page.locator('.psh-status__item:not(.psh-status__item--more)').count()) === 1,
    'Home haina mock Status za watu wengine', 'slot moja ya kuunda, bila status za demo')
  check((await page.locator('.psh-status__empty-note').innerText()).includes('Hakuna status hai'),
    'Empty state ya Status iko wazi')

  await page.getByRole('button', { name: 'Unda status yako' }).click()
  await page.locator('.psh-sheet__title').getByText('Status yangu').waitFor({ timeout: 5000 })
  const imageAccept = await page.locator('#psh-status-image-file').getAttribute('accept')
  const videoAccept = await page.locator('#psh-status-video-file').getAttribute('accept')
  check(imageAccept === 'image/jpeg,image/png,image/webp,image/gif', 'Picker ya picha ina MIME types sahihi', imageAccept)
  check(videoAccept === 'video/mp4,video/webm,video/quicktime', 'Picker ya video ina MIME types sahihi', videoAccept)

  await page.locator('.psh-compose__input').fill('QA text-only status')
  await page.getByRole('button', { name: 'Chapisha status' }).click()
  await page.locator('.psh-status-feedback--error').getByText('VITE_SUPABASE_MODE=live').waitFor({ timeout: 5000 })
  check((await page.locator('.psh-sheet').count()) === 1, 'Text-only Status haifungi composer kwa mafanikio ya uongo')
  check((await page.locator('.psh-toast').count()) === 0, 'Text-only Status haionyeshi toast ya mafanikio')

  const png = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=',
    'base64',
  )
  await page.locator('#psh-status-image-file').setInputFiles({ name: 'qa-status.png', mimeType: 'image/png', buffer: png })
  await page.locator('.psh-status-media__preview img').waitFor({ state: 'visible', timeout: 5000 })
  check((await page.locator('.psh-status-media__fileline').innerText()).includes('qa-status.png'),
    'Picha ina-preview na jina la faili')
  check((await page.locator('.psh-status-media__preview img').getAttribute('src')).startsWith('blob:'),
    'Preview ya picha ni object URL ya faili iliyochaguliwa')
  await page.getByRole('button', { name: 'Chapisha status' }).click()
  await page.locator('.psh-status-feedback--error').getByText('Hakuna Status iliyohifadhiwa').waitFor({ timeout: 5000 })
  check((await page.locator('.psh-status-media__preview img').count()) === 1,
    'Jaribio la kuhifadhi picha bila backend linaacha preview na kuonyesha kosa')

  await page.locator('#psh-status-video-file').setInputFiles(videoFixturePath)
  await page.locator('.psh-status-media__preview video').waitFor({ state: 'visible', timeout: 5000 })
  check((await page.locator('.psh-status-media__fileline').innerText()).includes('pasihai-flower.webm'),
    'Kubadilisha picha kuwa video kunasasisha preview')
  check((await page.locator('.psh-status-media__preview video').getAttribute('src')).startsWith('blob:'),
    'Preview ya video ni object URL ya faili iliyochaguliwa')
  await page.getByRole('button', { name: 'Chapisha status' }).click()
  await page.locator('.psh-status-feedback--error').getByText('Hakuna Status iliyohifadhiwa').waitFor({ timeout: 5000 })
  check((await page.locator('.psh-toast').count()) === 0, 'Video Status haionyeshi toast ya mafanikio bila backend')

  const videoSrc = await page.locator('.psh-status-media__preview video').getAttribute('src')
  const imageDataUrl = `data:image/png;base64,${png.toString('base64')}`
  const viewerMountResult = await page.evaluate(async ({ imageDataUrl, videoSrc }) => {
    const { mountStatusViewerFixture } = await import('/scripts/status-viewer-harness.jsx')
    const now = Date.now()
    const user = { id: 'qa-status-user', name: 'QA Story', handle: '@qa-story', type: 'friend', avatarTone: 'blue' }
    const common = {
      userId: user.id,
      user,
      own: false,
      createdAt: new Date(now - 2 * 60_000).toISOString(),
      ago: 'dakika 2 zilizopita',
      expiresAt: new Date(now + 60 * 60_000).toISOString(),
      expiresAtLabel: 'baadaye leo',
    }
    const group = {
      id: `status-group:${user.id}`,
      userId: user.id,
      user,
      own: false,
      statuses: [
        { ...common, id: 'qa-text-story', text: 'QA text-only ndani ya Story viewer.', tone: 'plum', mediaType: null, mediaUrl: null },
        { ...common, id: 'qa-image-story', text: 'Maelezo juu ya picha ya QA.', tone: 'blue', mediaType: 'image', mediaUrl: imageDataUrl },
        { ...common, id: 'qa-video-story', text: 'Maelezo juu ya video ya QA.', tone: 'green', mediaType: 'video', mediaUrl: videoSrc },
      ],
    }
    return mountStatusViewerFixture(group)
  }, { imageDataUrl, videoSrc })
  check(viewerMountResult === true, 'Story viewer component imewekwa kwenye browser fixture')

  await page.locator('.psh-status-viewer__stage').waitFor({ state: 'visible', timeout: 10000 })
  check((await page.locator('.psh-status-story__caption').innerText()).includes('QA text-only'),
    'Text-only Status inaonekana ndani ya Story viewer')
  check((await page.locator('.psh-status-viewer__meta').innerText()).includes('Inaisha baadaye leo'),
    'Viewer inaonyesha muda wa kuisha wa Status')
  check((await page.locator('.psh-status-viewer__comments').innerText()).includes('hayapatikani kwa sasa'),
    'Viewer inaeleza wazi kuwa comments hazitekelezwi')
  check((await page.locator('.psh-status-viewer__comments').locator('..').locator('.psh-cmts__list').count()) === 0,
    'Viewer haina sample comments')

  await page.getByRole('button', { name: 'Ifuatayo ›' }).click()
  const imageStory = page.locator('.psh-status-story__media')
  await imageStory.waitFor({ state: 'visible', timeout: 5000 })
  check(await imageStory.evaluate((el) => el.tagName === 'IMG'), 'Story navigation inafungua picha')
  check((await page.locator('.psh-status-story__caption').innerText()).includes('picha ya QA'),
    'Story navigation inafungua image na caption yake')
  await page.getByRole('button', { name: 'Ifuatayo ›' }).click()
  const videoStory = page.locator('.psh-status-story__media')
  await videoStory.waitFor({ state: 'visible', timeout: 5000 })
  check(await videoStory.evaluate((el) => el.tagName === 'VIDEO'), 'Story navigation inafungua video')
  check((await page.locator('.psh-status-story__caption').innerText()).includes('video ya QA'),
    'Video Story ina caption ndani ya viewer')
  await page.getByRole('button', { name: '‹ Iliyotangulia' }).click()
  check(await page.locator('.psh-status-story__media').evaluate((el) => el.tagName === 'IMG'),
    'Urambazaji wa kurudi nyuma unafungua Status iliyotangulia')

  const stageBox = await page.locator('.psh-status-viewer__stage').boundingBox()
  const viewport = page.viewportSize()
  const viewportCheck = stageBox && viewport
    && stageBox.x >= 0 && stageBox.y >= 0
    && stageBox.x + stageBox.width <= viewport.width + 1
    && stageBox.y + stageBox.height <= viewport.height + 1
  check(Boolean(viewportCheck), 'Story stage inatoshea viewport ya simu', JSON.stringify({ stageBox, viewport }))
  const pageWidth = await page.evaluate(() => ({ width: document.documentElement.scrollWidth, client: document.documentElement.clientWidth }))
  check(pageWidth.width <= pageWidth.client + 1, 'Story viewer haina horizontal overflow', JSON.stringify(pageWidth))

  await page.evaluate(async () => {
    const { unmountStatusViewerFixture } = await import('/scripts/status-viewer-harness.jsx')
    unmountStatusViewerFixture()
  })
  await page.getByRole('button', { name: 'Ondoa' }).click()
  check((await page.locator('.psh-status-media__preview').count()) === 0, 'Kitufe cha Ondoa kinafuta preview')
  await page.keyboard.press('Escape')
  await page.locator('.psh-status__row').waitFor({ state: 'visible', timeout: 5000 })
  check((await page.locator('.psh-status__item[data-status-own="true"]').count()) === 1,
    'Kurudi Home hakuongezi own Status entry')

  await page.locator('.psh-status__item--more button').click()
  await page.locator('.psh-sheet__title').getByText('Status zote').waitFor({ timeout: 5000 })
  check((await page.locator('.psh-statusall__empty').innerText()).includes('Hakuna Status'),
    'Status zote zina empty state bila mock')
  await page.keyboard.press('Escape')
  await page.reload({ waitUntil: 'domcontentloaded' })
  await page.locator('.psh-status__row').waitFor({ state: 'visible', timeout: 15000 })
  await page.locator('.psh-status__empty-note').waitFor({ state: 'visible', timeout: 10000 })
  ownCount = await page.locator('.psh-status__item[data-status-own="true"]').count()
  check(ownCount === 1, 'Baada ya refresh, own Status entry bado ni moja', `${ownCount}`)
  check((await page.locator('.psh-status__item:not(.psh-status__item--more)').count()) === 1,
    'Refresh hairudishi mock Status')

  console.log(`Status browser QA: ${checks.filter((item) => item.condition).length}/${checks.length} passed`)
  for (const item of checks) console.log(`${item.condition ? 'PASS' : 'FAIL'} ${item.label}${item.detail ? ` — ${item.detail}` : ''}`)
  if (failures.length) throw new Error(failures.join('\n'))
} finally {
  await browser.close()
}
