// scripts/compress-assets.mjs
// ESM, Node.js only — called by package.json "prebuild" hook
import { NodeIO } from '@gltf-transform/core'
import { KHRDracoMeshCompression } from '@gltf-transform/extensions'
import { draco, prune, dedup } from '@gltf-transform/functions'
import draco3d from 'draco3dgltf'
import { statSync, mkdirSync, readdirSync, copyFileSync } from 'node:fs'
import path from 'node:path'

const RAW_DIR = 'public/assets/raw'
const OUT_DIR = 'public/assets/out'
mkdirSync(OUT_DIR, { recursive: true })

const io = new NodeIO()
  .registerExtensions([KHRDracoMeshCompression])
  .registerDependencies({
    'draco3d.encoder': await draco3d.createEncoderModule(),
    'draco3d.decoder': await draco3d.createDecoderModule(),
  })

const files = readdirSync(RAW_DIR).filter((f) => f.endsWith('.glb'))

for (const filename of files) {
  const inFile = path.join(RAW_DIR, filename)
  const outFile = path.join(OUT_DIR, filename)
  const before = statSync(inFile).size
  try {
    const document = await io.read(inFile)
    await document.transform(prune(), dedup(), draco({ method: 'edgebreaker' }))
    await io.write(outFile, document)
    const after = statSync(outFile).size
    const pct = ((1 - after / before) * 100).toFixed(1)
    console.log(`[compress] ${filename}: ${before}B → ${after}B (−${pct}%)`)
  } catch (err) {
    console.warn(`[compress] WARN: compression failed for ${filename}, copying raw: ${err.message}`)
    copyFileSync(inFile, outFile)
    const after = statSync(outFile).size
    console.log(`[compress] ${filename}: ${before}B → ${after}B (copied, no reduction)`)
  }
}
