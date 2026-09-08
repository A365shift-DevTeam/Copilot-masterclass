import fs from 'fs'
import path from 'path'
import sharp from 'sharp'

const inputDir = path.resolve('public/Ticket frames')
const outputDirFrames = path.resolve('public/frames/ticket-scroll')

if (!fs.existsSync(outputDirFrames)) {
  fs.mkdirSync(outputDirFrames, { recursive: true })
}

const files = fs.readdirSync(inputDir)
  .filter(f => f.toLowerCase().endsWith('.jpg') || f.toLowerCase().endsWith('.jpeg'))
  .sort()

console.log(`Found ${files.length} frames to convert in ${inputDir}...`)

async function convertAll() {
  const startTime = Date.now()
  let processed = 0

  for (let i = 0; i < files.length; i++) {
    const file = files[i]
    const inputPath = path.join(inputDir, file)
    
    // Output format 1: public/frames/ticket-scroll/frame_0001.webp ... frame_0107.webp
    const frameNumber = String(i + 1).padStart(4, '0')
    const outFileNameFrames = `frame_${frameNumber}.webp`
    const outputPathFrames = path.join(outputDirFrames, outFileNameFrames)

    // Output format 2: public/Ticket frames/00000001.webp ...
    const baseName = path.parse(file).name
    const outputPathSameDir = path.join(inputDir, `${baseName}.webp`)

    // Convert at 1920 width, maintaining 16:9 ratio (1920x1080), high quality WebP
    const webpBuffer = await sharp(inputPath)
      .resize({ width: 1920, withoutEnlargement: true })
      .webp({ quality: 85, effort: 4 })
      .toBuffer()

    fs.writeFileSync(outputPathFrames, webpBuffer)
    fs.writeFileSync(outputPathSameDir, webpBuffer)

    processed++
    if (processed % 20 === 0 || processed === files.length) {
      console.log(`Processed ${processed}/${files.length} frames...`)
    }
  }

  const duration = ((Date.now() - startTime) / 1000).toFixed(1)
  console.log(`Conversion complete! Processed ${processed} frames in ${duration}s.`)
}

convertAll().catch(err => {
  console.error('Error during conversion:', err)
  process.exit(1)
})
