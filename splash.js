/* ══════════════════════════════════════════════════════════
   splash.js — Trabajos Cerca
   ① Logo limpio en TODAS las páginas
   ② Splash de bienvenida (solo en el home)
   ③ Modal de registro con 4 tipos
   ④ Guardar código de referido (?ref=UUID)
══════════════════════════════════════════════════════════ */

/* ── Capturar beforeinstallprompt LO ANTES POSIBLE ──────
   Este listener debe estar fuera de cualquier IIFE o DOMContentLoaded
   para no perder el evento si dispara antes de que el DOM esté listo.
─────────────────────────────────────────────────────────── */
window._pwaInstallEvt = null
window.addEventListener('beforeinstallprompt', function(e) {
  e.preventDefault()
  window._pwaInstallEvt = e
  // Notificar al botón si ya fue creado
  var btn = document.getElementById('tnav-pwa-btn')
  if(btn && btn.dataset.modo === 'instalar') return // ya visible
  if(localStorage.getItem('tc_app_instalada') !== '1') {
    if(typeof window._mostrarBtnInstalar === 'function') window._mostrarBtnInstalar()
  }
})

/* ─────────────────────────────────────────────────────────
   ④ REFERIDO — guardar código si viene en la URL
───────────────────────────────────────────────────────── */
;(function(){
  const ref = new URLSearchParams(location.search).get('ref')
  if(ref && ref.length > 20) localStorage.setItem('tc_ref', ref)
})()

/* ─────────────────────────────────────────────────────────
   ① LOGO  (corre en todas las páginas)
───────────────────────────────────────────────────────── */
;(function(){
  function initLogo(){
    const logoDiv = document.querySelector('.logo')
    if(!logoDiv) return
    logoDiv.innerHTML = `
      <a href="https://www.trabajoscerca.com.ar" style="
        display:flex; align-items:center; gap:10px; text-decoration:none;
      ">
        <img src="/icon-192.png" alt="TC"
          onerror="this.style.display='none'"
          style="
            height:36px; width:36px; border-radius:9px; flex-shrink:0;
            box-shadow: 0 2px 8px rgba(0,0,0,.28);
          ">
        <div style="display:flex; flex-direction:column; line-height:1.15;">
          <span class="logo-nombre" style="
            font-size:16px; font-weight:900; color:white;
            letter-spacing:-.025em; font-family:inherit;
          ">Trabajos Cerca</span>
          <span class="logo-sub" style="
            font-size:9.5px; font-weight:600; color:rgba(255,255,255,.62);
            letter-spacing:.14em; text-transform:uppercase; font-family:inherit;
          ">Tu oportunidad, cerca</span>
        </div>
      </a>
    `
  }
  if(document.readyState === 'loading')
    document.addEventListener('DOMContentLoaded', initLogo)
  else
    initLogo()
})()


