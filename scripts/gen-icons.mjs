// Gera os ícones PNG do PWA a partir do SVG (usa o Chromium do Playwright).
import { chromium } from 'playwright'
import { readFileSync } from 'node:fs'
const svg = readFileSync('public/icons/icon.svg', 'utf8')
const maskable = svg.replace('rx="112"', 'rx="0"').replace(/r="170"/, 'r="140"').replace(/r="108"/, 'r="90"').replace(/r="50"/, 'r="42"')
const b = await chromium.launch()
const p = await b.newPage()
for (const [name, size, src] of [['icon-192', 192, svg], ['icon-512', 512, svg], ['apple-touch-icon', 180, maskable], ['icon-maskable-512', 512, maskable]]) {
  await p.setViewportSize({ width: size, height: size })
  await p.setContent(`<style>*{margin:0}svg{width:${size}px;height:${size}px;display:block}</style>${src}`)
  await p.screenshot({ path: `public/icons/${name}.png`, omitBackground: true })
}
await b.close()
