/*
 * Right-sized WebP copies of the page's static images, for PageSpeed.
 * The originals stay in public/assets (og-cover, schema logo and old links
 * still point at them); the page itself uses the files written here.
 *
 *   node scripts/optimize-images.mjs
 *
 * Each width is about twice the largest size the image is shown at, for
 * high-density screens.
 */
import sharp from 'sharp'

const dir = 'public/assets'

const jobs = [
  // Nav (30px tall) and footer (26px) logo.
  { src: 'logo-horizontal.png', out: 'logo-horizontal.webp', height: 64 },
  // The ₹499 bot (50px) and the trainer popup avatar (36px).
  { src: 'ambot-bot.png', out: 'ambot-bot.webp', width: 128 },
  // Ticket badge logo (34px).
  { src: 'logo-icon.png', out: 'logo-icon.webp', width: 96 },
  // Speaker section photo (up to ~420px wide).
  { src: 'fonunder.jpeg', out: 'fonunder-800.webp', width: 800 },
  // Hero chip (56px) and trainer popup header (76px).
  { src: 'fonunder.jpeg', out: 'fonunder-200.webp', width: 200 },
]

for (const { src, out, width, height } of jobs) {
  const info = await sharp(`${dir}/${src}`)
    .resize({ width, height, withoutEnlargement: true })
    .webp({ quality: 82, effort: 6 })
    .toFile(`${dir}/${out}`)
  console.log(`${out}: ${info.width}x${info.height}, ${(info.size / 1024).toFixed(1)} KB`)
}

// Favicons: the 154KB logo-icon.png was being fetched as the tab icon.
for (const size of [48, 180]) {
  const info = await sharp(`${dir}/logo-icon.png`)
    .resize({ width: size, height: size, fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png({ compressionLevel: 9, palette: true })
    .toFile(`${dir}/icon-${size}.png`)
  console.log(`icon-${size}.png: ${(info.size / 1024).toFixed(1)} KB`)
}