/* ─────────────────────────────────────────────────────────
   ② SPLASH  (solo en la página de inicio)
───────────────────────────────────────────────────────── */
;(function(){
  /* Solo correr en el home */
  const path = location.pathname
  if(path !== '/' && !path.endsWith('/index.html')) return

  /* ══════════════════════════════════════════════════════════
     Trabajos Cerca — Splash de bienvenida
     ─ Primera visita: bienvenida + selector de provincia
     ─ Visitas siguientes (cada 24h): bienvenida rápida con provincia guardada
  ══════════════════════════════════════════════════════════ */

  const KEY_PROV   = 'tc_provincia'
  const KEY_SPLASH = 'tc_splash_ts'
  const provGuardada = localStorage.getItem(KEY_PROV)

  // Si ya eligió provincia → throttle de 24h
  if(provGuardada){
    const ultima = localStorage.getItem(KEY_SPLASH)
    if(ultima && Date.now() - parseInt(ultima) < 24 * 60 * 60 * 1000) return
  }
  localStorage.setItem(KEY_SPLASH, Date.now())

  const PROVINCIAS = [
    'Buenos Aires','CABA','Catamarca','Chaco','Chubut','Córdoba',
    'Corrientes','Entre Ríos','Formosa','Jujuy','La Pampa','La Rioja',
    'Mendoza','Misiones','Neuquén','Río Negro','Salta','San Juan',
    'San Luis','Santa Cruz','Santa Fe','Santiago del Estero',
    'Tierra del Fuego','Tucumán'
  ]

  /* ── CSS ── */
  const style = document.createElement('style')
  style.textContent = `
  #tc-splash {
    position: fixed; inset: 0; z-index: 99999;
    display: flex; align-items: center; justify-content: center;
    background: linear-gradient(160deg, #0f172a 0%, #1d4ed8 55%, #7c3aed 100%);
    padding: 20px; animation: tcFadeIn .5s ease;
    overflow-y: auto;
  }
  @keyframes tcFadeIn  { from { opacity:0; transform:translateY(12px) } to { opacity:1; transform:translateY(0) } }
  @keyframes tcFadeOut { from { opacity:1 } to { opacity:0 } }
  #tc-splash.cerrando { animation: tcFadeOut .38s ease forwards; pointer-events:none; }

  #tc-splash-inner {
    max-width: 500px; width: 100%; text-align: center;
    display: flex; flex-direction: column; align-items: center;
    padding: 10px 0 20px;
  }

  /* Logo + nombre */
  #tc-splash-logo {
    width: 80px; height: 80px; border-radius: 20px;
    box-shadow: 0 10px 40px rgba(0,0,0,.45);
    margin-bottom: 14px;
  }
  #tc-splash-nombre {
    font-size: clamp(24px, 7vw, 34px);
    font-weight: 900; color: #fff;
    margin: 0 0 4px; letter-spacing: -.02em;
  }
  #tc-splash-bienvenida {
    font-size: clamp(11px, 3vw, 13px);
    font-weight: 800; color: #93c5fd;
    letter-spacing: .18em; text-transform: uppercase;
    margin: 0 0 8px;
  }
  #tc-splash-tagline {
    font-size: clamp(13px, 3.8vw, 16px);
    color: rgba(255,255,255,.78);
    margin: 0 0 24px; line-height: 1.55;
    max-width: 380px;
  }
  #tc-splash-tagline strong { color: #93c5fd; }
  #tc-splash-slogan {
    display: inline-block;
    background: linear-gradient(135deg, #facc15, #f97316);
    -webkit-background-clip: text; -webkit-text-fill-color: transparent;
    background-clip: text;
    font-size: clamp(19px, 5.5vw, 26px);
    font-weight: 900; letter-spacing: -.02em;
    margin: 2px 0 20px; line-height: 1.2;
  }
  #tc-splash-badges {
    display: flex; gap: 8px; flex-wrap: wrap; justify-content: center;
    margin-bottom: 22px;
  }
  .tc-splash-badge {
    background: rgba(255,255,255,.13);
    border: 1px solid rgba(255,255,255,.22);
    border-radius: 99px; padding: 5px 14px;
    font-size: 12px; font-weight: 700; color: rgba(255,255,255,.9);
  }

  /* Divisor */
  .tc-divisor {
    width: 48px; height: 3px; border-radius: 4px;
    background: rgba(255,255,255,.25); margin: 0 0 20px;
  }

  /* Province picker */
  #tc-prov-label {
    font-size: 12px; font-weight: 800; color: rgba(255,255,255,.6);
    text-transform: uppercase; letter-spacing: .1em; margin: 0 0 10px;
  }
  #tc-prov-grid {
    display: flex; flex-wrap: wrap; gap: 7px; justify-content: center;
    max-height: 195px; overflow-y: auto; width: 100%;
    padding: 2px 4px 8px;
    scrollbar-width: thin; scrollbar-color: rgba(255,255,255,.2) transparent;
  }
  #tc-prov-grid::-webkit-scrollbar { width: 3px; }
  #tc-prov-grid::-webkit-scrollbar-thumb { background: rgba(255,255,255,.25); border-radius: 4px; }
  .tc-prov-btn {
    padding: 7px 15px; border-radius: 22px;
    border: 1.5px solid rgba(255,255,255,.28);
    background: rgba(255,255,255,.09);
    font-size: 13px; font-weight: 600; color: rgba(255,255,255,.9);
    cursor: pointer; transition: all .16s; font-family: inherit; user-select: none;
  }
  .tc-prov-btn:hover { background: rgba(255,255,255,.2); border-color: rgba(255,255,255,.6); }
  .tc-prov-btn.sel   { background: white; color: #1d4ed8; border-color: white; font-weight: 800; transform: scale(1.06); }

  /* Botón entrar */
  #tc-btn-entrar {
    margin-top: 18px;
    display: inline-flex; align-items: center; gap: 9px;
    background: white; color: #1d4ed8;
    border: none; border-radius: 14px;
    padding: 15px 42px; font-size: 16px; font-weight: 900;
    cursor: pointer; font-family: inherit;
    box-shadow: 0 6px 28px rgba(0,0,0,.3);
    transition: transform .15s, box-shadow .15s;
  }
  #tc-btn-entrar:hover { transform: translateY(-2px); box-shadow: 0 10px 32px rgba(0,0,0,.38); }
  #tc-btn-entrar .arr { font-size: 18px; transition: transform .2s; }
  #tc-btn-entrar:hover .arr { transform: translateX(4px); }

  #tc-splash-skip {
    display: inline-block; margin-top: 12px;
    font-size: 12px; color: rgba(255,255,255,.38);
    cursor: pointer; background: none; border: none;
    font-family: inherit; transition: color .15s; text-decoration: underline;
  }
  #tc-splash-skip:hover { color: rgba(255,255,255,.7); }

  /* Bienvenida de vuelta */
  #tc-splash-lugar {
    display: inline-flex; align-items: center; gap: 7px;
    background: rgba(255,255,255,.13); border: 1px solid rgba(255,255,255,.28);
    border-radius: 30px; padding: 7px 20px;
    font-size: 15px; font-weight: 700; color: white;
    margin: 6px 0 22px;
  }
  #tc-splash-bar-wrap {
    width: 100%; max-width: 300px; margin: 16px auto 0;
    background: rgba(255,255,255,.15); border-radius: 10px; height: 4px; overflow: hidden;
  }
  #tc-splash-bar { height: 100%; background: white; border-radius: 10px; width: 100%; transition: width 1s linear; }
  #tc-splash-timer { font-size: 12px; color: rgba(255,255,255,.45); margin-top: 8px; }

  /* Partículas */
  .tc-sp-dot { position: absolute; border-radius: 50%; background: rgba(255,255,255,.06); pointer-events: none; }
  `
  document.head.appendChild(style)

  const el = document.createElement('div')
  el.id = 'tc-splash'

  /* ════════════════════════════════════════
     MODO A: Primera vez → Bienvenida + Picker
  ════════════════════════════════════════ */
  if(!provGuardada){
    el.innerHTML = `
      <div class="tc-sp-dot" style="width:360px;height:360px;top:-140px;right:-110px;"></div>
      <div class="tc-sp-dot" style="width:250px;height:250px;bottom:-80px;left:-80px;"></div>
      <div id="tc-splash-inner">
        <img id="tc-splash-logo" src="/icon-192.png" alt="Trabajos Cerca" onerror="this.src='/logo.png'">
        <p id="tc-splash-bienvenida">✨ ¡Bienvenido/a a</p>
        <h1 id="tc-splash-nombre">Trabajos Cerca</h1>
        <div id="tc-splash-slogan">Tu próximo trabajo<br>está más cerca 🚀</div>
        <p id="tc-splash-tagline">
          Encontrá <strong>empleo, empleados, oficios</strong><br>
          o profesionales en tu ciudad — 100% gratis.
        </p>
        <div id="tc-splash-badges">
          <span class="tc-splash-badge">🔍 Buscar empleo</span>
          <span class="tc-splash-badge">🔧 Oficios</span>
          <span class="tc-splash-badge">🏢 Publicar puestos</span>
          <span class="tc-splash-badge">⚽ Prode Mundial</span>
        </div>
        <div class="tc-divisor"></div>
        <p id="tc-prov-label">📍 ¿En qué provincia estás?</p>
        <div id="tc-prov-grid"></div>
        <button id="tc-btn-entrar" onclick="window._tcSplashCerrar()">
          ¡Entrar gratis! <span class="arr">→</span>
        </button>
        <button id="tc-splash-skip" onclick="window._tcSplashCerrar()">Omitir selección de provincia</button>
      </div>
    `
    document.body.appendChild(el)
    document.body.style.overflow = 'hidden'

    /* Render chips */
    const grid = document.getElementById('tc-prov-grid')
    PROVINCIAS.forEach(p => {
      const btn = document.createElement('button')
      btn.className = 'tc-prov-btn'
      btn.textContent = p
      btn.onclick = () => elegirProvincia(p, btn)
      grid.appendChild(btn)
    })

    function elegirProvincia(p, btn){
      document.querySelectorAll('.tc-prov-btn').forEach(b => b.classList.remove('sel'))
      btn.classList.add('sel')
      /* Guardar y propagar al hero y al strip de index */
      localStorage.setItem(KEY_PROV, p)
      const heroSpan = document.getElementById('hero-prov-txt')
      if(heroSpan) heroSpan.textContent = p
      document.querySelectorAll('.prov-chip').forEach(c =>
        c.classList.toggle('active', c.textContent === p)
      )
      const activeChip = document.querySelector('.prov-chip.active')
      if(activeChip) activeChip.scrollIntoView({ block:'nearest', inline:'center', behavior:'smooth' })
      /* Cerrar automáticamente tras 700ms para que vean la selección */
      setTimeout(() => window._tcSplashCerrar(), 700)
    }

  /* ════════════════════════════════════════
     MODO B: Visita siguiente → Bienvenida rápida
  ════════════════════════════════════════ */
  } else {
    el.innerHTML = `
      <div class="tc-sp-dot" style="width:360px;height:360px;top:-140px;right:-110px;"></div>
      <div class="tc-sp-dot" style="width:250px;height:250px;bottom:-80px;left:-80px;"></div>
      <div id="tc-splash-inner">
        <img id="tc-splash-logo" src="/icon-192.png" alt="Trabajos Cerca" onerror="this.src='/logo.png'">
        <p id="tc-splash-bienvenida">✨ ¡Bienvenido/a de vuelta a</p>
        <h1 id="tc-splash-nombre">Trabajos Cerca</h1>
        <div id="tc-splash-slogan">Tu próximo trabajo<br>está más cerca 🚀</div>
        <p id="tc-splash-tagline">
          Empleo, oficios y profesionales<br>
          <strong>en tu ciudad — 100% gratis.</strong>
        </p>
        <div id="tc-splash-lugar"><span>📍</span><span>${provGuardada}</span></div>
        <button id="tc-btn-entrar" onclick="window._tcSplashCerrar()">
          ¡Entrar! <span class="arr">→</span>
        </button>
        <div id="tc-splash-bar-wrap"><div id="tc-splash-bar"></div></div>
        <p id="tc-splash-timer">Cerrando en <span id="tc-splash-seg">6</span>s</p>
      </div>
    `
    document.body.appendChild(el)
    document.body.style.overflow = 'hidden'

    let seg = 6
    const bar   = document.getElementById('tc-splash-bar')
    const segEl = document.getElementById('tc-splash-seg')
    window._tcSplashInterval = setInterval(() => {
      seg--
      if(segEl) segEl.textContent = seg
      if(bar)   bar.style.width = (seg / 6 * 100) + '%'
      if(seg <= 0){ clearInterval(window._tcSplashInterval); window._tcSplashCerrar() }
    }, 1000)
    setTimeout(() => { if(bar) bar.style.width = '0%' }, 50)
  }

  /* ── Cerrar splash ── */
  window._tcSplashCerrar = function(){
    clearInterval(window._tcSplashInterval)
    el.classList.add('cerrando')
    setTimeout(() => { el.remove(); document.body.style.overflow = '' }, 400)
  }

})()


