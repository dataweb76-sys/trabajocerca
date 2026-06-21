const puppeteer = require('puppeteer')
const path = require('path')
const fs = require('fs')
const http = require('http')

const PORT = 7099
const OUT = 'C:\\Users\\dataw\\Desktop\\Posts Instagram Semana 1'
const POSTS = [
  { file: 'post-ig-dia1.svg', out: 'Dia01 - Plomero.png' },
  { file: 'post-ig-dia2.svg', out: 'Dia02 - Electricista profesionales.png' },
  { file: 'post-ig-dia3.svg', out: 'Dia03 - LocalWeb comercios.png' },
  { file: 'post-ig-dia4.svg', out: 'Dia04 - Tip 3 presupuestos.png' },
  { file: 'post-ig-dia5.svg', out: 'Dia05 - Top 5 oficios.png' },
  { file: 'post-ig-dia6.svg', out: 'Dia06 - Gasista habilitado.png' },
  { file: 'post-ig-dia7.svg', out: 'Dia07 - Somos gratis.png' },
]

const server = http.createServer((req, res) => {
  const file = path.join(__dirname, req.url.split('?')[0].substring(1))
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404); res.end(); return }
    res.writeHead(200, { 'Content-Type': 'image/svg+xml' })
    res.end(data)
  })
}).listen(PORT)

;(async () => {
  const browser = await puppeteer.launch({ headless: 'new' })
  const page = await browser.newPage()
  await page.setViewport({ width: 1080, height: 1080 })

  for (const post of POSTS) {
    await page.goto(`http://localhost:${PORT}/${post.file}`, { waitUntil: 'networkidle0' })
    const outPath = path.join(OUT, post.out)
    await page.screenshot({ path: outPath, type: 'png', clip: { x: 0, y: 0, width: 1080, height: 1080 } })
    console.log(`✓ ${post.out}`)
  }

  await browser.close()
  server.close()
  console.log(`\nListo. 7 PNGs guardados en:\n${OUT}`)
})()
