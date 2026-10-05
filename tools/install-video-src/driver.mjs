/* Frame stepper: renders <page>.html at fixed timeline positions and saves
 * PNG frames for ffmpeg. Usage:
 *   node driver.mjs ios frames-ios            -> all frames at 30fps
 *   node driver.mjs ios preview 860,3260,4530 -> just the listed times (ms)
 */
import { chromium } from 'playwright-core'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const here = path.dirname(fileURLToPath(import.meta.url))
const [page_, outDir, previewTimes] = process.argv.slice(2)
const FPS = 30

const browser = await chromium.launch()
const page = await browser.newPage({
  viewport: { width: 720, height: 920 },
  deviceScaleFactor: 2,
})
await page.goto('file://' + path.join(here, `${page_}.html`))
await page.waitForFunction('typeof window.setT === "function"')
await page.evaluate(() => document.fonts.ready)

const duration = await page.evaluate('window.__duration')

if (outDir === 'preview') {
  const times = previewTimes.split(',').map(Number)
  for (const t of times) {
    await page.evaluate((ms) => window.setT(ms), t)
    await page.screenshot({ path: path.join(here, `preview-${page_}-${t}.png`) })
  }
} else {
  const frames = Math.round((duration / 1000) * FPS)
  for (let i = 0; i < frames; i++) {
    const t = (i / FPS) * 1000
    await page.evaluate((ms) => window.setT(ms), t)
    await page.screenshot({
      path: path.join(here, outDir, `f${String(i).padStart(4, '0')}.png`),
    })
    if (i % 60 === 0) console.log(`frame ${i}/${frames}`)
  }
  console.log(`done: ${frames} frames`)
}
await browser.close()