/* ─────────────────────────────────────────────────────────
   ③ MODAL DE REGISTRO  (corre en todas las páginas)
───────────────────────────────────────────────────────── */
;(function(){
  const css = document.createElement('style')
  css.textContent = `
  #tc-reg-overlay {
    display: none; position: fixed; inset: 0; z-index: 99990;
    background: rgba(15,23,42,.72); backdrop-filter: blur(5px);
    align-items: center; justify-content: center; padding: 16px;
    animation: tcRegIn .22s ease;
  }
  #tc-reg-overlay.activo { display: flex; }
  @keyframes tcRegIn { from { opacity:0 } to { opacity:1 } }
  #tc-reg-box {
    background: white; border-radius: 22px; width: 100%; max-width: 460px;
    overflow: hidden; box-shadow: 0 28px 70px rgba(0,0,0,.38);
    max-height: 92vh; overflow-y: auto;
    animation: tcRegSlide .28s cubic-bezier(.22,1,.36,1);
  }
  @keyframes tcRegSlide { from { transform:translateY(24px); opacity:0 } to { transform:translateY(0); opacity:1 } }
  .tc-reg-card {
    display: flex; align-items: center; gap: 16px;
    padding: 17px 20px; cursor: pointer; border: none;
    width: 100%; text-align: left; font-family: inherit;
    border-bottom: 1px solid #f1f5f9;
    background: white; transition: background .15s, transform .12s;
  }
  .tc-reg-card:last-of-type { border-bottom: none; }
  .tc-reg-card:hover { background: #f8fafc; }
  .tc-reg-card:active { transform: scale(.99); }
  .tc-reg-icon {
    width: 54px; height: 54px; border-radius: 16px; flex-shrink: 0;
    display: flex; align-items: center; justify-content: center; font-size: 26px;
  }
  `
  document.head.appendChild(css)

  function montarModal(){
    if(document.getElementById('tc-reg-overlay')) return
    const div = document.createElement('div')
    div.id = 'tc-reg-overlay'
    div.onclick = e => { if(e.target === div) div.classList.remove('activo') }
    div.innerHTML = `
      <div id="tc-reg-box">

        <!-- Header -->
        <div style="background:linear-gradient(135deg,#1d4ed8 0%,#7c3aed 100%);padding:24px 24px 20px;position:relative;overflow:hidden;">
          <div style="position:absolute;top:-40px;right:-40px;width:140px;height:140px;background:rgba(255,255,255,.07);border-radius:50%;"></div>
          <button onclick="document.getElementById('tc-reg-overlay').classList.remove('activo')"
            style="position:absolute;top:14px;right:16px;background:rgba(255,255,255,.18);border:none;
            color:white;width:32px;height:32px;border-radius:50%;font-size:20px;cursor:pointer;line-height:1;
            display:flex;align-items:center;justify-content:center;font-family:inherit;transition:background .15s;"
            onmouseover="this.style.background='rgba(255,255,255,.3)'"
            onmouseout="this.style.background='rgba(255,255,255,.18)'">×</button>
          <p style="margin:0 0 5px;font-size:11px;font-weight:800;color:rgba(255,255,255,.6);text-transform:uppercase;letter-spacing:.12em;">Unite gratis</p>
          <h2 style="margin:0 0 7px;font-size:21px;font-weight:900;color:white;line-height:1.2;">¿Cómo querés registrarte?</h2>
          <p style="margin:0;font-size:13px;color:rgba(255,255,255,.82);line-height:1.5;">
            En menos de 2 minutos ya estás activo y visible para miles de usuarios.
          </p>
        </div>

        <!-- Opción 1: Busco Empleo -->
        <button class="tc-reg-card" onclick="location.href='/registro.html?tipo=trabajador'">
          <div class="tc-reg-icon" style="background:#eff6ff;">
            <span>🔍</span>
          </div>
          <div style="flex:1;min-width:0;">
            <p style="margin:0 0 3px;font-size:15px;font-weight:800;color:#1e293b;">Busco Empleo</p>
            <p style="margin:0;font-size:12px;color:#64748b;line-height:1.4;">Cargá tu CV y que las empresas te encuentren a vos</p>
          </div>
          <i class="fa-solid fa-chevron-right" style="color:#cbd5e1;font-size:12px;flex-shrink:0;"></i>
        </button>

        <!-- Opción 2: Empleador -->
        <button class="tc-reg-card" onclick="location.href='/registro.html?tipo=empleador'">
          <div class="tc-reg-icon" style="background:#faf5ff;">
            <span>🏢</span>
          </div>
          <div style="flex:1;min-width:0;">
            <p style="margin:0 0 3px;font-size:15px;font-weight:800;color:#1e293b;">Soy Empleador</p>
            <p style="margin:0;font-size:12px;color:#64748b;line-height:1.4;">Publicá puestos y encontrá el candidato ideal rápido</p>
          </div>
          <i class="fa-solid fa-chevron-right" style="color:#cbd5e1;font-size:12px;flex-shrink:0;"></i>
        </button>

        <!-- Opción 3: Oficio -->
        <button class="tc-reg-card" onclick="location.href='/registro.html?tipo=profesional'">
          <div class="tc-reg-icon" style="background:#fff7ed;">
            <span>🔧</span>
          </div>
          <div style="flex:1;min-width:0;">
            <p style="margin:0 0 3px;font-size:15px;font-weight:800;color:#1e293b;">Ofrezco Oficios</p>
            <p style="margin:0;font-size:12px;color:#64748b;line-height:1.4;">Plomero, electricista, albañil y más — conseguí clientes</p>
          </div>
          <i class="fa-solid fa-chevron-right" style="color:#cbd5e1;font-size:12px;flex-shrink:0;"></i>
        </button>

        <!-- Opción 4: Profesional -->
        <button class="tc-reg-card" onclick="location.href='/registro.html'">
          <div class="tc-reg-icon" style="background:#f0fdf4;">
            <span>👔</span>
          </div>
          <div style="flex:1;min-width:0;">
            <p style="margin:0 0 3px;font-size:15px;font-weight:800;color:#1e293b;">Soy Profesional</p>
            <p style="margin:0;font-size:12px;color:#64748b;line-height:1.4;">Contador, diseñador, médico — expandí tu cartera de clientes</p>
          </div>
          <i class="fa-solid fa-chevron-right" style="color:#cbd5e1;font-size:12px;flex-shrink:0;"></i>
        </button>

        <!-- Footer -->
        <div style="padding:14px 20px;background:#f8fafc;border-top:1px solid #e2e8f0;text-align:center;">
          <p style="margin:0;font-size:13px;color:#64748b;">
            ¿Ya tenés cuenta? <a href="/login.html" style="color:#2563eb;font-weight:700;text-decoration:none;">Iniciá sesión →</a>
          </p>
        </div>

      </div>
    `
    document.body.appendChild(div)

    /* Cerrar con Escape */
    document.addEventListener('keydown', e => {
      if(e.key === 'Escape') div.classList.remove('activo')
    })
  }

  if(document.readyState === 'loading')
    document.addEventListener('DOMContentLoaded', montarModal)
  else
    montarModal()

  window._tcAbrirRegistro = function(){
    const overlay = document.getElementById('tc-reg-overlay')
    if(overlay) overlay.classList.add('activo')
  }
})()


