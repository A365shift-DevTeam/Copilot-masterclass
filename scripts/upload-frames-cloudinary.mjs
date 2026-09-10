/**
 * Uploads the scroll-sequence frames to Cloudinary with predictable public IDs.
 *
 * `unique_filename: false` is the whole point of this script: it stops
 * Cloudinary appending a random suffix, so `frame_0042.webp` lands at the
 * public ID `ticket-frames/frame_0042` and the client can build every URL from
 * an index alone. `overwrite: true` makes re-runs idempotent.
 *
 *   npm i -D cloudinary
 *   node scripts/upload-frames-cloudinary.mjs            # both sequences
 *   node scripts/upload-frames-cloudinary.mjs ticket     # one sequence
 *
 * Credentials come from .env.local (git-ignored):
 *   CLOUDINARY_CLOUD_NAME=dghhdz3et
 *   CLOUDINARY_API_KEY=...
 *   CLOUDINARY_API_SECRET=...
 */
import fs from 'fs'
import path from 'path'
import { v2 as cloudinary } from 'cloudinary'

// Minimal .env.local reader so the script needs no dotenv dependency.
const envPath = path.resolve('.env.local')
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/)
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '')
  }
}

const { CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET } = process.env

if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
  console.error(
    'Missing credentials. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and\n' +
      'CLOUDINARY_API_SECRET in .env.local or the environment.'
  )
  process.exit(1)
}

cloudinary.config({
  cloud_name: CLOUDINARY_CLOUD_NAME,
  api_key: CLOUDINARY_API_KEY,
  api_secret: CLOUDINARY_API_SECRET,
  secure: true,
})

const SEQUENCES = {
  ticket: { dir: 'public/frames/ticket-scroll', folder: 'ticket-frames' },
  seat: { dir: 'public/frames/seat-scroll', folder: 'seat-frames' },
}

const CONCURRENCY = 6

const requested = process.argv.slice(2).filter((a) => a in SEQUENCES)
const targets = requested.length ? requested : Object.keys(SEQUENCES)

async function uploadSequence(name) {
  const { dir, folder } = SEQUENCES[name]
  const inputDir = path.resolve(dir)

  if (!fs.existsSync(inputDir)) {
    console.error(`Skipping "${name}": ${dir} does not exist.`)
    return
  }

  const files = fs
    .readdirSync(inputDir)
    .filter((f) => f.toLowerCase().endsWith('.webp'))
    .sort()

  console.log(`\n[${name}] uploading ${files.length} frames to "${folder}/"...`)

  let done = 0
  let failed = 0
  let cursor = 0

  const worker = async () => {
    while (cursor < files.length) {
      const file = files[cursor++]
      const publicId = path.parse(file).name // frame_0001
      try {
        await cloudinary.uploader.upload(path.join(inputDir, file), {
          folder,
          public_id: publicId,
          use_filename: false,
          unique_filename: false,
          overwrite: true,
          invalidate: true,
          resource_type: 'image',
        })
      } catch (err) {
        failed++
        console.error(`  failed ${file}: ${err.message}`)
        continue
      }
      done++
      if (done % 20 === 0 || done + failed === files.length) {
        console.log(`  ${done}/${files.length} uploaded`)
      }
    }
  }

  await Promise.all(Array.from({ length: CONCURRENCY }, worker))

  console.log(`[${name}] done. ${done} uploaded, ${failed} failed.`)
  if (done > 0) {
    console.log(
      `  verify: https://res.cloudinary.com/${CLOUDINARY_CLOUD_NAME}` +
        `/image/upload/f_auto,q_auto:good,c_limit,w_1280/${folder}/frame_0001`
    )
  }
}

for (const name of targets) {
  await uploadSequence(name)
}
