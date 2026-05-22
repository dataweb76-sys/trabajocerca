// Genera icon-192.png e icon-512.png para la PWA
const sharp = require('sharp')
const path  = require('path')

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%"   stop-color="#1d4ed8"/>
      <stop offset="100%" stop-color="#7c3aed"/>
    </linearGradient>
    <linearGradient id="shine" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%"   stop-color="rgba(255,255,255,0.18)"/>
      <stop offset="100%" stop-color="rgba(255,255,255,0)"/>
    </linearGradient>
  </defs>

  <!-- Fondo redondeado -->
  <rect width="512" height="512" rx="112" fill="url(#bg)"/>
  <!-- Brillo sutil arriba -->
  <rect width="512" height="280" rx="112" fill="url(#shine)"/>

  <!-- Pin de ubicación: arco superior + cola -->
  <path d="M256,72
           A136,136 0 0 1 392,208
           L256,440
           L120,208
           A136,136 0 0 1 256,72 Z"
        fill="white" opacity="0.97"/>

  <!-- Círculo interior (color de fondo) -->
  <circle cx="256" cy="202" r="72" fill="#1d4ed8"/>

  <!-- Maletín / herramientas dentro del círculo -->
  <!-- Cuerpo del maletín -->
  <rect x="220" y="196" width="72" height="52" rx="7" fill="white"/>
  <!-- Manija del maletín -->
  <path d="M242,196 L242,184 Q242,178 256,178 Q270,178 270,184 L270,196"
        fill="none" stroke="white" stroke-width="8" stroke-linecap="round"/>
  <!-- Línea central del maletín -->
  <line x1="220" y1="222" x2="292" y2="222" stroke="#1d4ed8" stroke-width="5"/>
  <!-- Cierre -->
  <rect x="248" y="215" width="16" height="14" rx="4" fill="#1d4ed8"/>

  <!-- Puntito naranja (acento) -->
  <circle cx="256" cy="440" r="10" fill="#f97316" opacity="0.85"/>
</svg>`

async function generate(){
  const buf = Buffer.from(svg)

  await sharp(buf).resize(192, 192).png({ compressionLevel: 9 }).toFile(path.join(__dirname, 'icon-192.png'))
  console.log('✅ icon-192.png generado')

  await sharp(buf).resize(512, 512).png({ compressionLevel: 9 }).toFile(path.join(__dirname, 'icon-512.png'))
  console.log('✅ icon-512.png generado')
}

generate().catch(console.error)
