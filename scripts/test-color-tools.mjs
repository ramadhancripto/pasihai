// Tests za kundi G (Rangi): ubadilishaji HEX/RGB/HSL na hali za rejista. Hazihitaji browser.
import assert from 'node:assert/strict'
import { hexToRgb, rgbToHex, rgbToHsl, hslToRgb, hslToHex, hexToHsl } from '../src/creative/colorConvert.js'
import { findTool } from '../src/creative/toolRegistry.js'

let pass = 0
function ok(label, fn) {
  fn()
  pass += 1
  console.log(`✓ ${label}`)
}

ok('hexToRgb: #rrggbb, #rgb, bila #, herufi kubwa', () => {
  assert.deepEqual(hexToRgb('#ff8000'), { r: 255, g: 128, b: 0 })
  assert.deepEqual(hexToRgb('0f0'), { r: 0, g: 255, b: 0 })
  assert.deepEqual(hexToRgb('#ABCDEF'), { r: 171, g: 205, b: 239 })
})

ok('hexToRgb: HEX batili inarudisha null', () => {
  for (const bad of ['', '#12', '#gggggg', 'red', null, undefined, 12345]) {
    assert.equal(hexToRgb(bad), null, String(bad))
  }
})

ok('rgbToHex: inabana 0–255 na inatoa herufi ndogo zenye sufuri', () => {
  assert.equal(rgbToHex(255, 0, 0), '#ff0000')
  assert.equal(rgbToHex(-5, 300, 8), '#00ff08')
  assert.equal(rgbToHex(1.6, 0, 0), '#020000')
})

ok('rgbToHsl: rangi za kawaida zina thamani sahihi', () => {
  assert.deepEqual(rgbToHsl(255, 0, 0), { h: 0, s: 100, l: 50 })
  assert.deepEqual(rgbToHsl(0, 255, 0), { h: 120, s: 100, l: 50 })
  assert.deepEqual(rgbToHsl(0, 0, 255), { h: 240, s: 100, l: 50 })
  assert.deepEqual(rgbToHsl(128, 128, 128), { h: 0, s: 0, l: 50 })
  assert.deepEqual(rgbToHsl(255, 255, 255), { h: 0, s: 0, l: 100 })
})

ok('hslToRgb: inarudi rangi za kawaida, na s=0 inatoa kijivu', () => {
  assert.deepEqual(hslToRgb(120, 100, 50), { r: 0, g: 255, b: 0 })
  assert.deepEqual(hslToRgb(0, 0, 50), { r: 128, g: 128, b: 128 })
  assert.equal(hslToHex(240, 100, 50), '#0000ff')
  assert.equal(hslToHex(360, 100, 50), '#ff0000', 'h=360 sawa na 0')
})

ok('HSL → HEX → HSL inarudi thamani karibu (hue ina maana kwa s>=25 na l 30–70)', () => {
  for (let h = 0; h < 360; h += 37) {
    for (let s = 25; s <= 100; s += 25) {
      for (let l = 30; l <= 70; l += 10) {
        const back = hexToHsl(hslToHex(h, s, l))
        const dh = Math.min(Math.abs(back.h - h), 360 - Math.abs(back.h - h))
        assert.ok(dh <= 2, `h ${h}/${s}/${l} → ${back.h}`)
        assert.ok(Math.abs(back.s - s) <= 2, `s ${h}/${s}/${l} → ${back.s}`)
        assert.ok(Math.abs(back.l - l) <= 1, `l ${h}/${s}/${l} → ${back.l}`)
      }
    }
  }
})

ok('HSL kijivu (s=0) hakina hue, na mwangaza unabaki', () => {
  for (const l of [0, 25, 50, 75, 100]) {
    const back = hexToHsl(hslToHex(200, 0, l))
    assert.equal(back.s, 0)
    assert.ok(Math.abs(back.l - l) <= 1, `l ${l} → ${back.l}`)
  }
})

ok('RGB → HEX → RGB inarudi thamani zile zile kwa rangi zote za mfano', () => {
  for (const [r, g, b] of [[0, 0, 0], [255, 255, 255], [18, 52, 86], [200, 10, 99]]) {
    assert.deepEqual(hexToRgb(rgbToHex(r, g, b)), { r, g, b })
  }
})

ok('hexToHsl: HEX batili inarudi null (haibadilishi mradi)', () => {
  assert.equal(hexToHsl('nope'), null)
})

ok('rejista: rangi za HEX, za hivi karibuni na RGB/HSL ni ready na zinafungua kundi G', () => {
  for (const id of ['color.hex', 'color.recent', 'color.rgb']) {
    const t = findTool(id)
    assert.ok(t, id)
    assert.equal(t.group, 'G', id)
    assert.equal(t.status, 'ready', id)
    assert.ok(t.action && t.action.startsWith('color.'), id)
  }
})

ok('rejista: palette, brand colours, nakili/bandika mtindo bado ni planned (bila action)', () => {
  for (const id of ['color.palette', 'color.brand', 'style.copy', 'style.paste']) {
    const t = findTool(id)
    assert.equal(t.status, 'planned', id)
    assert.equal(t.action, undefined, id)
  }
})

console.log(`\nMajaribio ya rangi: ${pass} PASS`)
