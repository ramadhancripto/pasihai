// ══════════════════════════════════════════════════════════════
// PASIHAI — PROOF SHEET (kabla/baada)
//
// Matumizi: node scripts/feed-proof-sheet.mjs
//   Inahitaji docs/shots/media-before/* na docs/shots/media-after/*
//   (zinazalishwa na scripts/feed-media-shots.mjs)
//
// Hutengeneza picha MOJA yenye safu za kulinganisha: reel · video ·
// engagement rail (light + dark, simu + desktop).
// ══════════════════════════════════════════════════════════════

import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const here = dirname(fileURLToPath(import.meta.url))
const py = join(here, 'feed-proof-sheet.py')
execFileSync('python3', [py], { stdio: 'inherit', cwd: join(here, '..') })