/* ─────────────────────────────────────────────────────────
   ⑤ NAVBAR UNIFICADA  (corre en todas las páginas)
   Logo ← | Consultas (buscadores) centro | Inicio + Perfil → + ⚽
───────────────────────────────────────────────────────── */
;(function(){
  const SB_TOKEN_KEY = 'sb-iqeiszkoifxgygoqvbem-auth-token'
  const SB_URL = 'https://iqeiszkoifxgygoqvbem.supabase.co'
  const SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlxZWlzemtvaWZ4Z3lnb3F2YmVtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkyMTEzODIsImV4cCI6MjA5NDc4NzM4Mn0.qxt70TPbARPcMc8HhHx2A2QnfBvJLCrnrH4m36IcENs'

  function isLoggedIn(){
    try {
      const t = JSON.parse(localStorage.getItem(SB_TOKEN_KEY))?.access_token
      if(!t) return false
      const exp = JSON.parse(atob(t.split('.')[1])).exp
      return exp && Date.now() / 1000 < exp
    } catch(e){ return false }
  }

  function getUserId(){
    try {
      const t = JSON.parse(localStorage.getItem(SB_TOKEN_KEY))?.access_token
      if(!t) return null
      return JSON.parse(atob(t.split('.')[1])).sub || null
    } catch(e){ return null }
  }

  async function actualizarBadgeMsgs(uid){
    try {
      const tk = JSON.parse(localStorage.getItem(SB_TOKEN_KEY))?.access_token
      if(!tk) return
      const res = await fetch(
        `${SB_URL}/rest/v1/conversaciones?or=(usuario1_id.eq.${uid},usuario2_id.eq.${uid})&select=usuario1_id,no_leidos_u1,no_leidos_u2`,
        { headers: { apikey: SB_KEY, Authorization: `Bearer ${tk}` } }
      )
      if(!res.ok) return
      const convs = await res.json()
      let total = 0
      convs.forEach(c => { total += c.usuario1_id === uid ? (c.no_leidos_u1||0) : (c.no_leidos_u2||0) })
      const badge = document.getElementById('tnav-msgs-badge')
      if(badge){
        badge.textContent = total > 9 ? '9+' : String(total)
        badge.style.display = total > 0 ? 'inline-flex' : 'none'
      }
    } catch(e){}
  }

  function buildNav(){
    const topbar = document.querySelector('.topbar')
    if(!topbar) return

    // Quitar todo lo que no sea .logo
    Array.from(topbar.children).forEach(c => {
      if(!c.classList.contains('logo')) c.remove()
    })

    const loggedIn = isLoggedIn()
    const path     = location.pathname

    // ── Centro: links a todos los buscadores ──
    const center = document.createElement('div')
    center.className = 'tnav-center'
    center.innerHTML =
      `<a href="/buscador_oficios.html"${path.includes('buscador_oficios') ? ' class="activo"':''}>🔨 <span>Oficios</span></a>` +
      `<a href="/buscador_profesionales.html"${path.includes('buscador_profesionales') ? ' class="activo"':''}>🎓 <span>Profesionales</span></a>` +
      `<a href="/buscador_trabajos.html"${path.includes('buscador_trabajos') ? ' class="activo"':''}>📄 <span>CVs</span></a>` +
      `<a href="/buscador_emprendimientos.html"${path.includes('buscador_emprendimientos') ? ' class="activo"':''}>💡 <span>Emprendimientos</span></a>` +
      `<a href="/buscador_ofertas.html"${path.includes('buscador_ofertas') ? ' class="activo"':''}>🏢 <span>Ofertas</span></a>`

    // ── Derecha: Inicio | Consultas | Perfil | Mensajes | Salir | ⚽ ──
    const right = document.createElement('div')
    right.className = 'tnav-right'
    right.innerHTML =
      `<a href="/index.html"><i class="fa-solid fa-house"></i><span> Inicio</span></a>` +
      `<a href="/consultas_urgentes.html" id="tnav-cu-link" title="Consultas urgentes"
          style="position:relative;display:inline-flex;align-items:center;gap:5px;">
          <i class="fa-solid fa-bolt" style="color:#fbbf24;"></i><span> Urgentes</span>
          <span id="tnav-cu-badge" style="display:none;position:absolute;top:0px;right:-4px;background:#dc2626;color:white;font-size:9px;font-weight:800;min-width:14px;height:14px;border-radius:20px;padding:0 3px;align-items:center;justify-content:center;border:1.5px solid rgba(30,41,59,.3);line-height:1;pointer-events:none;"></span>
       </a>` +
      (loggedIn
        ? `<a href="/perfil.html" class="btn-perfil"><i class="fa-solid fa-user"></i><span> Perfil</span></a>`
        : '') +
      (loggedIn
        ? `<a href="/mensajes.html" id="tnav-msgs-link" title="Mensajes" style="position:relative;">
            <i class="fa-solid fa-comment-dots"></i><span> Mensajes</span>
            <span id="tnav-msgs-badge" style="display:none;position:absolute;top:1px;right:0px;background:#ef4444;color:white;font-size:9px;font-weight:800;min-width:14px;height:14px;border-radius:20px;padding:0 3px;align-items:center;justify-content:center;border:1.5px solid rgba(30,41,59,.3);line-height:1;pointer-events:none;"></span>
           </a>`
        : '') +
      (loggedIn
        ? `<button class="btn-salir" title="Cerrar sesión" onclick="(function(){Object.keys(localStorage).filter(function(k){return k.startsWith('sb-')}).forEach(function(k){localStorage.removeItem(k)});location.href='/index.html';})()" >
            <i class="fa-solid fa-right-from-bracket"></i><span> Salir</span>
           </button>`
        : '') +
      `<button class="btn-prode" title="Prode del Mundial 2026" onclick="(function(){` +
        `var p=document.getElementById('popupMundial');` +
        `if(p){p.style.display='flex';}else{location.href='/mundial.html';}` +
      `})()">⚽</button>`

    topbar.appendChild(center)
    topbar.appendChild(right)

    // ── Cargar cantidad de consultas urgentes activas ──
    ;(function(){
      var SB = 'https://iqeiszkoifxgygoqvbem.supabase.co'
      var KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlxZWlzemtvaWZ4Z3lnb3F2YmVtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkyMTEzODIsImV4cCI6MjA5NDc4NzM4Mn0.qxt70TPbARPcMc8HhHx2A2QnfBvJLCrnrH4m36IcENs'
      fetch(SB + '/rest/v1/consultas_urgentes?activo=eq.true&select=id', {
        headers: { 'apikey': KEY, 'Authorization': 'Bearer ' + KEY, 'Prefer': 'count=exact', 'Range': '0-0' }
      }).then(function(r){
        var cnt = parseInt(r.headers.get('content-range')?.split('/')[1] || '0', 10)
        var badge = document.getElementById('tnav-cu-badge')
        if(badge && cnt > 0){
          badge.textContent = cnt > 99 ? '99+' : String(cnt)
          badge.style.display = 'inline-flex'
        }
      }).catch(function(){})
    })()

    // ── Botón instalar / actualizar PWA ──
    ;(function(){
      var CLAVE_INSTALADA = 'tc_app_instalada'

      function crearBtnPWA(modo) {
        var existente = document.getElementById('tnav-pwa-btn')
        if(existente) existente.remove()

        var btn = document.createElement('button')
        btn.id = 'tnav-pwa-btn'
        btn.dataset.modo = modo
        btn.style.cssText =
          'display:inline-flex;align-items:center;gap:5px;padding:5px 11px;border:none;border-radius:8px;' +
          'font-size:12px;font-weight:800;cursor:pointer;font-family:inherit;white-space:nowrap;' +
          (modo === 'instalar'
            ? 'background:linear-gradient(135deg,#22c55e,#16a34a);color:white;box-shadow:0 2px 8px rgba(34,197,94,.4);'
            : 'background:linear-gradient(135deg,#f97316,#ea580c);color:white;box-shadow:0 2px 8px rgba(249,115,22,.4);')

        btn.innerHTML = modo === 'instalar'
          ? '<i class="fa-solid fa-mobile-screen-button"></i><span> Instalar app</span>'
          : '<i class="fa-solid fa-rotate"></i><span> Actualizar app</span>'

        btn.onclick = function() {
          if(modo === 'instalar' && window._pwaInstallEvt) {
            window._pwaInstallEvt.prompt()
            window._pwaInstallEvt.userChoice.then(function(r) {
              if(r.outcome === 'accepted') {
                localStorage.setItem(CLAVE_INSTALADA, '1')
                btn.remove()
              }
            })
          } else if(modo === 'actualizar') {
            location.reload(true)
          }
        }

        var btnProde = right.querySelector('.btn-prode')
        if(btnProde) right.insertBefore(btn, btnProde)
        else right.appendChild(btn)
      }

      // Exponer función para que el listener global la llame
      window._mostrarBtnInstalar = function() { crearBtnPWA('instalar') }

      // Si el evento ya fue capturado antes de que buildNav() corriera
      if(window._pwaInstallEvt && localStorage.getItem(CLAVE_INSTALADA) !== '1') {
        crearBtnPWA('instalar')
      }

      // Después de instalar → ocultar
      window.addEventListener('appinstalled', function() {
        localStorage.setItem(CLAVE_INSTALADA, '1')
        var btn = document.getElementById('tnav-pwa-btn')
        if(btn) btn.remove()
      })

      // SW_UPDATED → mostrar "Actualizar app"
      navigator.serviceWorker?.addEventListener('message', function(e) {
        if(e.data?.type === 'SW_UPDATED') crearBtnPWA('actualizar')
      })
    })()

    // Polling badge mensajes no leídos
    if(loggedIn){
      const uid = getUserId()
      if(uid){
        actualizarBadgeMsgs(uid)
        setInterval(() => actualizarBadgeMsgs(uid), 30000)
      }
    }
  }

  if(document.readyState === 'loading')
    document.addEventListener('DOMContentLoaded', buildNav)
  else
    buildNav()
})()
