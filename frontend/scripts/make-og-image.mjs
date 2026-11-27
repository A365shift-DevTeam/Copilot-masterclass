/**
 * Builds the 1200x630 social preview card at public/assets/og-cover.png.
 *
 * Run it whenever the title, the logo or the circuit art changes:
 *   node scripts/make-og-image.mjs
 *
 * The card is composed rather than exported from the page because the crawlers
 * that read og:image (LinkedIn, WhatsApp, Slack) never run the site's JS, so
 * the preview has to exist as a flat file in the build.
 */
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import sharp from 'sharp'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const asset = (name) => path.join(root, 'public', 'assets', name)

const WIDTH = 1200
const HEIGHT = 630

// Dark theme ground (--page-bg) so the card matches the page it opens.
const GROUND = '#0A0F1D'
const NAVY = '#002060'
const GREEN = '#3FC073'
const TEAL = '#308BAF'

const escape = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

const TITLE_LINES = ['Microsoft 365 Copilot', 'Masterclass']
const KICKER = 'LIVE ONLINE SESSION'
const SUB = 'Use Copilot across M365 · Build agents · Prompt better'

const backdrop = Buffer.from(`
<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}">
  <defs>
    <linearGradient id="ground" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${GROUND}"/>
      <stop offset="60%" stop-color="#0C1426"/>
      <stop offset="100%" stop-color="${NAVY}"/>
    </linearGradient>
    <linearGradient id="rule" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="${TEAL}"/>
      <stop offset="100%" stop-color="${GREEN}"/>
    </linearGradient>
  </defs>
  <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#ground)"/>
  <rect width="${WIDTH}" height="8" fill="url(#rule)"/>
</svg>`)

const type = Buffer.from(`
<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}">
  <style>
    .kicker { font: 700 24px 'Poppins','Segoe UI',sans-serif; letter-spacing: 6px; fill: ${GREEN}; }
    .title  { font: 800 76px 'Poppins','Segoe UI',sans-serif; fill: #FFFFFF; }
    .sub    { font: 500 27px 'Segoe UI',sans-serif; fill: #9AA4B6; }
  </style>
  <text class="kicker" x="80" y="232">${escape(KICKER)}</text>
  <text class="title" x="80" y="330">${escape(TITLE_LINES[0])}</text>
  <text class="title" x="80" y="418">${escape(TITLE_LINES[1])}</text>
  <text class="sub" x="80" y="486">${escape(SUB)}</text>
</svg>`)

const logo = await sharp(asset('logo-horizontal.png')).resize({ width: 300 }).toBuffer()
// The circuit art is decoration, so it sits low-contrast in the right margin.
const circuit = await sharp(asset('illustration-circuit-large.png'))
  .resize({ width: 400 })
  .composite([{ input: Buffer.from([0, 0, 0, 190]), raw: { width: 1, height: 1, channels: 4 }, tile: true, blend: 'dest-in' }])
  .toBuffer()

await sharp(backdrop)
  .composite([
    { input: circuit, top: 316, left: 800 },
    { input: type, top: 0, left: 0 },
    { input: logo, top: 74, left: 80 },
  ])
  .png()
  .toFile(asset('og-cover.png'))

const out = await sharp(asset('og-cover.png')).metadata()
console.log(`og-cover.png written: ${out.width}x${out.height}`)
