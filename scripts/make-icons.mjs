// Gera os ícones do aplicativo desktop a partir do logo (SVG):
//   build/icon.ico  — Windows (16 a 256 px, PNG embutido)
//   build/icon.png  — 512 px
//   electron/icon.png — 256 px (ícone da janela e da barra de tarefas)
// Uso: node scripts/make-icons.mjs  (requer o Chromium do Playwright)
import { writeFileSync } from 'node:fs'
import { chromium } from '@playwright/test'

const svg = (size) => `<!doctype html><html><body style="margin:0;background:transparent">
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 32 32">
  <rect x="1" y="1" width="30" height="30" rx="7.5" fill="#111113"/>
  <path d="M10.5 21.5v-11l11 11v-11" fill="none" stroke="#fff" stroke-width="2.7" stroke-linecap="round" stroke-linejoin="round"/>
</svg></body></html>`

const sizes = [16, 24, 32, 48, 64, 128, 256]
const browser = await chromium.launch()
const page = await browser.newPage()
async function render(size) {
  await page.setViewportSize({ width: size, height: size })
  await page.setContent(svg(size))
  return page.locator('svg').screenshot({ omitBackground: true })
}
const pngs = []
for (const s of sizes) pngs.push(await render(s))
writeFileSync('build/icon.png', await render(512))
writeFileSync('electron/icon.png', pngs[sizes.indexOf(256)])
await browser.close()

// ICO com imagens PNG embutidas (suportado desde o Windows Vista).
const header = Buffer.alloc(6)
header.writeUInt16LE(0, 0)
header.writeUInt16LE(1, 2)
header.writeUInt16LE(sizes.length, 4)
let offset = 6 + 16 * sizes.length
const entries = sizes.map((s, i) => {
  const e = Buffer.alloc(16)
  e.writeUInt8(s >= 256 ? 0 : s, 0)
  e.writeUInt8(s >= 256 ? 0 : s, 1)
  e.writeUInt8(0, 2)
  e.writeUInt8(0, 3)
  e.writeUInt16LE(1, 4)
  e.writeUInt16LE(32, 6)
  e.writeUInt32LE(pngs[i].length, 8)
  e.writeUInt32LE(offset, 12)
  offset += pngs[i].length
  return e
})
writeFileSync('build/icon.ico', Buffer.concat([header, ...entries, ...pngs]))
console.log('ícones gerados:', sizes.join(', '), '+ 512')
