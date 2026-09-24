// Gera build/splash.bmp — imagem exibida enquanto o NEXORA-Portatil.exe se prepara.
// Uso: node scripts/make-splash.mjs  (requer o Chromium do Playwright)
import { writeFileSync } from 'node:fs'
import { chromium } from '@playwright/test'

const W = 480
const H = 280
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: W, height: H } })
await page.setContent(`<!doctype html><html><body style="margin:0">
<canvas id="c" width="${W}" height="${H}"></canvas>
<script>
  const c = document.getElementById('c').getContext('2d')
  c.fillStyle = '#f6f6f4'; c.fillRect(0, 0, ${W}, ${H})
  c.fillStyle = '#ffffff'; c.strokeStyle = 'rgba(11,11,12,0.10)'; c.lineWidth = 1
  c.beginPath(); c.roundRect(0.5, 0.5, ${W - 1}, ${H - 1}, 0); c.stroke()
  c.save(); c.translate(${W / 2 - 28}, 70)
  c.fillStyle = '#111113'; c.beginPath(); c.roundRect(0, 0, 56, 56, 14); c.fill()
  c.strokeStyle = '#fff'; c.lineWidth = 4.7; c.lineCap = 'round'; c.lineJoin = 'round'
  c.beginPath(); c.moveTo(18.4, 37.6); c.lineTo(18.4, 18.4); c.lineTo(37.6, 37.6); c.lineTo(37.6, 18.4); c.stroke(); c.restore()
  c.textAlign = 'center'; c.fillStyle = '#0b0b0c'
  c.font = '600 26px system-ui, sans-serif'; c.letterSpacing = '6px'; c.fillText('NEXORA', ${W / 2 + 3}, 166)
  c.letterSpacing = '0px'; c.fillStyle = '#85847e'; c.font = '14px system-ui, sans-serif'
  c.fillText('Abrindo o sistema de gestão…', ${W / 2}, 196)
  c.fillStyle = '#52514e'; c.font = '500 13px system-ui, sans-serif'
  c.fillText('Criado Por Pedro Lucas!', ${W / 2}, 250)
</script></body></html>`)
const rgba = await page.evaluate(() =>
  Array.from(document.getElementById('c').getContext('2d').getImageData(0, 0, 480, 280).data),
)
await browser.close()

// BMP 24 bits, linhas de baixo para cima, alinhadas em 4 bytes.
const rowSize = Math.ceil((W * 3) / 4) * 4
const data = Buffer.alloc(rowSize * H)
for (let y = 0; y < H; y++) {
  for (let x = 0; x < W; x++) {
    const i = (y * W + x) * 4
    const o = (H - 1 - y) * rowSize + x * 3
    data[o] = rgba[i + 2]
    data[o + 1] = rgba[i + 1]
    data[o + 2] = rgba[i]
  }
}
const header = Buffer.alloc(54)
header.write('BM', 0)
header.writeUInt32LE(54 + data.length, 2)
header.writeUInt32LE(54, 10)
header.writeUInt32LE(40, 14)
header.writeInt32LE(W, 18)
header.writeInt32LE(H, 22)
header.writeUInt16LE(1, 26)
header.writeUInt16LE(24, 28)
header.writeUInt32LE(data.length, 34)
header.writeInt32LE(2835, 38)
header.writeInt32LE(2835, 42)
writeFileSync('build/splash.bmp', Buffer.concat([header, data]))
console.log('build/splash.bmp gerado')
